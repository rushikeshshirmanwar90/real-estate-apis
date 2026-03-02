import connect from "@/lib/db";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { Projects } from "@/lib/models/Project";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";

// POST - Test equipment spent integration
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const { projectId, testEquipment } = await req.json();

    if (!projectId || !isValidObjectId(projectId)) {
      return errorResponse("Valid project ID is required", 400);
    }

    if (!testEquipment || !Array.isArray(testEquipment) || testEquipment.length === 0) {
      return errorResponse("Test equipment array is required", 400);
    }

    // Get project before adding equipment
    const projectBefore = await Projects.findById(projectId);
    if (!projectBefore) {
      return errorResponse("Project not found", 404);
    }

    const spentBefore = projectBefore.spent || 0;
    console.log('Project spent before equipment addition:', spentBefore);

    // Calculate total cost of test equipment
    const totalEquipmentCost = testEquipment.reduce((sum, equipment) => {
      return sum + (equipment.quantity * equipment.perUnitCost);
    }, 0);

    console.log('Total equipment cost to add:', totalEquipmentCost);

    // Add equipment using the bulk API logic
    const equipmentEntries = testEquipment.map(equipment => ({
      ...equipment,
      projectId: projectId,
      totalCost: equipment.quantity * equipment.perUnitCost,
      status: 'active',
      usageDate: new Date()
    }));

    // Create equipment entries
    const createdEquipment = await Equipment.insertMany(equipmentEntries);
    console.log('Created equipment entries:', createdEquipment.length);

    // Update project spent
    await Projects.findByIdAndUpdate(
      projectId,
      { $inc: { spent: totalEquipmentCost } },
      { new: true, runValidators: true }
    );

    // Get project after adding equipment
    const projectAfter = await Projects.findById(projectId);
    const spentAfter = projectAfter?.spent || 0;
    console.log('Project spent after equipment addition:', spentAfter);

    const actualIncrease = spentAfter - spentBefore;
    const expectedIncrease = totalEquipmentCost;

    return successResponse({
      projectId,
      spentBefore,
      spentAfter,
      expectedIncrease,
      actualIncrease,
      integrationWorking: actualIncrease === expectedIncrease,
      createdEquipmentCount: createdEquipment.length,
      equipmentIds: createdEquipment.map(e => e._id)
    }, "Equipment spent integration test completed");

  } catch (error: unknown) {
    console.error("Error in equipment spent integration test:", error);
    return errorResponse("Failed to test equipment spent integration", 500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// GET - Check current project spent and equipment totals
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId || !isValidObjectId(projectId)) {
      return errorResponse("Valid project ID is required", 400);
    }

    await connect();

    // Get project current spent
    const project = await Projects.findById(projectId);
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    // Get all equipment for this project
    const equipment = await Equipment.find({ projectId, status: 'active' });
    
    // Calculate total equipment cost
    const totalEquipmentCost = equipment.reduce((sum, item) => {
      return sum + (item.totalCost || (item.quantity * item.perUnitCost));
    }, 0);

    // Get equipment count by category
    const equipmentByCategory = equipment.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + (item.totalCost || (item.quantity * item.perUnitCost));
      return acc;
    }, {} as { [category: string]: number });

    return successResponse({
      projectId,
      projectName: project.name,
      currentSpent: project.spent || 0,
      totalEquipmentCost,
      equipmentCount: equipment.length,
      equipmentByCategory,
      spentVsEquipmentDifference: (project.spent || 0) - totalEquipmentCost
    }, "Project spent and equipment analysis completed");

  } catch (error: unknown) {
    console.error("Error in project spent analysis:", error);
    return errorResponse("Failed to analyze project spent", 500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};