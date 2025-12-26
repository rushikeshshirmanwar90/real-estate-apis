import { Building } from "@/lib/models/Building";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";

// GET: Fetch floors for a building
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");

    if (!buildingId) {
      return errorResponse("Building ID is required", 400);
    }

    if (!isValidObjectId(buildingId)) {
      return errorResponse("Invalid building ID format", 400);
    }

    const building = await Building.findById(buildingId).lean();
    if (!building) {
      return errorResponse("Building not found", 404);
    }

    // If specific floor requested
    if (floorId) {
      if (!isValidObjectId(floorId)) {
        return errorResponse("Invalid floor ID format", 400);
      }

      const floor = (building as any).floors?.find((f: any) => f._id?.toString() === floorId);
      if (!floor) {
        return errorResponse("Floor not found", 404);
      }

      return successResponse(floor, "Floor retrieved successfully");
    }

    // Return all floors
    const floors = (building as any).floors || [];
    
    // Sort floors by floor number
    floors.sort((a: any, b: any) => (a.floorNumber || 0) - (b.floorNumber || 0));

    return successResponse(
      {
        buildingId: (building as any)._id,
        buildingName: (building as any).name,
        totalFloors: floors.length,
        floors: floors
      },
      `Retrieved ${floors.length} floor(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error fetching floors", error);
    return errorResponse("Failed to fetch floors", 500);
  }
};

// POST: Add a new floor to a building
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

    if (typeof body.floorNumber !== 'number') {
      return errorResponse("Floor number is required and must be a number", 400);
    }

    // Validate unit types if provided
    if (body.unitTypes && Array.isArray(body.unitTypes)) {
      for (const unitType of body.unitTypes) {
        if (!unitType.type || !unitType.count) {
          return errorResponse("Each unit type must have 'type' and 'count'", 400);
        }
        if (unitType.bookedCount > unitType.count) {
          return errorResponse("Booked count cannot exceed total count", 400);
        }
      }
    }

    // Validate individual units if provided
    if (body.units && Array.isArray(body.units)) {
      for (const unit of body.units) {
        if (!unit.unitNumber || !unit.type || !unit.area) {
          return errorResponse("Each unit must have 'unitNumber', 'type', and 'area'", 400);
        }
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if building exists
      const building = await Building.findById(body.buildingId).session(session);
      if (!building) {
        await session.abortTransaction();
        return errorResponse("Building not found", 404);
      }

      // Check if floor number already exists
      const existingFloor = (building as any).floors?.find((f: any) => f.floorNumber === body.floorNumber);
      if (existingFloor) {
        await session.abortTransaction();
        return errorResponse(`Floor ${body.floorNumber} already exists`, 400);
      }

      // Prepare floor data
      const floorData = {
        floorNumber: body.floorNumber,
        floorName: body.floorName || `Floor ${body.floorNumber}`,
        floorType: body.floorType || 'Residential',
        totalUnits: body.totalUnits || 0,
        totalBookedUnits: body.totalBookedUnits || 0,
        unitTypes: body.unitTypes || [],
        units: body.units || [],
        floorPlan: body.floorPlan || '',
        images: body.images || [],
        amenities: body.amenities || [],
        description: body.description || '',
        isActive: body.isActive !== undefined ? body.isActive : true,
      };

      // Calculate totals from units if not provided
      if (floorData.units.length > 0 && floorData.totalUnits === 0) {
        floorData.totalUnits = floorData.units.length;
        floorData.totalBookedUnits = floorData.units.filter((u: any) => 
          ['Booked', 'Sold', 'Reserved'].includes(u.status)
        ).length;
      }

      // Add floor to building
      const updatedBuilding = await Building.findByIdAndUpdate(
        body.buildingId,
        { 
          $push: { floors: floorData },
          $inc: { 
            totalFloors: 1,
            totalUnits: floorData.totalUnits,
            totalBookedUnits: floorData.totalBookedUnits
          }
        },
        { new: true, session }
      );

      if (!updatedBuilding) {
        await session.abortTransaction();
        return errorResponse("Failed to add floor", 500);
      }

      await session.commitTransaction();

      // Get the newly added floor
      const newFloor = (updatedBuilding as any).floors?.[(updatedBuilding as any).floors.length - 1];

      // Log activity
      const userInfo = extractUserInfo(req, body);
      if (userInfo && updatedBuilding) {
        await logActivity({
          user: userInfo,
          clientId: body.clientId || 'unknown',
          projectId: (updatedBuilding as any).projectId?.toString() || 'unknown',
          projectName: 'Building Floor Management',
          sectionId: (updatedBuilding as any)._id.toString(),
          sectionName: (updatedBuilding as any).name || 'Unknown Building',
          activityType: "section_created",
          category: "section",
          action: "create",
          description: `Added ${floorData.floorName} to building "${(updatedBuilding as any).name}"`,
          message: `Floor created with ${floorData.totalUnits} units`,
          metadata: {
            floorData: {
              floorNumber: floorData.floorNumber,
              floorName: floorData.floorName,
              floorType: floorData.floorType,
              totalUnits: floorData.totalUnits,
              buildingId: body.buildingId
            }
          }
        });
      }

      return successResponse(
        {
          floor: newFloor,
          building: {
            id: (updatedBuilding as any)._id,
            name: (updatedBuilding as any).name,
            totalFloors: (updatedBuilding as any).totalFloors,
            totalUnits: (updatedBuilding as any).totalUnits
          }
        },
        "Floor added successfully",
        201
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error adding floor", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to add floor", 500);
  }
};

// PUT: Update a floor
export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");
    const body = await req.json();

    if (!buildingId || !floorId) {
      return errorResponse("Building ID and Floor ID are required", 400);
    }

    if (!isValidObjectId(buildingId) || !isValidObjectId(floorId)) {
      return errorResponse("Invalid ID format", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const building = await Building.findById(buildingId).session(session);
      if (!building) {
        await session.abortTransaction();
        return errorResponse("Building not found", 404);
      }

      const floorIndex = (building as any).floors?.findIndex((f: any) => f._id?.toString() === floorId);
      if (floorIndex === -1 || floorIndex === undefined) {
        await session.abortTransaction();
        return errorResponse("Floor not found", 404);
      }

      // Update floor data
      const updateData: any = {};
      const allowedFields = [
        'floorName', 'floorType', 'totalUnits', 'totalBookedUnits',
        'unitTypes', 'units', 'floorPlan', 'images', 'amenities',
        'description', 'isActive'
      ];

      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updateData[`floors.${floorIndex}.${field}`] = body[field];
        }
      });

      const updatedBuilding = await Building.findByIdAndUpdate(
        buildingId,
        { $set: updateData },
        { new: true, session }
      );

      if (!updatedBuilding) {
        await session.abortTransaction();
        return errorResponse("Failed to update floor", 500);
      }

      await session.commitTransaction();

      const updatedFloor = (updatedBuilding as any).floors?.[floorIndex];

      // Log activity
      const userInfo = extractUserInfo(req, body);
      if (userInfo && updatedBuilding) {
        await logActivity({
          user: userInfo,
          clientId: body.clientId || 'unknown',
          projectId: (updatedBuilding as any).projectId?.toString() || 'unknown',
          projectName: 'Building Floor Management',
          sectionId: (updatedBuilding as any)._id.toString(),
          sectionName: (updatedBuilding as any).name || 'Unknown Building',
          activityType: "section_updated",
          category: "section",
          action: "update",
          description: `Updated ${updatedFloor?.floorName || 'floor'} in building "${(updatedBuilding as any).name}"`,
          message: `Floor details updated successfully`,
          metadata: {
            floorData: {
              floorId: floorId,
              floorName: updatedFloor?.floorName,
              buildingId: buildingId,
              updatedFields: Object.keys(updateData)
            }
          }
        });
      }

      return successResponse(
        {
          floor: updatedFloor,
          building: {
            id: (updatedBuilding as any)._id,
            name: (updatedBuilding as any).name,
            totalFloors: (updatedBuilding as any).totalFloors
          }
        },
        "Floor updated successfully"
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error updating floor", error);
    return errorResponse("Failed to update floor", 500);
  }
};

// DELETE: Remove a floor from a building
export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");

    if (!buildingId || !floorId) {
      return errorResponse("Building ID and Floor ID are required", 400);
    }

    if (!isValidObjectId(buildingId) || !isValidObjectId(floorId)) {
      return errorResponse("Invalid ID format", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const building = await Building.findById(buildingId).session(session);
      if (!building) {
        await session.abortTransaction();
        return errorResponse("Building not found", 404);
      }

      const floorToDelete = (building as any).floors?.find((f: any) => f._id?.toString() === floorId);
      if (!floorToDelete) {
        await session.abortTransaction();
        return errorResponse("Floor not found", 404);
      }

      // Remove floor and update building totals
      const updatedBuilding = await Building.findByIdAndUpdate(
        buildingId,
        { 
          $pull: { floors: { _id: floorId } },
          $inc: { 
            totalFloors: -1,
            totalUnits: -(floorToDelete.totalUnits || 0),
            totalBookedUnits: -(floorToDelete.totalBookedUnits || 0)
          }
        },
        { new: true, session }
      );

      if (!updatedBuilding) {
        await session.abortTransaction();
        return errorResponse("Failed to delete floor", 500);
      }

      await session.commitTransaction();

      // Log activity
      const userInfo = extractUserInfo(req, {});
      if (userInfo && updatedBuilding) {
        await logActivity({
          user: userInfo,
          clientId: 'unknown',
          projectId: (updatedBuilding as any).projectId?.toString() || 'unknown',
          projectName: 'Building Floor Management',
          sectionId: (updatedBuilding as any)._id.toString(),
          sectionName: (updatedBuilding as any).name || 'Unknown Building',
          activityType: "section_deleted",
          category: "section",
          action: "delete",
          description: `Deleted ${floorToDelete.floorName || 'floor'} from building "${(updatedBuilding as any).name}"`,
          message: `Floor and ${floorToDelete.totalUnits || 0} units removed`,
          metadata: {
            floorData: {
              floorId: floorId,
              floorName: floorToDelete.floorName,
              floorNumber: floorToDelete.floorNumber,
              buildingId: buildingId,
              unitsRemoved: floorToDelete.totalUnits || 0
            }
          }
        });
      }

      return successResponse(
        {
          deletedFloor: floorToDelete,
          building: {
            id: (updatedBuilding as any)._id,
            name: (updatedBuilding as any).name,
            totalFloors: (updatedBuilding as any).totalFloors,
            totalUnits: (updatedBuilding as any).totalUnits
          }
        },
        "Floor deleted successfully"
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error deleting floor", error);
    return errorResponse("Failed to delete floor", 500);
  }
};