import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { checkValidClient } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { assignStaffToProject, removeStaffFromProject } from "@/lib/utils/staffProjectUtils";
import { 
  safeRedisDelCache,
  safeRedisKeysCache 
} from "@/lib/utils/redis-helpers";
import { Types, Model, Document } from "mongoose";

// Type definitions for the models
interface ContractorDocument extends Document {
  _id: any;
  projectId: any;
  sectionId?: string;
  staffId: any;
  contractType: string;
  paymentSchedule: string;
  totalAmount: number;
  usedAmount: number;
  payments: Array<{
    amount: number;
    paymentDate: Date;
    paymentType: string;
    notes?: string;
  }>;
  totalPaid: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StaffDocument extends Document {
  _id: any;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  clients: Array<{
    clientId: string;
    clientName: string;
    assignedAt?: Date;
    isContractor?: boolean;
  }>;
  assignedProjects: Array<any>;
}

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

// GET - Retrieve contractors for a project, optionally filtered by staffId
export const GET = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const staffId = searchParams.get("staffId");

    if (!projectId) {
      return errorResponse("Project ID is required", 400);
    }

    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    let query: any = { projectId };
    if (staffId) {
      if (!isValidObjectId(staffId)) {
        return errorResponse("Invalid staff ID format", 400);
      }
      query.staffId = staffId;
    }

    // Import Contractor model dynamically
    const contractorModule = await import("@/lib/models/Xsite/Contractor");
    const ContractorModel = contractorModule.Contractor as Model<ContractorDocument>;

    // Find and populate staff details
    const contractors = await ContractorModel.find(query)
      .populate("staffId", "firstName lastName email phoneNumber")
      .sort({ createdAt: -1 });

    if (staffId && contractors.length > 0) {
      const allContracts = searchParams.get("all") === "true";
      if (allContracts) {
        return successResponse(contractors, "All contractor details retrieved successfully");
      }
      // If requesting a specific staff member's contractor details, return the first matching contract
      return successResponse(contractors[0], "Contractor details retrieved successfully");
    }

    return successResponse(contractors, "Contractors list retrieved successfully");
  } catch (error: unknown) {
    console.error("GET /api/contractor error:", error);
    return errorResponse("Failed to fetch contractors", 500, error);
  }
};

