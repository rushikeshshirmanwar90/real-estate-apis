import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Staff } from "@/lib/models/users/Staff";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { requireValidClient } from "@/lib/utils/client-validation";
import bcrypt from "bcrypt";
import { isStrongPassword } from "@/lib/utils/validation";
import { checkValidClient } from "@/lib/auth";

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export const GET = async (req: NextRequest) => {
  // Bearer token authentication
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
    const id = searchParams.get("id");
    const email = searchParams.get("email");
    const clientId = searchParams.get("clientId");

    console.log('🔍 Staff API (users) called with:', { id, email, clientId });

    // ✅ For email-based queries (login flow), clientId is optional
    // ✅ For other operations, clientId is required
    if (!email && !clientId) {
      console.log('❌ No clientId provided for non-email query');
      return errorResponse("Client ID is required", 400);
    }

    // Validate clientId format if provided
    if (clientId && !Types.ObjectId.isValid(clientId)) {
      console.log('❌ Invalid clientId format:', clientId);
      return errorResponse("Invalid client ID format", 400);
    }

    // ✅ Validate client exists before fetching staff (only if clientId is provided)
    if (clientId) {
      try {
        await requireValidClient(clientId);
        console.log('✅ Client validation passed');
      } catch (clientError) {
        console.log('❌ Client validation failed:', clientError);
        if (clientError instanceof Error) {
          return errorResponse(clientError.message, 404);
        }
        return errorResponse("Client validation failed", 404);
      }
    }

    // Get specific staff by ID
    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid staff ID format", 400);
      }

      if (!clientId) {
        return errorResponse("Client ID is required when fetching by ID", 400);
      }

      // ✅ Filter by both ID and clients array (staff can belong to multiple clients)
      const staffData = await Staff.findOne({ 
        _id: id, 
        "clients.clientId": clientId // MongoDB will match if clientId is in the clients array
      });
      
      if (!staffData) {
        return errorResponse("Staff member not found", 404);
      }

      // Populate assignedProjects from the staff document itself
      const staffObj = staffData.toObject();
      
      // The assignedProjects field now contains the actual project assignments
      // No need to query Projects collection anymore
      
      return successResponse(staffObj, "Staff member retrieved successfully");
    }

    // Get specific staff by email
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return errorResponse("Invalid email format", 400);
      }

      // ✅ For login flow: Find by email only (email is unique across all staff)
      // ✅ For other operations: Filter by both email and clients array
      const query: any = { email: email };
      if (clientId) {
        query["clients.clientId"] = clientId; // MongoDB will match if clientId is in the clients array
      }
      
      const staffData = await Staff.findOne(query);
      
      if (!staffData) {
        return errorResponse("Staff member not found with this email", 404);
      }

      // Populate assignedProjects for this staff member
      // Populate assignedProjects from the staff document itself
      const staffObj = staffData.toObject();
      
      // The assignedProjects field now contains the actual project assignments
      // Filter by clientId if provided
      if (clientId && staffObj.assignedProjects) {
        staffObj.assignedProjects = staffObj.assignedProjects.filter(
          (project: any) => project.clientId.toString() === clientId
        );
      }
      
      return successResponse(staffObj, "Staff member retrieved successfully");
    }

    // ✅ Get all staff members filtered by clientId
    if (!clientId) {
      return errorResponse("Client ID is required when fetching all staff", 400);
    }
    
    console.log('🔍 Fetching all staff for clientId:', clientId);
    // Find staff where clientId is in their clients array
    const staffData = await Staff.find({ "clients.clientId": clientId }).sort({ createdAt: -1 });
    console.log('📊 Found staff count:', staffData.length);

    // Use assignedProjects from the staff documents themselves
    const staffWithProjects = staffData.map((staff) => {
      const staffObj = staff.toObject();
      
      // Filter assignedProjects by clientId if they exist
      if (staffObj.assignedProjects && clientId) {
        staffObj.assignedProjects = staffObj.assignedProjects.filter(
          (project: any) => project.clientId.toString() === clientId
        );
      }
      
      return staffObj;
    });

    console.log('✅ Returning staff data:', staffWithProjects.length, 'items');
    return successResponse(
      staffWithProjects,
      `Retrieved ${staffWithProjects.length} staff member(s) successfully`
    );
  } catch (error: unknown) {
    console.error("GET /staff error:", error);
    return errorResponse("Failed to fetch staff data", 500, error);
  }
};

