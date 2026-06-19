import connect from "@/lib/db";
import { Staff } from "@/lib/models/users/Staff";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { checkValidClient } from "@/lib/auth";
import { invalidateCachePattern } from "@/lib/utils/redis-helpers";

const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

/**
 * PATCH /api/users/staff/project-payment
 * Sets/updates the agreed monthly payment for a staff member on one specific
 * project they're already assigned to. Keeps both sides of the relationship
 * (Staff.assignedProjects[] and Project.assignedStaff[]) in sync.
 *
 * Request body:
 * {
 *   staffId: string,        // Required
 *   projectId: string,      // Required
 *   monthlyPayment: number  // Required, >= 0
 * }
 */
export const PATCH = async (req: NextRequest) => {
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

    const { staffId, projectId, monthlyPayment } = data;

    if (!staffId || !isValidObjectId(staffId)) {
      return errorResponse("Valid staffId is required", 400);
    }
    if (!projectId || !isValidObjectId(projectId)) {
      return errorResponse("Valid projectId is required", 400);
    }
    if (
      monthlyPayment === undefined ||
      monthlyPayment === null ||
      isNaN(Number(monthlyPayment)) ||
      Number(monthlyPayment) < 0
    ) {
      return errorResponse("monthlyPayment must be a non-negative number", 400);
    }

    const amount = Number(monthlyPayment);

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    const assignment = (staff.assignedProjects || []).find(
      (p: any) => p.projectId.toString() === projectId
    );
    if (!assignment) {
      return errorResponse("Staff member is not assigned to this project", 400);
    }

    // Update the Staff side
    const updatedStaff = await Staff.findOneAndUpdate(
      { _id: staffId, "assignedProjects.projectId": projectId },
      { $set: { "assignedProjects.$.monthlyPayment": amount } },
      { new: true }
    );

    // Keep the Project side in sync (Project.assignedStaff also stores monthlyPayment)
    await Projects.findOneAndUpdate(
      { _id: projectId, "assignedStaff._id": staffId },
      { $set: { "assignedStaff.$.monthlyPayment": amount } }
    );

    // Invalidate caches so the updated payment shows up immediately, not after the
    // 24h TTL — using the exact keys these list endpoints actually cache under.
    const clientId = assignment.clientId?.toString();
    if (clientId) {
      await invalidateCachePattern(`clients:${clientId}:staff`);
      await invalidateCachePattern(`staff:client:${clientId}:all`);
      await invalidateCachePattern(`projects:${clientId}*`);
    }

    return successResponse(updatedStaff, "Monthly payment updated successfully");
  } catch (error: unknown) {
    console.error("Error updating staff project payment:", error);
    if (error instanceof Error) {
      return errorResponse("Failed to update monthly payment", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};
