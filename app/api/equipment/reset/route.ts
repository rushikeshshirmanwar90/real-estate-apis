import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logger";
import mongoose from "mongoose";

// POST - Reset Equipment model and clear cache
export const POST = async (req: NextRequest) => {
  try {
    await connect();
    
    // Clear the Equipment model from mongoose cache
    if (mongoose.models.Equipment) {
      delete mongoose.models.Equipment;
      logger.info("Equipment model cleared from cache");
    }
    
    // Re-import the Equipment model to ensure fresh schema
    const { Equipment } = await import("@/lib/models/Xsite/Equipment");
    
    // Test the model by creating a simple query
    const testQuery = await Equipment.find({}).limit(1);
    
    return successResponse(
      { 
        message: "Equipment model reset successfully",
        modelName: Equipment.modelName,
        schemaFields: Object.keys(Equipment.schema.paths)
      },
      "Equipment model reset and reloaded successfully"
    );
    
  } catch (error: unknown) {
    logger.error("Error resetting Equipment model", error);
    return errorResponse("Failed to reset Equipment model", 500);
  }
};

// GET - Check current Equipment model status
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    
    const { Equipment } = await import("@/lib/models/Xsite/Equipment");
    
    return successResponse(
      {
        modelName: Equipment.modelName,
        schemaFields: Object.keys(Equipment.schema.paths),
        requiredFields: Object.keys(Equipment.schema.paths).filter(
          field => Equipment.schema.paths[field].isRequired
        )
      },
      "Equipment model status retrieved successfully"
    );
    
  } catch (error: unknown) {
    logger.error("Error checking Equipment model status", error);
    return errorResponse("Failed to check Equipment model status", 500);
  }
};