export const POST = async (req: NextRequest) => {
  // Bearer token authentication
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
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Handle staff assignment action
    if (action === "assign" && data.staffId && data.projectId) {
      if (!isValidObjectId(data.staffId)) {
        return errorResponse("Invalid staff ID format", 400);
      }

      if (!isValidObjectId(data.projectId)) {
        return errorResponse("Invalid project ID format", 400);
      }

      // Find the project with client information
      const project = await Projects.findById(data.projectId).populate('clientId', 'name');
      if (!project) {
        return errorResponse("Project not found", 404);
      }

      // Find the staff member
      const staff = await Staff.findById(data.staffId);
      if (!staff) {
        return errorResponse("Staff member not found", 404);
      }

      // Use the utility function to assign staff to project
      const { assignStaffToProject } = await import("@/lib/utils/staffProjectUtils");
      
      try {
        await assignStaffToProject(
          data.staffId,
          data.projectId,
          project.name,
          project.clientId._id.toString(),
          project.clientId.name
        );

        // Log the staff assignment activity
        try {
          const activityPayload = {
            user: {
              userId: data.user?.userId || 'system',
              fullName: data.user?.fullName || 'System',
              email: data.user?.email || 'system@admin.com',
              userType: data.user?.userType || 'admin', // Default to admin for backend operations
            },
            clientId: project.clientId._id || 'unknown',
            projectId: data.projectId,
            projectName: project.name || 'Unknown Project',
            activityType: 'staff_assigned',
            category: 'staff',
            action: 'assign',
            description: `Assigned ${staff.firstName} ${staff.lastName} to project "${project.name}"`,
            message: data.message || 'Staff assigned to project via API',
            date: new Date().toISOString(),
            metadata: {
              staffName: `${staff.firstName} ${staff.lastName}`,
              staffId: staff._id.toString(),
            },
          };

          // Import axios for activity logging
          const axios = require('axios');
          const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
          
          await axios.post(`${domain}/api/activity`, activityPayload);
          console.log(`✅ Staff assignment activity logged for ${staff.firstName} ${staff.lastName}`);
        } catch (activityError) {
          console.error('❌ Error logging staff assignment activity:', activityError);
          // Don't fail the operation if activity logging fails
        }

        return successResponse(
          {
            staffId: data.staffId,
            projectId: data.projectId,
            staffName: `${staff.firstName} ${staff.lastName}`,
            projectName: project.name,
            clientName: project.clientId.name,
            assignedAt: new Date().toISOString()
          },
          "Staff member assigned to project successfully",
          201
        );
      } catch (assignmentError: any) {
        return errorResponse(assignmentError.message || "Failed to assign staff to project", 500);
      }
    }

    // Handle regular staff creation
    if (!data.email) {
      return errorResponse("Email is required", 400);
    }

    // ✅ Support both single clientId and multiple clients
    // Allow empty clients array for self-registration (admin will assign later)
    const clients = data.clients || [];
    
    // Validate all clients if provided
    if (clients.length > 0) {
      for (const client of clients) {
        if (!client.clientId || !Types.ObjectId.isValid(client.clientId)) {
          return errorResponse(`Invalid client ID format: ${client.clientId}`, 400);
        }
        
        if (!client.clientName || typeof client.clientName !== 'string') {
          return errorResponse(`Client name is required for client ID: ${client.clientId}`, 400);
        }
        
        // ✅ Validate each client exists
        try {
          await requireValidClient(client.clientId);
        } catch (clientError) {
          if (clientError instanceof Error) {
            return errorResponse(clientError.message, 404);
          }
          return errorResponse("Client validation failed", 404);
        }
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return errorResponse("Invalid email format", 400);
    }

    // ✅ Check if staff already exists with this email
    const existingStaff = await Staff.findOne({ 
      email: data.email
    });
    if (existingStaff) {
      return errorResponse("Staff member already exists with this email", 409);
    }

    // Check if login user already exists
    const existingLoginUser = await LoginUser.findOne({ email: data.email });
    if (existingLoginUser) {
      return errorResponse("User already exists with this email", 409);
    }

    const { password, clientId, ...staffData } = data;
    console.log('🔍 Password debugging:');
    console.log('  - Password provided:', !!password);
    console.log('  - Password length:', password?.length || 0);
    console.log('  - Password type:', typeof password);
    console.log('  - Raw data keys:', Object.keys(data));
    console.log('  - Clients array:', clients);

    // Validate password if provided
    if (password && !isStrongPassword(password)) {
      console.log('❌ Password validation failed');
      return errorResponse(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)",
        400
      );
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password && password.trim()) {
      const SALT_ROUNDS = 10;
      hashedPassword = await bcrypt.hash(password.trim(), SALT_ROUNDS);
      console.log('✅ Password hashed successfully');
      console.log('  - Hashed password length:', hashedPassword.length);
    } else {
      console.log('❌ No password provided or password is empty');
    }

    // Create new staff member with clients array and password
    const staffPayload = { 
      ...staffData, 
      clients,
      ...(hashedPassword && { password: hashedPassword })
    };
    
    console.log('📦 Staff payload keys:', Object.keys(staffPayload));
    console.log('📦 Staff payload has password:', 'password' in staffPayload);
    console.log('📦 Staff payload clients:', staffPayload.clients);
    
    const newStaff = new Staff(staffPayload);
    const savedStaff = await newStaff.save();

    console.log('✅ Staff saved with keys:', Object.keys(savedStaff.toObject()));
    console.log('✅ Saved staff has password:', 'password' in savedStaff.toObject());
    console.log('✅ Saved staff clients:', savedStaff.clients);

    // Create login user entry with password
    const loginPayload = {
      email: data.email,
      userType: "staff",
      ...(hashedPassword && { password: hashedPassword })
    };
    
    console.log('📦 LoginUser payload keys:', Object.keys(loginPayload));
    console.log('📦 LoginUser payload has password:', 'password' in loginPayload);
    
    const newLoginUser = new LoginUser(loginPayload);
    await newLoginUser.save();

    console.log('✅ LoginUser saved successfully');

    return successResponse(
      savedStaff,
      "Staff member created successfully",
      201
    );
  } catch (error: unknown) {
    console.error("POST /staff error:", error);

    // Handle mongoose validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create staff member", 500, error);
  }
};

