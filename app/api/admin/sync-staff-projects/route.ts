import { NextRequest } from "next/server";
import  connect  from "@/lib/db";
import { syncStaffProjectAssignments } from "@/lib/utils/staffProjectUtils";
import { successResponse, errorResponse } from "@/lib/utils/response";

export const POST = async (req: NextRequest) => {
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
  try {
    await connect();
    
    const { Staff } = await import("../../../../lib/models/users/Staff");
    const { Projects } = await import("../../../../lib/models/Project");
    
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