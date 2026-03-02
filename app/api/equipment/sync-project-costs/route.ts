import connect from "@/lib/db";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { Projects } from "@/lib/models/Project";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

// POST - Sync equipment costs with project spent amount
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const { projectId } = await req.json();

    if (!projectId) {
      return errorResponse("Project ID is required", 400);
    }

    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    // Get all equipment for this project
    const equipment = await Equipment.find({ 
      projectId: projectId,
      status: { $in: ['active', null, undefined] } // Include active and unset status
    });

    // Calculate total equipment cost
    const totalEquipmentCost = equipment.reduce((sum, item) => {
      const cost = item.totalCost || (item.quantity * item.perUnitCost);
      return sum + cost;
    }, 0);

    // Get current project data
    const project = await Projects.findById(projectId);
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    // Get current spent amount from materials and labor
    const materialCost = (project.MaterialUsed || []).reduce((sum: number, material: any) => 
      sum + (material.totalCost || 0), 0
    );
    
    const laborCost = (project.Labors || []).reduce((sum: number, labor: any) => 
      sum + (labor.totalCost || 0), 0
    );

    // Calculate what the spent amount should be
    const correctSpentAmount = materialCost + laborCost + totalEquipmentCost;

    // Update project spent amount
    await Projects.findByIdAndUpdate(
      projectId,
      { spent: correctSpentAmount },
      { new: true }
    );

    logger.info(`Synced project ${projectId} spent amount: Materials: ${materialCost}, Labor: ${laborCost}, Equipment: ${totalEquipmentCost}, Total: ${correctSpentAmount}`);

    return successResponse(
      {
        projectId,
        previousSpent: project.spent,
        newSpent: correctSpentAmount,
        breakdown: {
          materials: materialCost,
          labor: laborCost,
          equipment: totalEquipmentCost
        },
        equipmentCount: equipment.length
      },
      "Project equipment costs synced successfully"
    );
  } catch (error: unknown) {
    logger.error("Error syncing equipment costs", error);
    return errorResponse("Failed to sync equipment costs", 500);
  }
};