import connect from "@/lib/db";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { Projects } from "@/lib/models/Project";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";


// GET - Retrieve equipment entries
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const projectSectionId = searchParams.get("projectSectionId");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const costType = searchParams.get("costType");

    // Get specific equipment by ID
    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid equipment ID format", 400);
      }

      const equipment = await Equipment.findById(id).lean();
      if (!equipment) {
        return errorResponse("Equipment not found", 404);
      }

      return successResponse(equipment, "Equipment retrieved successfully");
    }

    // Build query filters
    const query: any = {};
    
    if (projectId) {
      if (!isValidObjectId(projectId)) {
        return errorResponse("Invalid project ID format", 400);
      }
      query.projectId = projectId;
    }
    
    if (projectSectionId) {
      if (!isValidObjectId(projectSectionId)) {
        return errorResponse("Invalid project section ID format", 400);
      }
      query.projectSectionId = projectSectionId;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (costType) {
      query.costType = costType;
    }

    // Execute query without pagination
    const equipment = await Equipment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(
      equipment,
      `Retrieved ${equipment.length} equipment entries successfully`
    );
  } catch (error: unknown) {
    logger.error("GET /equipment error", error);
    return errorResponse("Failed to fetch equipment data", 500);
  }
};

// POST - Create new equipment entry
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const data = await req.json();

    // Validate required fields
    const requiredFields = ['type', 'category', 'quantity', 'perUnitCost', 'projectId', 'projectName', 'projectSectionId', 'projectSectionName'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return errorResponse(`${field} is required`, 400);
      }
    }

    // Validate ObjectIds
    if (!isValidObjectId(data.projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }
    
    if (!isValidObjectId(data.projectSectionId)) {
      return errorResponse("Invalid project section ID format", 400);
    }

    // Validate numeric fields
    if (data.quantity <= 0) {
      return errorResponse("Quantity must be greater than 0", 400);
    }
    
    if (data.perUnitCost < 0) {
      return errorResponse("Per unit cost cannot be negative", 400);
    }

    // Create new equipment entry
    const equipment = new Equipment(data);
    await equipment.save();

    // Update project's spent amount with robust handling
    const equipmentCost = equipment.totalCost || (equipment.quantity * equipment.perUnitCost);
    
    console.log('🔧 Equipment created:', {
      equipmentId: equipment._id,
      quantity: equipment.quantity,
      perUnitCost: equipment.perUnitCost,
      totalCost: equipment.totalCost,
      calculatedCost: equipmentCost,
      projectId: data.projectId
    });
    
    try {
      // First, verify the project exists and get current spent value
      const existingProject = await Projects.findById(data.projectId);
      if (!existingProject) {
        console.error('❌ Project not found:', data.projectId);
        logger.error(`Project ${data.projectId} not found when trying to update spent amount`);
        return successResponse(
          equipment,
          "Equipment entry created successfully, but project not found for spent update",
          201
        );
      }

      console.log('📊 Project before update:', {
        projectId: data.projectId,
        currentSpent: existingProject.spent,
        spentType: typeof existingProject.spent,
        spentIsNull: existingProject.spent === null,
        spentIsUndefined: existingProject.spent === undefined,
        equipmentCostToAdd: equipmentCost
      });

      // Handle cases where spent field might be null or undefined
      const currentSpent = existingProject.spent || 0;
      const newSpentAmount = currentSpent + equipmentCost;

      // Use $set instead of $inc to ensure the field is properly updated
      const updatedProject = await Projects.findByIdAndUpdate(
        data.projectId,
        { 
          $set: { spent: newSpentAmount }
        },
        { new: true, upsert: false }
      );
      
      if (!updatedProject) {
        console.error('❌ Failed to update project - project not found after update');
        return successResponse(
          equipment,
          "Equipment entry created successfully, but failed to update project spent amount",
          201
        );
      }

      console.log('💰 Project spent updated:', {
        projectId: data.projectId,
        equipmentCost: equipmentCost,
        previousSpent: currentSpent,
        newSpentAmount: updatedProject.spent,
        actualDifference: (updatedProject.spent || 0) - currentSpent,
        updateSuccess: true
      });
      
      logger.info(`Updated project ${data.projectId} spent amount from ${currentSpent} to ${updatedProject.spent} (added ${equipmentCost}) for equipment ${equipment._id}`);
      
      return successResponse(
        {
          equipment,
          projectUpdate: {
            previousSpent: currentSpent,
            newSpent: updatedProject.spent,
            equipmentCost: equipmentCost
          }
        },
        "Equipment entry created successfully and project spent amount updated",
        201
      );
      
    } catch (projectUpdateError) {
      console.error('❌ Failed to update project spent amount:', projectUpdateError);
      logger.error("Failed to update project spent amount", projectUpdateError);
      
      return successResponse(
        equipment,
        "Equipment entry created successfully, but failed to update project spent amount",
        201
      );
    }
  } catch (error: unknown) {
    logger.error("Error creating equipment entry", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create equipment entry", 500);
  }
};

