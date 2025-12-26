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
    const floorId = searchParams.get("floorId");
    const unitId = searchParams.get("id");

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

    if (unitId) {
      // Get specific unit
      let unit = null;
      for (const floor of building.floors || []) {
        unit = floor.units?.find((u: any) => u._id.toString() === unitId);
        if (unit) break;
      }
      
      if (!unit) {
        return errorResponse("Unit not found", 404);
      }
      return successResponse(unit, "Unit retrieved successfully");
    }

    if (floorId) {
      // Get all units for a specific floor
      const floor = (building as any).floors?.find((f: any) => f._id.toString() === floorId);
      if (!floor) {
        return errorResponse("Floor not found", 404);
      }
      
      const units = floor.units || [];
      return successResponse(units, `Retrieved ${units.length} unit(s) successfully`);
    }

    // Get all units for the building
    const allUnits: any[] = [];
    (building as any).floors?.forEach((floor: any) => {
      if (floor.units) {
        allUnits.push(...floor.units.map((unit: any) => ({
          ...unit,
          floorId: floor._id,
          floorName: floor.floorName,
          floorNumber: floor.floorNumber
        })));
      }
    });

    return successResponse(allUnits, `Retrieved ${allUnits.length} unit(s) successfully`);
  } catch (error: unknown) {
    logger.error("Error fetching units", error);
    return errorResponse("Failed to fetch units", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();

    // Validate required fields
    if (!body.buildingId || !body.floorId) {
      return errorResponse("Building ID and Floor ID are required", 400);
    }

    if (!isValidObjectId(body.buildingId) || !isValidObjectId(body.floorId)) {
      return errorResponse("Invalid ID format", 400);
    }

    if (!body.unitNumber || !body.type || typeof body.area !== 'number') {
      return errorResponse("Unit number, type, and area are required", 400);
    }

    // Create new unit object
    const newUnit = {
      _id: new mongoose.Types.ObjectId(),
      unitNumber: body.unitNumber,
      type: body.type,
      area: body.area,
      price: body.price || 0,
      status: body.status || 'Available',
      customerInfo: body.customerInfo || {},
      bookingDate: body.bookingDate ? new Date(body.bookingDate) : undefined,
      description: body.description || '',
      images: body.images || [],
    };

    // Add unit to specific floor
    const updatedBuilding = await Building.findOneAndUpdate(
      { _id: body.buildingId, "floors._id": body.floorId },
      {
        $push: { "floors.$.units": newUnit },
        $inc: { 
          "floors.$.totalUnits": 1,
          ...(newUnit.status === 'Booked' || newUnit.status === 'Sold' ? { "floors.$.totalBookedUnits": 1 } : {})
        }
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBuilding) {
      return errorResponse("Building or floor not found", 404);
    }

    // Find the newly added unit
    const floor = (updatedBuilding as any).floors?.find((f: any) => f._id.toString() === body.floorId);
    const addedUnit = floor?.units?.find((u: any) => u._id.toString() === newUnit._id.toString());

    return successResponse(
      addedUnit,
      "Unit created successfully",
      201
    );
  } catch (error: unknown) {
    logger.error("Error creating unit", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create unit", 500);
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("id");
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");

    if (!unitId || !buildingId || !floorId) {
      return errorResponse("Unit ID, Building ID, and Floor ID are required", 400);
    }

    if (!isValidObjectId(unitId) || !isValidObjectId(buildingId) || !isValidObjectId(floorId)) {
      return errorResponse("Invalid ID format", 400);
    }

    const body = await req.json();

    // Get current unit status to handle booking count changes
    const building = await Building.findById(buildingId);
    if (!building) {
      return errorResponse("Building not found", 404);
    }

    const floor = (building as any).floors?.find((f: any) => f._id.toString() === floorId);
    if (!floor) {
      return errorResponse("Floor not found", 404);
    }

    const currentUnit = floor.units?.find((u: any) => u._id.toString() === unitId);
    if (!currentUnit) {
      return errorResponse("Unit not found", 404);
    }

    const wasBooked = currentUnit.status === 'Booked' || currentUnit.status === 'Sold';
    const willBeBooked = body.status === 'Booked' || body.status === 'Sold';

    // Update specific unit in the floor
    const updateQuery: any = {
      $set: {
        "floors.$[floor].units.$[unit].unitNumber": body.unitNumber,
        "floors.$[floor].units.$[unit].type": body.type,
        "floors.$[floor].units.$[unit].area": body.area,
        "floors.$[floor].units.$[unit].price": body.price,
        "floors.$[floor].units.$[unit].status": body.status,
        "floors.$[floor].units.$[unit].customerInfo": body.customerInfo || {},
        "floors.$[floor].units.$[unit].description": body.description,
        "floors.$[floor].units.$[unit].images": body.images || [],
      }
    };

    // Handle booking date
    if (body.bookingDate) {
      updateQuery.$set["floors.$[floor].units.$[unit].bookingDate"] = new Date(body.bookingDate);
    }

    // Handle booking count changes
    if (wasBooked && !willBeBooked) {
      updateQuery.$inc = { "floors.$[floor].totalBookedUnits": -1 };
    } else if (!wasBooked && willBeBooked) {
      updateQuery.$inc = { "floors.$[floor].totalBookedUnits": 1 };
    }

    const updatedBuilding = await Building.findOneAndUpdate(
      { _id: buildingId },
      updateQuery,
      {
        arrayFilters: [
          { "floor._id": floorId },
          { "unit._id": unitId }
        ],
        new: true,
        runValidators: true
      }
    ).lean();

    if (!updatedBuilding) {
      return errorResponse("Failed to update unit", 500);
    }

    // Find the updated unit
    const updatedFloor = (updatedBuilding as any).floors?.find((f: any) => f._id.toString() === floorId);
    const updatedUnit = updatedFloor?.units?.find((u: any) => u._id.toString() === unitId);

    return successResponse(updatedUnit, "Unit updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating unit", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update unit", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("id");
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");

    if (!unitId) {
      return errorResponse("Unit ID is required", 400);
    }

    if (!isValidObjectId(unitId)) {
      return errorResponse("Invalid unit ID format", 400);
    }

    let building;
    let targetFloorId = floorId;

    if (buildingId && floorId) {
      // If both IDs are provided, use them directly
      if (!isValidObjectId(buildingId) || !isValidObjectId(floorId)) {
        return errorResponse("Invalid ID format", 400);
      }
      building = await Building.findById(buildingId);
    } else {
      // Find building and floor that contains this unit
      building = await Building.findOne({ "floors.units._id": unitId });
      if (building) {
        const floor = (building as any).floors?.find((f: any) => 
          f.units?.some((u: any) => u._id.toString() === unitId)
        );
        targetFloorId = floor?._id.toString();
      }
    }

    if (!building || !targetFloorId) {
      return errorResponse("Building or floor not found", 404);
    }

    // Find the unit to get its details before deletion
    const floor = (building as any).floors?.find((f: any) => f._id.toString() === targetFloorId);
    const unitToDelete = floor?.units?.find((u: any) => u._id.toString() === unitId);
    
    if (!unitToDelete) {
      return errorResponse("Unit not found", 404);
    }

    const wasBooked = unitToDelete.status === 'Booked' || unitToDelete.status === 'Sold';

    // Remove unit from floor and update totals
    const updateQuery: any = {
      $pull: { "floors.$[floor].units": { _id: unitId } },
      $inc: { "floors.$[floor].totalUnits": -1 }
    };

    if (wasBooked) {
      updateQuery.$inc["floors.$[floor].totalBookedUnits"] = -1;
    }

    const updatedBuilding = await Building.findByIdAndUpdate(
      building._id,
      updateQuery,
      {
        arrayFilters: [{ "floor._id": targetFloorId }],
        new: true
      }
    ).lean();

    if (!updatedBuilding) {
      return errorResponse("Failed to update building", 500);
    }

    return successResponse(unitToDelete, "Unit deleted successfully");
  } catch (error: unknown) {
    logger.error("Error deleting unit", error);
    return errorResponse("Failed to delete unit", 500);
  }
};