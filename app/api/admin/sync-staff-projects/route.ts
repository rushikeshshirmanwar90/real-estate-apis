import { NextRequest, NextResponse } from "next/server";
import  connect  from "@/lib/db";
import { Staff } from "@/lib/models/users/Staff";
import { Projects } from "@/lib/models/Project";
import { syncStaffProjectAssignments } from "@/lib/utils/staffProjectUtils";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { checkValidClient } from "@/lib/auth";

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
    
    console.log("🔄 Starting staff project assignments sync via API...");
    
    const result = await syncStaffProjectAssignments();
    
    if (result.success) {
      console.log("✅ Sync completed successfully via API!");
      return successResponse(
        { synced: true },
        "Staff project assignments synced successfully"
      );
    } else {
      return errorResponse("Sync failed", 500);
    }
  } catch (error: unknown) {
    console.error("❌ Error during sync via API:", error);
    return errorResponse("Failed to sync staff project assignments", 500, error);
  }
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
    
    // Get stats about current assignments
    const totalStaff = await Staff.countDocuments();
    const staffWithProjects = await Staff.countDocuments({
      assignedProjects: { $exists: true, $ne: [] }
    });
    
    const totalProjects = await Projects.countDocuments();
    const projectsWithStaff = await Projects.countDocuments({
      assignedStaff: { $exists: true, $ne: [] }
    });
    
    // Get sample data
    const sampleStaffWithProjects = await Staff.find({
      assignedProjects: { $exists: true, $ne: [] }
    })
    .select('firstName lastName assignedProjects')
    .limit(5)
    .lean();
    
    return successResponse({
      stats: {
        totalStaff,
        staffWithProjects,
        totalProjects,
        projectsWithStaff,
        syncNeeded: projectsWithStaff > staffWithProjects
      },
      sampleData: sampleStaffWithProjects
    }, "Staff project assignment stats retrieved successfully");
    
  } catch (error: unknown) {
    console.error("❌ Error getting sync stats:", error);
    return errorResponse("Failed to get sync stats", 500, error);
  }
};