// PUT - Update equipment entry
export const PUT = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Equipment ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid equipment ID format", 400);
    }

    const updateData = await req.json();

    // Validate numeric fields if provided
    if (updateData.quantity !== undefined && updateData.quantity <= 0) {
      return errorResponse("Quantity must be greater than 0", 400);
    }
    
    if (updateData.perUnitCost !== undefined && updateData.perUnitCost < 0) {
      return errorResponse("Per unit cost cannot be negative", 400);
    }

    await connect();

    // Get the original equipment to calculate cost difference
    const originalEquipment = await Equipment.findById(id);
    if (!originalEquipment) {
      return errorResponse("Equipment not found", 404);
    }

    const originalCost = originalEquipment.totalCost || (originalEquipment.quantity * originalEquipment.perUnitCost);

    const updatedEquipment = await Equipment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedEquipment) {
      return errorResponse("Equipment not found", 404);
    }

    // Calculate new cost and update project spent amount
    const newCost = updatedEquipment.totalCost || (updatedEquipment.quantity * updatedEquipment.perUnitCost);
    const costDifference = newCost - originalCost;

    if (costDifference !== 0) {
      try {
        await Projects.findByIdAndUpdate(
          originalEquipment.projectId,
          { $inc: { spent: costDifference } },
          { new: true }
        );
        
        logger.info(`Updated project ${originalEquipment.projectId} spent amount by ${costDifference} for equipment ${id}`);
      } catch (projectUpdateError) {
        logger.error("Failed to update project spent amount", projectUpdateError);
        // Don't fail the equipment update if project update fails
      }
    }

    return successResponse(updatedEquipment, "Equipment updated successfully and project spent amount adjusted");
  } catch (error: unknown) {
    logger.error("Error updating equipment", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update equipment", 500);
  }
};

// DELETE - Delete equipment entry
export const DELETE = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Equipment ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid equipment ID format", 400);
    }

    await connect();

    // Get the equipment before deleting to calculate cost to subtract
    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return errorResponse("Equipment not found", 404);
    }

    const equipmentCost = equipment.totalCost || (equipment.quantity * equipment.perUnitCost);
    const projectId = equipment.projectId;

    const deletedEquipment = await Equipment.findByIdAndDelete(id).lean();

    if (!deletedEquipment) {
      return errorResponse("Equipment not found", 404);
    }

    // Update project's spent amount (subtract the equipment cost)
    try {
      await Projects.findByIdAndUpdate(
        projectId,
        { $inc: { spent: -equipmentCost } },
        { new: true }
      );
      
      logger.info(`Updated project ${projectId} spent amount by -${equipmentCost} for deleted equipment ${id}`);
    } catch (projectUpdateError) {
      logger.error("Failed to update project spent amount", projectUpdateError);
      // Don't fail the equipment deletion if project update fails
    }

    return successResponse(deletedEquipment, "Equipment deleted successfully and project spent amount updated");
  } catch (error: unknown) {
    logger.error("Error deleting equipment", error);
    return errorResponse("Failed to delete equipment", 500);
  }
};