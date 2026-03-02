import connect from "@/lib/db";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logger";

// POST - Test Equipment creation with sample data
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    // Sample equipment data that matches our new schema
    const testEquipmentData = {
      type: 'Excavator',
      category: 'Earthmoving & Excavation Equipment',
      quantity: 1,
      perUnitCost: 5000,
      totalCost: 5000,
      projectId: '507f1f77bcf86cd799439011', // Replace with actual project ID
      projectName: 'Test Project',
      projectSectionId: '507f1f77bcf86cd799439012', // Replace with actual section ID
      projectSectionName: 'Test Section',
      costType: 'rental',
      rentalPeriod: 'daily',
      rentalDuration: 7,
      status: 'active',
      notes: 'Test equipment entry'
    };

    console.log('Creating test equipment with data:', testEquipmentData);

    // Create new equipment entry
    const equipment = new Equipment(testEquipmentData);
    const savedEquipment = await equipment.save();

    return successResponse(
      savedEquipment,
      "Test equipment created successfully",
      201
    );
  } catch (error: unknown) {
    logger.error("Error creating test equipment", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create test equipment", 500);
  }
};

// GET - Get test equipment info
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    
    const { Equipment } = await import("@/lib/models/Xsite/Equipment");
    
    // Get schema information
    const schemaInfo = {
      modelName: Equipment.modelName,
      requiredFields: [],
      allFields: [],
      schemaOptions: Equipment.schema.options
    };
    
    // Extract field information
    for (const [fieldName, schemaType] of Object.entries(Equipment.schema.paths)) {
      schemaInfo.allFields.push(fieldName);
      if ((schemaType as any).isRequired) {
        schemaInfo.requiredFields.push(fieldName);
      }
    }
    
    // Get sample document count
    const count = await Equipment.countDocuments();
    
    return successResponse(
      {
        schemaInfo,
        documentCount: count,
        sampleRequiredData: {
          type: 'Excavator',
          category: 'Earthmoving & Excavation Equipment',
          quantity: 1,
          perUnitCost: 5000,
          projectId: '507f1f77bcf86cd799439011',
          projectName: 'Test Project',
          projectSectionId: '507f1f77bcf86cd799439012',
          projectSectionName: 'Test Section'
        }
      },
      "Equipment model information retrieved successfully"
    );
    
  } catch (error: unknown) {
    logger.error("Error getting equipment info", error);
    return errorResponse("Failed to get equipment info", 500);
  }
};