// POST - Assign a staff member as a contractor for a project
export const POST = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    const data = await req.json();
    const { projectId, sectionId, staffId, contractType, totalAmount, paymentSchedule } = data;

    // Validate fields
    if (!projectId || !staffId || !contractType || totalAmount === undefined) {
      return errorResponse("Project ID, staff ID, contract type, and total amount are required", 400);
    }

    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    if (!isValidObjectId(staffId)) {
      return errorResponse("Invalid staff ID format", 400);
    }

    // Verify project exists and fetch clientId
    const project = await Projects.findById(projectId).populate("clientId", "name");
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    // Import Staff model dynamically
    const staffModule = await import("@/lib/models/users/Staff");
    const StaffModel = staffModule.Staff as Model<StaffDocument>;

    // Verify staff member exists
    const staff = await StaffModel.findById(staffId);
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    const clientIdStr = project.clientId._id.toString();

    // 1. Automatically assign staff to the project if not already assigned
    const isProjectAssigned = staff.assignedProjects.some(
      (p: any) => p.projectId.toString() === projectId
    );

    if (!isProjectAssigned) {
      console.log(`📡 Auto-assigning staff ${staffId} to project ${projectId}...`);
      await assignStaffToProject(
        staffId,
        projectId,
        project.name,
        clientIdStr,
        project.clientId.name || "Client"
      );
      // Reload staff to get updated assignedProjects
      const updatedStaff = await StaffModel.findById(staffId);
      if (updatedStaff) {
        Object.assign(staff, updatedStaff);
      }
    }

    // 2. Set isContractor: true on the clients array matching clientIdStr
    const clientIndex = staff.clients.findIndex(
      (c: any) => c.clientId.toString() === clientIdStr
    );

    if (clientIndex !== -1) {
      staff.clients[clientIndex].isContractor = true;
    } else {
      staff.clients.push({
        clientId: clientIdStr,
        clientName: project.clientId.name || "Client",
        isContractor: true,
      });
    }

    // Ensure staff markModified is triggered for nested arrays if mongoose doesn't detect the change
    staff.markModified("clients");
    await staff.save();
    console.log(`✅ Set isContractor: true for staff ${staff._id} under client ${clientIdStr}`);

    // Import Contractor model dynamically
    const contractorModule = await import("@/lib/models/Xsite/Contractor");
    const ContractorModel = contractorModule.Contractor as Model<ContractorDocument>;

    // 3. Create/Save Contractor document
    // If there's an existing contractor for this projectId, staffId and contractType, update it
    let contractor = await ContractorModel.findOne({ projectId, staffId, contractType });

    if (contractor) {
      contractor.totalAmount = totalAmount;
      if (sectionId) contractor.sectionId = sectionId;
      if (paymentSchedule) contractor.paymentSchedule = paymentSchedule;
      await contractor.save();
      console.log(`✅ Updated existing Contractor record ${contractor._id}`);
    } else {
      contractor = new ContractorModel({
        projectId,
        sectionId,
        staffId,
        contractType,
        totalAmount,
        paymentSchedule: paymentSchedule || 'weekly',
        usedAmount: 0,
      });
      await contractor.save();
      console.log(`✅ Created new Contractor record ${contractor._id}`);
    }

    // 4. Invalidate Cache
    const keys = await safeRedisKeysCache("staff:*");
    if (keys.length > 0) {
      await safeRedisDelCache(...keys);
    }
    // Also invalidate project details cache to ensure new contractor updates are loaded
    await safeRedisDelCache(`project:${projectId}`);

    return successResponse(
      contractor,
      "Contractor assigned successfully",
      201
    );
  } catch (error: unknown) {
    console.error("POST /api/contractor error:", error);
    return errorResponse("Failed to assign contractor", 500, error);
  }
};

// PATCH - Record payouts or update contractor status
export const PATCH = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    const data = await req.json();
    const { contractorId, action, amount, paymentType, notes, paymentDate, status } = data;

    if (!contractorId) {
      return errorResponse("Contractor ID is required", 400);
    }

    if (!isValidObjectId(contractorId)) {
      return errorResponse("Invalid contractor ID format", 400);
    }

    // Import Contractor model dynamically
    const contractorModule = await import("@/lib/models/Xsite/Contractor");
    const ContractorModel = contractorModule.Contractor as Model<ContractorDocument>;

    const contractor = await ContractorModel.findById(contractorId);
    if (!contractor) {
      return errorResponse("Contractor not found", 404);
    }

    if (action === "add_payment") {
      if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
        return errorResponse("Valid payment amount is required", 400);
      }
      if (!paymentType) {
        return errorResponse("Payment type is required", 400);
      }

      // Initialize payments array if not present
      if (!contractor.payments) {
        contractor.payments = [];
      }

      // Push new payment
      contractor.payments.push({
        amount: Number(amount),
        paymentType,
        notes: notes || "",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      });

      // Recalculate totalPaid
      contractor.totalPaid = contractor.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // If it is a final payment, automatically complete the contractor
      if (paymentType === "final") {
        contractor.status = "completed";
      }

      contractor.markModified("payments");
      await contractor.save();
      console.log(`✅ Recorded payment of ₹${amount} for contractor ${contractor._id}. Total Paid: ₹${contractor.totalPaid}`);

    } else if (action === "update_status") {
      if (!status || !["active", "completed"].includes(status)) {
        return errorResponse("Valid status ('active' or 'completed') is required", 400);
      }

      contractor.status = status;
      await contractor.save();
      console.log(`✅ Updated status of contractor ${contractor._id} to ${status}`);

    } else if (action === "edit_contractor") {
      const { totalAmount, contractType, paymentSchedule } = data;
      if (totalAmount !== undefined) {
        if (isNaN(Number(totalAmount)) || Number(totalAmount) < 0) {
          return errorResponse("Valid budget amount is required", 400);
        }
        contractor.totalAmount = Number(totalAmount);
      }
      if (contractType) {
        contractor.contractType = contractType;
      }
      if (paymentSchedule && ["daily", "weekly", "monthly"].includes(paymentSchedule)) {
        contractor.paymentSchedule = paymentSchedule;
      }
      await contractor.save();
      console.log(`✅ Edited contractor ${contractor._id} budget to ₹${totalAmount}`);

    } else {
      return errorResponse("Valid action ('add_payment', 'update_status', or 'edit_contractor') is required", 400);
    }

    // Invalidate Cache
    const keys = await safeRedisKeysCache("staff:*");
    if (keys.length > 0) {
      await safeRedisDelCache(...keys);
    }
    await safeRedisDelCache(`project:${contractor.projectId.toString()}`);

    return successResponse(
      contractor,
      action === "add_payment" ? "Payment recorded successfully" : "Contractor updated successfully"
    );
  } catch (error: unknown) {
    console.error("PATCH /api/contractor error:", error);
    return errorResponse("Failed to update contractor", 500, error);
  }
};

