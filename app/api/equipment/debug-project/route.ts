import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";

// GET - Debug project and equipment data
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return errorResponse("Project ID is required", 400);
    }

    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    // Get project data
    const project = await Projects.findById(projectId);
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    // Get all equipment for this project
    const equipment = await Equipment.find({ projectId });

    // Calculate total equipment cost
    const totalEquipmentCost = equipment.reduce((sum, item) => {
      const cost = item.totalCost || (item.quantity * item.perUnitCost);
      return sum + cost;
    }, 0);

    // Calculate material costs
    const materialUsedCost = (project.MaterialUsed || []).reduce((sum: number, material: any) => 
      sum + (material.totalCost || 0), 0
    );

    const materialAvailableCost = (project.MaterialAvailable || []).reduce((sum: number, material: any) => 
      sum + (material.totalCost || material.cost || 0), 0
    );

    // Calculate labor costs
    const laborCost = (project.Labors || []).reduce((sum: number, labor: any) => 
      sum + (labor.totalCost || 0), 0
    );

    const debugInfo = {
      project: {
        id: project._id,
        name: project.name,
        spent: project.spent,
        budget: project.budget,
        spentType: typeof project.spent,
        spentIsNull: project.spent === null,
        spentIsUndefined: project.spent === undefined
      },
      equipment: {
        count: equipment.length,
        totalCost: totalEquipmentCost,
        items: equipment.map(item => ({
          id: item._id,
          type: item.type,
          quantity: item.quantity,
          perUnitCost: item.perUnitCost,
          totalCost: item.totalCost,
          status: item.status
        }))
      },
      materials: {
        used: {
          count: (project.MaterialUsed || []).length,
          totalCost: materialUsedCost
        },
        available: {
          count: (project.MaterialAvailable || []).length,
          totalCost: materialAvailableCost
        }
      },
      labor: {
        count: (project.Labors || []).length,
        totalCost: laborCost
      },
      calculations: {
        expectedSpent: materialUsedCost + laborCost + totalEquipmentCost,
        actualSpent: project.spent,
        difference: (project.spent || 0) - (materialUsedCost + laborCost + totalEquipmentCost)
      }
    };

    console.log('🔍 Project debug info:', debugInfo);

    return successResponse(debugInfo, "Project debug information retrieved successfully");
  } catch (error: unknown) {
    console.error('❌ Project debug failed:', error);
    return errorResponse("Failed to debug project", 500);
  }
};