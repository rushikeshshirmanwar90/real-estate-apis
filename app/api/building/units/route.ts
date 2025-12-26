import { Building } from "@/lib/models/Building";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";

// GET: Fetch units for a floor or building
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");
    const unitId = searchParams.get("unitId");
    const status = searchParams.get("status"); // Filter by status
    const type = searchParams.get("type"); // Filter by unit type

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

    // If specific unit requested
    if (unitId) {
      if (!isValidObjectId(unitId)) {
        return errorResponse("Invalid unit ID format", 400);
      }

      let foundUnit = null;
      let foundFloor = null;

      for (const floor of building.floors || []) {
        const unit = floor.units?.find(u => u._id?.toString() === unitId);
        if (unit) {
          foundUnit = unit;
          foundFloor = floor;
          break;
        }
      }

      if (!foundUnit) {
        return errorResponse("Unit not found", 404);
      }

      return successResponse(
        {
          unit: foundUnit,
          floor: {
            id: foundFloor?._id,
            floorNumber: foundFloor?.floorNumber,
            floorName: foundFloor?.floorName
          },
          building: {
            id: building._id,
            name: building.name
          }
        },
        "Unit retrieved successfully"
      );
    }

    let units: any[] = [];

    if (floorId) {
      // Get units for specific floor
      if (!isValidObjectId(floorId)) {
        return errorResponse("Invalid floor ID format", 400);
      }

      const floor = building.floors?.find(f => f._id?.toString() === floorId);
      if (!floor) {
        return errorResponse("Floor not found", 404);
      }

      units = (floor.units || []).map(unit => ({
        ...unit,
        floorInfo: {
          id: floor._id,
          floorNumber: floor.floorNumber,
          floorName: floor.floorName
        }
      }));
    } else {
      // Get all units in building
      for (const floor of building.floors || []) {
        const floorUnits = (floor.units || []).map(unit => ({
          ...unit,
          floorInfo: {
            id: floor._id,
            floorNumber: floor.floorNumber,
            floorName: floor.floorName
          }
        }));
        units.push(...floorUnits);
      }
    }

    // Apply filters
    if (status) {
      units = units.filter(unit => unit.status === status);
    }
    if (type) {
      units = units.filter(unit => unit.type === type);
    }

    // Sort units by floor number and unit number
    units.sort((a, b) => {
      const floorDiff = (a.floorInfo?.floorNumber || 0) - (b.floorInfo?.floorNumber || 0);
      if (floorDiff !== 0) return floorDiff;
      return (a.unitNumber || '').localeCompare(b.unitNumber || '');
    });

    // Generate summary statistics
    const summary = {
      total: units.length,
      available: units.filter(u => u.status === 'Available').length,
      booked: units.filter(u => u.status === 'Booked').length,
      sold: units.filter(u => u.status === 'Sold').length,
      reserved: units.filter(u => u.status === 'Reserved').length,
      underConstruction: units.filter(u => u.status === 'Under Construction').length,
      byType: {}
    };

    // Group by type
    units.forEach(unit => {
      if (!summary.byType[unit.type]) {
        summary.byType[unit.type] = 0;
      }
      summary.byType[unit.type]++;
    });

    return successResponse(
      {
        buildingId: building._id,
        buildingName: building.name,
        floorId: floorId,
        units: units,
        summary: summary
      },
      `Retrieved ${units.length} unit(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error fetching units", error);
    return errorResponse("Failed to fetch units", 500);
  }
};

// POST: Add a new unit to a floor
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

    if (!body.unitNumber || !body.type || !body.area) {
      return errorResponse("Unit number, type, and area are required", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const building = await Building.findById(body.buildingId).session(session);
      if (!building) {
        await session.abortTransaction();
        return errorResponse("Building not found", 404);
      }

      const floorIndex = building.floors?.findIndex(f => f._id?.toString() === body.floorId);
      if (floorIndex === -1 || floorIndex === undefined) {
        await session.abortTransaction();
        return errorResponse("Floor not found", 404);
      }

      const floor = building.floors![floorIndex];

      // Check if unit number already exists on this floor
      const existingUnit = floor.units?.find(u => u.unitNumber === body.unitNumber);
      if (existingUnit) {
        await session.abortTransaction();
        return errorResponse(`Unit ${body.unitNumber} already exists on this floor`, 400);
      }

      // Prepare unit data
      const unitData = {
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

      // Add unit to floor
      const updatedBuilding = await Building.findOneAndUpdate(
        { 
          _id: body.buildingId,
          "floors._id": body.floorId 
        },
        { 
          $push: { "floors.$.units": unitData },
          $inc: { 
            "floors.$.totalUnits": 1,
            "floors.$.totalBookedUnits": ['Booked', 'Sold', 'Reserved'].includes(unitData.status) ? 1 : 0,
            totalUnits: 1,
            totalBookedUnits: ['Booked', 'Sold', 'Reserved'].includes(unitData.status) ? 1 : 0
          }
        },
        { new: true, session }
      );

      if (!updatedBuilding) {
        await session.abortTransaction();
        return errorResponse("Failed to add unit", 500);
      }

      await session.commitTransaction();

      // Get the newly added unit
      const updatedFloor = updatedBuilding.floors?.find(f => f._id?.toString() === body.floorId);
      const newUnit = updatedFloor?.units?.[updatedFloor.units.length - 1];

      // Log activity
      const userInfo = extractUserInfo(req, body);
      if (userInfo && updatedBuilding) {
        await logActivity({
          user: userInfo,
          clientId: body.clientId || 'unknown',
          projectId: updatedBuilding.projectId?.toString() || 'unknown',
          projectName: 'Building Unit Management',
          sectionId: updatedBuilding._id.toString(),
          sectionName: updatedBuilding.name || 'Unknown Building',
          activityType: "unit_created",
          category: "section",
          action: "create",
          description: `Added unit ${unitData.unitNumber} (${unitData.type}) to ${updatedFloor?.floorName || 'floor'} in building "${updatedBuilding.name}"`,
          message: `Unit created with ${unitData.area} sq ft area`,
          metadata: {
            unitData: {
              unitNumber: unitData.unitNumber,
              type: unitData.type,
              area: unitData.area,
              status: unitData.status,
              floorId: body.floorId,
              buildingId: body.buildingId
            }
          }
        });
      }

      return successResponse(
        {
          unit: newUnit,
          floor: {
            id: updatedFloor?._id,
            floorName: updatedFloor?.floorName,
            totalUnits: updatedFloor?.totalUnits
          },
          building: {
            id: updatedBuilding._id,
            name: updatedBuilding.name,
            totalUnits: updatedBuilding.totalUnits
          }
        },
        "Unit added successfully",
        201
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error adding unit", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to add unit", 500);
  }
};

// PUT: Update a unit
export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");
    const unitId = searchParams.get("unitId");
    const body = await req.json();

    if (!buildingId || !floorId || !unitId) {
      return errorResponse("Building ID, Floor ID, and Unit ID are required", 400);
    }

    if (!isValidObjectId(buildingId) || !isValidObjectId(floorId) || !isValidObjectId(unitId)) {
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

      const floorIndex = building.floors?.findIndex(f => f._id?.toString() === floorId);
      if (floorIndex === -1 || floorIndex === undefined) {
        await session.abortTransaction();
        return errorResponse("Floor not found", 404);
      }

      const floor = building.floors![floorIndex];
      const unitIndex = floor.units?.findIndex(u => u._id?.toString() === unitId);
      if (unitIndex === -1 || unitIndex === undefined) {
        await session.abortTransaction();
        return errorResponse("Unit not found", 404);
      }

      const currentUnit = floor.units![unitIndex];
      const oldStatus = currentUnit.status;

      // Update unit data
      const updateData: any = {};
      const allowedFields = [
        'unitNumber', 'type', 'area', 'price', 'status',
        'customerInfo', 'bookingDate', 'description', 'images'
      ];

      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updateData[`floors.${floorIndex}.units.${unitIndex}.${field}`] = body[field];
        }
      });

      // Handle booking date
      if (body.bookingDate) {
        updateData[`floors.${floorIndex}.units.${unitIndex}.bookingDate`] = new Date(body.bookingDate);
      }

      const updatedBuilding = await Building.findByIdAndUpdate(
        buildingId,
        { $set: updateData },
        { new: true, session }
      );

      if (!updatedBuilding) {
        await session.abortTransaction();
        return errorResponse("Failed to update unit", 500);
      }

      // Update booked counts if status changed
      const newStatus = body.status || oldStatus;
      const wasBooked = ['Booked', 'Sold', 'Reserved'].includes(oldStatus);
      const isBooked = ['Booked', 'Sold', 'Reserved'].includes(newStatus);

      if (wasBooked !== isBooked) {
        const increment = isBooked ? 1 : -1;
        await Building.findOneAndUpdate(
          { 
            _id: buildingId,
            "floors._id": floorId 
          },
          { 
            $inc: { 
              "floors.$.totalBookedUnits": increment,
              totalBookedUnits: increment
            }
          },
          { session }
        );
      }

      await session.commitTransaction();

      const updatedFloor = updatedBuilding.floors?.find(f => f._id?.toString() === floorId);
      const updatedUnit = updatedFloor?.units?.find(u => u._id?.toString() === unitId);

      // Log activity
      const userInfo = extractUserInfo(req, body);
      if (userInfo && updatedBuilding) {
        await logActivity({
          user: userInfo,
          clientId: body.clientId || 'unknown',
          projectId: updatedBuilding.projectId?.toString() || 'unknown',
          projectName: 'Building Unit Management',
          sectionId: updatedBuilding._id.toString(),
          sectionName: updatedBuilding.name || 'Unknown Building',
          activityType: "unit_updated",
          category: "section",
          action: "update",
          description: `Updated unit ${updatedUnit?.unitNumber || 'unknown'} in ${updatedFloor?.floorName || 'floor'} of building "${updatedBuilding.name}"`,
          message: oldStatus !== newStatus ? `Status changed from ${oldStatus} to ${newStatus}` : 'Unit details updated',
          metadata: {
            unitData: {
              unitId: unitId,
              unitNumber: updatedUnit?.unitNumber,
              oldStatus: oldStatus,
              newStatus: newStatus,
              floorId: floorId,
              buildingId: buildingId,
              updatedFields: Object.keys(updateData)
            }
          }
        });
      }

      return successResponse(
        {
          unit: updatedUnit,
          floor: {
            id: updatedFloor?._id,
            floorName: updatedFloor?.floorName,
            totalBookedUnits: updatedFloor?.totalBookedUnits
          },
          building: {
            id: updatedBuilding._id,
            name: updatedBuilding.name,
            totalBookedUnits: updatedBuilding.totalBookedUnits
          }
        },
        "Unit updated successfully"
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error updating unit", error);
    return errorResponse("Failed to update unit", 500);
  }
};

// DELETE: Remove a unit from a floor
export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");
    const unitId = searchParams.get("unitId");

    if (!buildingId || !floorId || !unitId) {
      return errorResponse("Building ID, Floor ID, and Unit ID are required", 400);
    }

    if (!isValidObjectId(buildingId) || !isValidObjectId(floorId) || !isValidObjectId(unitId)) {
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

      const floor = building.floors?.find(f => f._id?.toString() === floorId);
      if (!floor) {
        await session.abortTransaction();
        return errorResponse("Floor not found", 404);
      }

      const unitToDelete = floor.units?.find(u => u._id?.toString() === unitId);
      if (!unitToDelete) {
        await session.abortTransaction();
        return errorResponse("Unit not found", 404);
      }

      const wasBooked = ['Booked', 'Sold', 'Reserved'].includes(unitToDelete.status);

      // Remove unit and update counts
      const updatedBuilding = await Building.findOneAndUpdate(
        { 
          _id: buildingId,
          "floors._id": floorId 
        },
        { 
          $pull: { "floors.$.units": { _id: unitId } },
          $inc: { 
            "floors.$.totalUnits": -1,
            "floors.$.totalBookedUnits": wasBooked ? -1 : 0,
            totalUnits: -1,
            totalBookedUnits: wasBooked ? -1 : 0
          }
        },
        { new: true, session }
      );

      if (!updatedBuilding) {
        await session.abortTransaction();
        return errorResponse("Failed to delete unit", 500);
      }

      await session.commitTransaction();

      const updatedFloor = updatedBuilding.floors?.find(f => f._id?.toString() === floorId);

      // Log activity
      const userInfo = extractUserInfo(req, {});
      if (userInfo && updatedBuilding) {
        await logActivity({
          user: userInfo,
          clientId: 'unknown',
          projectId: updatedBuilding.projectId?.toString() || 'unknown',
          projectName: 'Building Unit Management',
          sectionId: updatedBuilding._id.toString(),
          sectionName: updatedBuilding.name || 'Unknown Building',
          activityType: "unit_deleted",
          category: "section",
          action: "delete",
          description: `Deleted unit ${unitToDelete.unitNumber} from ${updatedFloor?.floorName || 'floor'} in building "${updatedBuilding.name}"`,
          message: `Unit removed (${unitToDelete.type}, ${unitToDelete.area} sq ft)`,
          metadata: {
            unitData: {
              unitId: unitId,
              unitNumber: unitToDelete.unitNumber,
              type: unitToDelete.type,
              area: unitToDelete.area,
              status: unitToDelete.status,
              floorId: floorId,
              buildingId: buildingId
            }
          }
        });
      }

      return successResponse(
        {
          deletedUnit: unitToDelete,
          floor: {
            id: updatedFloor?._id,
            floorName: updatedFloor?.floorName,
            totalUnits: updatedFloor?.totalUnits,
            totalBookedUnits: updatedFloor?.totalBookedUnits
          },
          building: {
            id: updatedBuilding._id,
            name: updatedBuilding.name,
            totalUnits: updatedBuilding.totalUnits,
            totalBookedUnits: updatedBuilding.totalBookedUnits
          }
        },
        "Unit deleted successfully"
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error deleting unit", error);
    return errorResponse("Failed to delete unit", 500);
  }
};