export const PUT = async (req: NextRequest) => {
  // Bearer token authentication
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
    const id = searchParams.get("id");
    const clientId = searchParams.get("clientId");

    if (!id) {
      return errorResponse("Staff ID is required for update", 400);
    }

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid staff ID format", 400);
    }

    if (!Types.ObjectId.isValid(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // ✅ Validate client exists before updating staff
    try {
      await requireValidClient(clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    const data = await req.json();

    // Remove sensitive fields that shouldn't be updated directly
    const { password, ...updateData } = data;
    console.log(password);

    // Validate email if provided
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return errorResponse("Invalid email format", 400);
      }

      // ✅ Check if email is already used by another staff member
      const existingStaff = await Staff.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });
      if (existingStaff) {
        return errorResponse(
          "Email already exists for another staff member",
          409
        );
      }
    }

    // Get old email before update if email is being changed
    let oldEmail: string | undefined;
    if (updateData.email) {
      const oldStaff = await Staff.findById(id).select("email").lean();
      if (oldStaff && !Array.isArray(oldStaff)) {
        oldEmail = (oldStaff as { email?: string }).email;
      }
    }

    // ✅ Find and update the staff member (filtered by both ID and clients array)
    const updatedStaff = await Staff.findOneAndUpdate(
      { _id: id, "clients.clientId": clientId }, // Check if clientId is in clients array
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return errorResponse("Staff member not found", 404);
    }

    // Update email in LoginUser if email was changed (LoginUser is keyed by email, not staffId)
    if (updateData.email && oldEmail) {
      await LoginUser.findOneAndUpdate(
        { email: oldEmail },
        { email: updateData.email }
      );
    }

    return successResponse(updatedStaff, "Staff member updated successfully");
  } catch (error: unknown) {
    console.error("PUT /staff error:", error);

    // Handle mongoose validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update staff member", 500, error);
  }
};

