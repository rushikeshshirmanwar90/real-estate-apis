import connect from "@/lib/db";
import { Staff } from "@/lib/models/users/Staff";
import { Client } from "@/lib/models/super-admin/Client";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { requireValidClient } from "@/lib/utils/client-validation";
import { 
  safeRedisDelCache,
  safeRedisKeysCache 
} from "@/lib/utils/redis-helpers";
import { checkValidClient } from "@/lib/auth";

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
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
    const staffId = searchParams.get("staffId");
    const clientId = searchParams.get("clientId");

    // Validate required parameters
    if (!staffId) {
      return errorResponse("Staff ID is required", 400);
    }

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(staffId)) {
      return errorResponse("Invalid staff ID format", 400);
    }

    if (!Types.ObjectId.isValid(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // Validate client exists
    try {
      await requireValidClient(clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    // Find the staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    // Check if staff is assigned to this client
    const isAssignedToClient = staff.clients?.some(
      (clientAssignment: any) => clientAssignment.clientId.toString() === clientId
    );

    if (!isAssignedToClient) {
      return errorResponse("Staff member is not assigned to this client", 400);
    }

    // Check if staff is assigned to any projects for this client
    const assignedProjects = staff.assignedProjects?.filter(
      (project: any) => project.clientId.toString() === clientId
    ) || [];

    if (assignedProjects.length > 0) {
      const projectNames = assignedProjects.map((p: any) => p.projectName).join(', ');
      return errorResponse(
        `Cannot remove staff member. They are currently assigned to the following project(s): ${projectNames}. Please unassign them from all projects first.`,
        400
      );
    }

    // Perform the removal operations (without transactions for compatibility)
    try {
      console.log('🔄 Starting staff removal operations...');

      // 1. Remove clientId from staff's clients array
      console.log('1️⃣ Removing client from staff clients array...');
      await Staff.findByIdAndUpdate(
        staffId,
        {
          $pull: {
            clients: { clientId: clientId }
          }
        }
      );

      // 2. Remove staffId from client's staffs array
      console.log('2️⃣ Removing staff from client staffs array...');
      await Client.findByIdAndUpdate(
        clientId,
        {
          $pull: {
            staffs: staffId
          }
        }
      );

      // 3. Remove any project assignments for this client (safety measure)
      console.log('3️⃣ Removing project assignments for this client...');
      await Staff.findByIdAndUpdate(
        staffId,
        {
          $pull: {
            assignedProjects: { clientId: clientId }
          }
        }
      );

      // 4. Remove staff from any projects belonging to this client
      console.log('4️⃣ Removing staff from client projects...');
      await Projects.updateMany(
        { 
          clientId: clientId,
          "assignedStaff._id": staffId
        },
        {
          $pull: {
            assignedStaff: { _id: staffId }
          }
        }
      );

      console.log('✅ All removal operations completed successfully');

      // Log the staff removal activity
      try {
        const activityPayload = {
          user: {
            userId: 'system',
            fullName: 'System',
            email: 'system@admin.com'
          },
          clientId: clientId,
          projectId: null,
          projectName: 'Organization',
          activityType: 'staff_removed',
          category: 'staff',
          action: 'remove',
          description: `Removed ${staff.firstName} ${staff.lastName} from organization`,
          message: 'Staff member removed from client organization',
          date: new Date().toISOString(),
          metadata: {
            staffName: `${staff.firstName} ${staff.lastName}`,
            staffId: staff._id.toString(),
            clientName: client.name,
          },
        };

        // Import axios for activity logging
        const axios = require('axios');
        const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:8080';
        
        await axios.post(`${domain}/api/activity`, activityPayload);
        console.log(`✅ Staff removal activity logged for ${staff.firstName} ${staff.lastName}`);
      } catch (activityError) {
        console.error('❌ Error logging staff removal activity:', activityError);
        // Don't fail the operation if activity logging fails
      }

      // Invalidate cache
      const keys = await safeRedisKeysCache(`staff:*`);
      if (keys.length > 0) {
        await safeRedisDelCache(...keys);
      }

      // Also invalidate client cache
      const clientKeys = await safeRedisKeysCache(`client:*`);
      if (clientKeys.length > 0) {
        await safeRedisDelCache(...clientKeys);
      }

      const result = {
        success: true,
        staffId: staffId,
        clientId: clientId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        clientName: client.name,
        removedAt: new Date().toISOString(),
        message: "Staff member has been removed from your organization but their account remains active"
      };

      return successResponse(
        result,
        "Staff member removed from client organization successfully"
      );

    } catch (operationError: any) {
      console.error('❌ Error during removal operations:', operationError);
      return errorResponse(
        `Failed to remove staff member: ${operationError.message}`,
        500
      );
    }

  } catch (error: unknown) {
    console.error("DELETE /clients/staff/remove error:", error);
    return errorResponse("Failed to remove staff member from client", 500, error);
  }
};