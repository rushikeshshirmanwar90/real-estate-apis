import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Staff } from "@/lib/models/users/Staff";
import { Projects } from "@/lib/models/Project";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { requireValidClient } from "@/lib/utils/client-validation";

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export const GET = async (req: NextRequest) => {
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

      // ✅ Filter by both ID and clientIds array (staff can belong to multiple clients)
      const staffData = await Staff.findOne({ 
        _id: id, 
        clientIds: clientId // MongoDB will match if clientId is in the array
      });
      
      if (!staffData) {
        return errorResponse("Staff member not found", 404);
      }

      // Populate assignedProjects for this staff member
      try {
        const assignedProjects = await Projects.find(
          {
            "assignedStaff._id": staffData._id.toString(),
            clientId: clientId // ✅ Also filter projects by clientId
          },
          { name: 1 } // Only get project names
        );

        const projectNames = assignedProjects.map(project => project.name);
        const staffObj = staffData.toObject();
        staffObj.assignedProjects = projectNames;

        return successResponse(staffObj, "Staff member retrieved successfully");
      } catch (error) {
        console.error(`Error fetching projects for staff ${id}:`, error);
        // Return staff with empty assignedProjects on error
        const staffObj = staffData.toObject();
        staffObj.assignedProjects = [];
        return successResponse(staffObj, "Staff member retrieved successfully");
      }
    }

    // Get specific staff by email
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return errorResponse("Invalid email format", 400);
      }

      // ✅ For login flow: Find by email only (email is unique across all staff)
      // ✅ For other operations: Filter by both email and clientIds
      const query: any = { email: email };
      if (clientId) {
        query.clientIds = clientId; // MongoDB will match if clientId is in the array
      }
      
      const staffData = await Staff.findOne(query);
      
      if (!staffData) {
        return errorResponse("Staff member not found with this email", 404);
      }

      // Populate assignedProjects for this staff member
      try {
        const projectQuery: any = {
          "assignedStaff._id": staffData._id.toString()
        };
        // Only filter by clientId if it was provided
        if (clientId) {
          projectQuery.clientId = clientId;
        } else {
          // Use the staff's first clientId for project filtering (or all clientIds)
          // For login, we'll get projects from all their clients
          if (staffData.clientIds && staffData.clientIds.length > 0) {
            projectQuery.clientId = { $in: staffData.clientIds };
          }
        }
        
        const assignedProjects = await Projects.find(
          projectQuery,
          { name: 1 } // Only get project names
        );

        const projectNames = assignedProjects.map(project => project.name);
        const staffObj = staffData.toObject();
        staffObj.assignedProjects = projectNames;

        return successResponse(staffObj, "Staff member retrieved successfully");
      } catch (error) {
        console.error(`Error fetching projects for staff ${email}:`, error);
        // Return staff with empty assignedProjects on error
        const staffObj = staffData.toObject();
        staffObj.assignedProjects = [];
        return successResponse(staffObj, "Staff member retrieved successfully");
      }
    }

    // ✅ Get all staff members filtered by clientId
    if (!clientId) {
      return errorResponse("Client ID is required when fetching all staff", 400);
    }
    
    console.log('🔍 Fetching all staff for clientId:', clientId);
    // Find staff where clientId is in their clientIds array
    const staffData = await Staff.find({ clientIds: clientId }).sort({ createdAt: -1 });
    console.log('📊 Found staff count:', staffData.length);

    // Populate assignedProjects for each staff member by querying Projects collection
    const staffWithProjects = await Promise.all(
      staffData.map(async (staff) => {
        try {
          // Find projects where this staff member is assigned
          const assignedProjects = await Projects.find(
            {
              "assignedStaff._id": staff._id.toString(),
              clientId: clientId // ✅ Also filter projects by clientId
            },
            { name: 1 } // Only get project names
          );

          // Extract project names
          const projectNames = assignedProjects.map(project => project.name);

          // Convert to plain object and add assignedProjects
          const staffObj = staff.toObject();
          staffObj.assignedProjects = projectNames;

          return staffObj;
        } catch (error) {
          console.error(`Error fetching projects for staff ${staff._id}:`, error);
          // Return staff with empty assignedProjects on error
          const staffObj = staff.toObject();
          staffObj.assignedProjects = [];
          return staffObj;
        }
      })
    );

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

      // Find the project
      const project = await Projects.findById(data.projectId);
      if (!project) {
        return errorResponse("Project not found", 404);
      }

      // Find the staff member
      const staff = await Staff.findById(data.staffId);
      if (!staff) {
        return errorResponse("Staff member not found", 404);
      }

      // Check if staff is already assigned to this project
      const isAlreadyAssigned = project.assignedStaff?.some(
        (assignedStaff: any) => assignedStaff._id.toString() === data.staffId
      );

      if (isAlreadyAssigned) {
        return errorResponse("Staff member is already assigned to this project", 409);
      }

      // Add staff to project's assignedStaff array
      const staffToAssign = {
        _id: staff._id,
        fullName: `${staff.firstName} ${staff.lastName}`,
      };

      const updatedAssignedStaff = [...(project.assignedStaff || []), staffToAssign];

      // Update the project
      const updatedProject = await Projects.findByIdAndUpdate(
        data.projectId,
        { assignedStaff: updatedAssignedStaff },
        { new: true }
      );

      if (!updatedProject) {
        return errorResponse("Failed to update project", 500);
      }

      // Log the staff assignment activity
      try {
        const activityPayload = {
          user: data.user || {
            userId: 'system',
            fullName: 'System',
            email: 'system@admin.com'
          },
          clientId: project.clientId || 'unknown',
          projectId: data.projectId,
          projectName: project.name || project.projectName || 'Unknown Project',
          activityType: 'staff_assigned',
          category: 'staff',
          action: 'assign',
          description: `Assigned ${staff.firstName} ${staff.lastName} to project "${project.name || project.projectName}"`,
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
          projectName: project.name || project.projectName,
          assignedAt: new Date().toISOString()
        },
        "Staff member assigned to project successfully",
        201
      );
    }

    // Handle regular staff creation
    if (!data.email) {
      return errorResponse("Email is required", 400);
    }

    // ✅ Support both single clientId and multiple clientIds
    // Allow empty clientIds array for self-registration (admin will assign later)
    const clientIds = data.clientIds || (data.clientId ? [data.clientId] : []);
    
    // Validate all clientIds if provided
    if (clientIds.length > 0) {
      for (const cId of clientIds) {
        if (!Types.ObjectId.isValid(cId)) {
          return errorResponse(`Invalid client ID format: ${cId}`, 400);
        }
        
        // ✅ Validate each client exists
        try {
          await requireValidClient(cId);
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
    console.log(password);

    // Create new staff member with clientIds array
    const newStaff = new Staff({ ...staffData, clientIds });
    const savedStaff = await newStaff.save();

    // Create login user entry
    const loginPayload = {
      email: data.email,
      userType: "staff",
    };
    const newLoginUser = new LoginUser(loginPayload);
    await newLoginUser.save();

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

    // ✅ Find and update the staff member (filtered by both ID and clientIds array)
    const updatedStaff = await Staff.findOneAndUpdate(
      { _id: id, clientIds: clientId }, // Check if clientId is in clientIds array
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return errorResponse("Staff member not found", 404);
    }

    // Update email in LoginUser if email was changed
    if (updateData.email) {
      await LoginUser.findOneAndUpdate(
        { staffId: id },
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
        clientIds: clientId // Check if clientId is in clientIds array
      });
      if (!staff) {
        return errorResponse("Staff member not found", 404);
      }

      // Remove staff from project's assignedStaff array
      const originalAssignedStaff = project.assignedStaff || [];
      const updatedAssignedStaff = originalAssignedStaff.filter(
        (assignedStaff: any) => assignedStaff._id.toString() !== id
      );

      // Update the project
      const updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        { assignedStaff: updatedAssignedStaff },
        { new: true }
      );

      if (!updatedProject) {
        return errorResponse("Failed to update project", 500);
      }

      // Log the staff removal activity
      try {
        const activityPayload = {
          user: {
            userId: 'system',
            fullName: 'System',
            email: 'system@admin.com'
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
    }

    // Handle regular staff deletion
    // ✅ Find the staff member first and ensure it belongs to the client
    const staffToDelete = await Staff.findOne({ 
      _id: id, 
      clientIds: clientId // Check if clientId is in clientIds array
    });
    if (!staffToDelete) {
      return errorResponse("Staff member not found", 404);
    }

    // Delete the staff member
    const deletedStaff = await Staff.findOneAndDelete({ 
      _id: id, 
      clientIds: clientId 
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