export const DELETE = async (req: NextRequest) => {
  // Bearer token authentication
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
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");

    if (!id) {
      return errorResponse("Staff ID is required for deletion", 400);
    }

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid staff ID format", 400);
    }

    if (!Types.ObjectId.isValid(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // ✅ Validate client exists before deleting staff
    try {
      await requireValidClient(clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    // Handle staff assignment removal action
    if (action === "remove_assign" && projectId) {
      if (!isValidObjectId(projectId)) {
        return errorResponse("Invalid project ID format", 400);
      }

      // ✅ Find the project and ensure it belongs to the same client
      const project = await Projects.findOne({ 
        _id: projectId, 
        clientId: clientId 
      });
      if (!project) {
        return errorResponse("Project not found", 404);
      }

      // ✅ Find the staff member and ensure it belongs to the client
      const staff = await Staff.findOne({ 
        _id: id, 
        "clients.clientId": clientId // Check if clientId is in clients array
      });
      if (!staff) {
        return errorResponse("Staff member not found", 404);
      }

      // Remove staff from project's assignedStaff array using utility function
      const { removeStaffFromProject } = await import("@/lib/utils/staffProjectUtils");
      
      try {
        await removeStaffFromProject(id, projectId);

        // Log the staff removal activity
        try {
          const activityPayload = {
            user: {
              userId: 'system',
              fullName: 'System',
              email: 'system@admin.com',
              userType: 'admin', // System operations are admin-level
            },
            clientId: project.clientId || 'unknown',
            projectId: projectId,
            projectName: project.name || project.projectName || 'Unknown Project',
            activityType: 'staff_unassigned',
            category: 'staff',
            action: 'unassign',
            description: `Removed ${staff.firstName} ${staff.lastName} from project "${project.name || project.projectName}"`,
            message: 'Staff removed from project via API',
            date: new Date().toISOString(),
            metadata: {
              staffName: `${staff.firstName} ${staff.lastName}`,
              staffId: staff._id.toString(),
            },
          };

          // Import axios for activity logging
          const axios = require('axios');
          const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
          
          await axios.post(`${domain}/api/activity`, activityPayload);
          console.log(`✅ Staff removal activity logged for ${staff.firstName} ${staff.lastName}`);
        } catch (activityError) {
          console.error('❌ Error logging staff removal activity:', activityError);
          // Don't fail the operation if activity logging fails
        }

        return successResponse(
          {
            staffId: id,
            projectId: projectId,
            staffName: `${staff.firstName} ${staff.lastName}`,
            projectName: project.name || project.projectName,
            removedAt: new Date().toISOString()
          },
          "Staff member removed from project successfully"
        );
      } catch (removalError: any) {
        return errorResponse(removalError.message || "Failed to remove staff from project", 500);
      }
    }

    // Handle regular staff deletion
    // ✅ Find the staff member first and ensure it belongs to the client
    const staffToDelete = await Staff.findOne({ 
      _id: id, 
      "clients.clientId": clientId // Check if clientId is in clients array
    });
    if (!staffToDelete) {
      return errorResponse("Staff member not found", 404);
    }

    // Delete the staff member
    const deletedStaff = await Staff.findOneAndDelete({ 
      _id: id, 
      "clients.clientId": clientId 
    });

    // Delete the corresponding login user entry
    await LoginUser.findOneAndDelete({
      $or: [{ email: staffToDelete.email }, { staffId: id }],
    });

    return successResponse(deletedStaff, "Staff member deleted successfully");
  } catch (error: unknown) {
    console.error("DELETE /staff error:", error);
    return errorResponse("Failed to delete staff member", 500, error);
  }
};
