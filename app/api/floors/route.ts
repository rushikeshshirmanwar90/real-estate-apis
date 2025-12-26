import { Building } from "@/lib/models/Building";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("id");

    if (!buildingId) {
      return errorResponse("Building ID is required", 400);
    }

    if (!isValidObjectId(buildingId)) {
      return errorResponse("Invalid building ID format", 400);
    }

    const building = await Building.findById(buildingId).lean() as any;
    if (!building) {
      return errorResponse("Building not found", 404);
    }

    if (floorId) {
      // Get specific floor
      const floor = (building as any).floors?.find((f: any) => f._id.toString() === floorId);
      if (!floor) {
        return errorResponse("Floor not found", 404);
      }
      return successResponse(floor, "Floor retrieved successfully");
    }

    // Get all floors for the building
    const floors = (building as any).floors || [];
    return successResponse(floors, `Retrieved ${floors.length} floor(s) successfully`);
  } catch (error: unknown) {
    logger.error("Error fetching floors", error);
    return errorResponse("Failed to fetch floors", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();

    // Validate required fields
    if (!body.buildingId) {
      return errorResponse("Building ID is required", 400);
    }

    if (!isValidObjectId(body.buildingId)) {
      return errorResponse("Invalid building ID format", 400);
    }

    if (!body.floorName) {
      return errorResponse("Floor name is required", 400);
    }

    if (typeof body.floorNumber !== 'number') {
      return errorResponse("Floor number is required and must be a number", 400);
    }

    if (typeof body.totalUnits !== 'number' || body.totalUnits < 0) {
      return errorResponse("Total units must be a non-negative number", 400);
    }

    // Create new floor object
    const newFloor = {
      _id: new mongoose.Types.ObjectId(),
      floorNumber: body.floorNumber,
      floorName: body.floorName,
      floorType: body.floorType || 'Residential',
      totalUnits: body.totalUnits,
      totalBookedUnits: 0,
      unitTypes: [],
      units: [],
      description: body.description || '',
      isActive: true,
    };

    // Add floor to building
    const updatedBuilding = await Building.findByIdAndUpdate(
      body.buildingId,
      {
        $push: { floors: newFloor },
        $inc: { totalFloors: 1, totalUnits: body.totalUnits }
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBuilding) {
      return errorResponse("Building not found", 404);
    }

    // Find the newly added floor
    const addedFloor = (updatedBuilding as any).floors?.find((f: any) => f._id.toString() === newFloor._id.toString());

    return successResponse(
      addedFloor,
      "Floor created successfully",
      201
    );
  } catch (error: unknown) {
    logger.error("Error creating floor", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create floor", 500);
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const floorId = searchParams.get("id");
    const buildingId = searchParams.get("buildingId");

    if (!floorId || !buildingId) {
      return errorResponse("Floor ID and Building ID are required", 400);
    }

    if (!isValidObjectId(floorId) || !isValidObjectId(buildingId)) {
      return errorResponse("Invalid ID format", 400);
    }

    const body = await req.json();

    // Update specific floor in the building
    const updatedBuilding = await Building.findOneAndUpdate(
      { _id: buildingId, "floors._id": floorId },
      {
        $set: {
          "floors.$.floorName": body.floorName,
          "floors.$.floorType": body.floorType,
          "floors.$.totalUnits": body.totalUnits,
          "floors.$.description": body.description,
          "floors.$.floorNumber": body.floorNumber,
        }
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBuilding) {
      return errorResponse("Building or floor not found", 404);
    }

    // Find the updated floor
    const updatedFloor = (updatedBuilding as any).floors?.find((f: any) => f._id.toString() === floorId);

    return successResponse(updatedFloor, "Floor updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating floor", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update floor", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const floorId = searchParams.get("id");
    const buildingId = searchParams.get("buildingId");

    if (!floorId) {
      return errorResponse("Floor ID is required", 400);
    }

    if (!isValidObjectId(floorId)) {
      return errorResponse("Invalid floor ID format", 400);
    }

    let building;
    
    if (buildingId) {
      // If buildingId is provided, use it directly
      if (!isValidObjectId(buildingId)) {
        return errorResponse("Invalid building ID format", 400);
      }
      building = await Building.findById(buildingId);
    } else {
      // Find building that contains this floor
      building = await Building.findOne({ "floors._id": floorId });
    }

    if (!building) {
      return errorResponse("Building not found", 404);
    }

    // Find the floor to get its totalUnits before deletion
    const floorToDelete = building.floors?.find((f: any) => f._id.toString() === floorId);
    if (!floorToDelete) {
      return errorResponse("Floor not found", 404);
    }

    // Remove floor from building and update totals
    const updatedBuilding = await Building.findByIdAndUpdate(
      building._id,
      {
        $pull: { floors: { _id: floorId } },
        $inc: { 
          totalFloors: -1, 
          totalUnits: -(floorToDelete.totalUnits || 0),
          totalBookedUnits: -(floorToDelete.totalBookedUnits || 0)
        }
      },
      { new: true }
    ).lean();

    if (!updatedBuilding) {
      return errorResponse("Failed to update building", 500);
    }

    return successResponse(floorToDelete, "Floor deleted successfully");
  } catch (error: unknown) {
    logger.error("Error deleting floor", error);
    return errorResponse("Failed to delete floor", 500);
  }
};