// DELETE - Remove contractor budget allocation and reset staff flag if necessary
export const DELETE = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get("contractorId");

    if (!contractorId || !isValidObjectId(contractorId)) {
      return errorResponse("Valid contractor ID is required", 400);
    }

    // Import Contractor model dynamically
    const contractorModule = await import("@/lib/models/Xsite/Contractor");
    const ContractorModel = contractorModule.Contractor as Model<ContractorDocument>;

    const contractor = await ContractorModel.findById(contractorId);
    if (!contractor) {
      return errorResponse("Contractor not found", 404);
    }

    const projectId = contractor.projectId.toString();
    const staffId = contractor.staffId.toString();

    // Delete contractor
    await ContractorModel.findByIdAndDelete(contractorId);
    console.log(`❌ Deleted Contractor record ${contractorId}`);

    // Automatically remove staff from project assignment when contractor record is deleted
    try {
      await removeStaffFromProject(staffId, projectId);
      console.log(`✅ Unassigned staff ${staffId} from project ${projectId} upon contractor deletion.`);
    } catch (unassignError) {
      console.error(`⚠️ Failed to unassign staff ${staffId} from project ${projectId}:`, unassignError);
    }

    // Check if this staff member has any remaining contracts for this client/project
    const projectModule = await import("@/lib/models/Project");
    const ProjectModel = projectModule.Projects;
    const project = await ProjectModel.findById(projectId);
    
    if (project) {
      const clientIdStr = project.clientId.toString();
      
      // Get all projects for this client
      const clientProjects = await ProjectModel.find({ clientId: clientIdStr }).select("_id");
      const clientProjectIds = clientProjects.map((p: any) => p._id);

      const remainingContractsCount = await ContractorModel.countDocuments({
        projectId: { $in: clientProjectIds },
        staffId
      });

      if (remainingContractsCount === 0) {
        const staffModule = await import("@/lib/models/users/Staff");
        const StaffModel = staffModule.Staff as Model<StaffDocument>;
        const staff = await StaffModel.findById(staffId);
        if (staff) {
          const clientIndex = staff.clients.findIndex(
            (c: any) => c.clientId.toString() === clientIdStr
          );
          if (clientIndex !== -1) {
            staff.clients[clientIndex].isContractor = false;
            staff.markModified("clients");
            await staff.save();
            console.log(`✅ Set isContractor: false for staff ${staffId} under client ${clientIdStr}`);
          }
        }
      }
    }

    // Invalidate Cache
    const keys = await safeRedisKeysCache("staff:*");
    if (keys.length > 0) {
      await safeRedisDelCache(...keys);
    }
    await safeRedisDelCache(`project:${projectId}`);

    return successResponse(null, "Contractor deleted successfully");
  } catch (error: unknown) {
    console.error("DELETE /api/contractor error:", error);
    return errorResponse("Failed to delete contractor", 500, error);
  }
};


