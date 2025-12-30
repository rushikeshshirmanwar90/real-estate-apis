import { Building } from "@/lib/models/Building";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const body = await req.json();

    // Validate required fields
    if (!body.buildingId) {
      return errorResponse("Building ID is required", 400);
    }

    if (!body.floorId) {
      return errorResponse("Floor ID is required", 400);
    }

    if (!body.type) {
      return errorResponse("Unit type is required", 400);
    }

    if (!body.area || body.area <= 0) {
      return errorResponse("Valid unit area is required", 400);
    }

    if (!isValidObjectId(body.buildingId)) {
      return errorResponse("Invalid building ID format", 400);
    }

    if (!isValidObjectId(body.floorId)) {
      return errorResponse("Invalid floor ID format", 400);
    }

    // Validate unit type
    const validUnitTypes = ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'Studio', 'Shop', 'Office', 'Parking', 'Storage', 'Other'];
    if (!validUnitTypes.includes(body.type)) {
      return errorResponse("Invalid unit type", 400);
    }

    // Validate unit status
    const validStatuses = ['Available', 'Booked', 'Reserved'];
    if (body.status && !validStatuses.includes(body.status)) {
      return errorResponse("Invalid unit status", 400);
    }

    // Find the building
    const building = await Building.findById(body.buildingId);
    if (!building) {
      return errorResponse("Building not found", 404);
    }

    // Find the floor
    const floor = building.floors.id(body.floorId);
    if (!floor) {
      return errorResponse("Floor not found", 404);
    }

    // Check if floor is basement and prevent unit creation
    if (floor.floorName?.toLowerCase().includes('basement') || floor.floorNumber < 0) {
      return errorResponse("Units cannot be added to basement floors", 400);
    }

    // Check if this is bulk creation or single unit creation
    const isBulkCreation = body.unitCount && body.unitCount > 1;
    const unitCount = isBulkCreation ? parseInt(body.unitCount) : 1;

    if (isBulkCreation) {
      // Bulk unit creation
      if (unitCount <= 0 || unitCount > 100) {
        return errorResponse("Unit count must be between 1 and 100", 400);
      }

      // Get the next sequential number for this floor
      const existingUnits = floor.units || [];
      let nextNumber = existingUnits.length + 1;

      // Generate floor-based unit numbers
      // Ground floor (0): 001, 002, 003...
      // First floor (1): 101, 102, 103...
      // Second floor (2): 201, 202, 203...
      const floorPrefix = floor.floorNumber <= 0 ? 0 : floor.floorNumber;

      const newUnits = [];
      for (let i = 0; i < unitCount; i++) {
        let unitNumber;
        if (floor.floorNumber <= 0) {
          // Ground floor and basement: 001, 002, 003...
          unitNumber = nextNumber.toString().padStart(3, '0');
        } else {
          // Other floors: 101, 102, 103... (1st floor), 201, 202, 203... (2nd floor)
          const unitSequence = nextNumber.toString().padStart(2, '0');
          unitNumber = `${floorPrefix}${unitSequence}`;
        }
        
        const newUnit = {
          _id: new mongoose.Types.ObjectId(),
          unitNumber: unitNumber,
          type: body.type,
          area: Number(body.area),
          status: 'Available', // Bulk created units are always available initially
          customerInfo: {
            name: '',
            phone: '',
            email: ''
          },
          bookingDate: undefined,
          description: body.description || '',
          images: body.images || []
        };

        newUnits.push(newUnit);
        nextNumber++;
      }

      // Add all units to floor
      floor.units.push(...newUnits);

      // Update floor's total units count
      floor.totalUnits = floor.units.length;

      // Update floor's booked units count (should be same as before since new units are Available)
      floor.totalBookedUnits = floor.units.filter((unit: any) => unit.status === 'Booked').length;

      // Update building's total booked units count
      building.totalBookedUnits = building.floors.reduce((total: number, f: any) => {
        return total + (f.totalBookedUnits || 0);
      }, 0);

      // Save the building
      await building.save();

      logger.info(`${unitCount} units of type ${body.type} added to floor ${floor.floorName || floor.floorNumber} in building ${building._id}`);

      return successResponse(
        {
          units: newUnits,
          count: unitCount,
          floor: {
            _id: floor._id,
            floorNumber: floor.floorNumber,
            floorName: floor.floorName,
            totalUnits: floor.totalUnits,
            totalBookedUnits: floor.totalBookedUnits
          }
        },
        `${unitCount} units added successfully`,
        201
      );
    } else {
      // Single unit creation (existing functionality)
      if (!body.unitNumber) {
        return errorResponse("Unit number is required for single unit creation", 400);
      }

      // Check if unit number already exists on this floor
      const existingUnit = floor.units.find((unit: any) => unit.unitNumber === body.unitNumber.trim());
      if (existingUnit) {
        return errorResponse("Unit number already exists on this floor", 400);
      }

      // Create new unit
      const newUnit = {
        _id: new mongoose.Types.ObjectId(),
        unitNumber: body.unitNumber.trim(),
        type: body.type,
        area: Number(body.area),
        status: body.status || 'Available',
        customerInfo: {
          name: body.customerInfo?.name || '',
          phone: body.customerInfo?.phone || '',
          email: body.customerInfo?.email || ''
        },
        bookingDate: body.status === 'Booked' ? new Date() : undefined,
        description: body.description || '',
        images: body.images || []
      };

      // Add unit to floor
      floor.units.push(newUnit);

      // Update floor's total units count
      floor.totalUnits = floor.units.length;

      // Update floor's booked units count
      floor.totalBookedUnits = floor.units.filter((unit: any) => unit.status === 'Booked').length;

      // Update building's total booked units count
      building.totalBookedUnits = building.floors.reduce((total: number, f: any) => {
        return total + (f.totalBookedUnits || 0);
      }, 0);

      // Save the building
      await building.save();

      logger.info(`Unit ${newUnit.unitNumber} added to floor ${floor.floorName || floor.floorNumber} in building ${building._id}`);

      return successResponse(
        {
          unit: newUnit,
          floor: {
            _id: floor._id,
            floorNumber: floor.floorNumber,
            floorName: floor.floorName,
            totalUnits: floor.totalUnits,
            totalBookedUnits: floor.totalBookedUnits
          }
        },
        "Unit added successfully",
        201
      );
    }
  } catch (error: unknown) {
    logger.error("Error adding unit(s)", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to add unit(s)", 500);
  }
};

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

    // Find the building
    const building = await Building.findById(buildingId);
    if (!building) {
      return errorResponse("Building not found", 404);
    }

    // Find the floor
    const floor = building.floors.id(floorId);
    if (!floor) {
      return errorResponse("Floor not found", 404);
    }

    // Find and remove the unit
    const unitIndex = floor.units.findIndex((unit: any) => unit._id.toString() === unitId);
    if (unitIndex === -1) {
      return errorResponse("Unit not found", 404);
    }

    const deletedUnit = floor.units[unitIndex];
    floor.units.splice(unitIndex, 1);

    // Update floor's total units count
    floor.totalUnits = floor.units.length;

    // Update floor's booked units count
    floor.totalBookedUnits = floor.units.filter((unit: any) => unit.status === 'Booked').length;

    // Update building's total booked units count
    building.totalBookedUnits = building.floors.reduce((total: number, f: any) => {
      return total + (f.totalBookedUnits || 0);
    }, 0);

    // Save the building
    await building.save();

    logger.info(`Unit ${deletedUnit.unitNumber} deleted from floor ${floor.floorName || floor.floorNumber} in building ${building._id}`);

    return successResponse(
      {
        deletedUnit,
        floor: {
          _id: floor._id,
          floorNumber: floor.floorNumber,
          floorName: floor.floorName,
          totalUnits: floor.totalUnits,
          totalBookedUnits: floor.totalBookedUnits
        }
      },
      "Unit deleted successfully"
    );
  } catch (error: unknown) {
    logger.error("Error deleting unit", error);
    return errorResponse("Failed to delete unit", 500);
  }
};

export const PUT = async (req: NextRequest) => {
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

    const body = await req.json();

    // Find the building
    const building = await Building.findById(buildingId);
    if (!building) {
      return errorResponse("Building not found", 404);
    }

    // Find the floor
    const floor = building.floors.id(floorId);
    if (!floor) {
      return errorResponse("Floor not found", 404);
    }

    // Find the unit
    const unit = floor.units.id(unitId);
    if (!unit) {
      return errorResponse("Unit not found", 404);
    }

    // Validate unit type if provided
    if (body.type) {
      const validUnitTypes = ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'Studio', 'Shop', 'Office', 'Parking', 'Storage', 'Other'];
      if (!validUnitTypes.includes(body.type)) {
        return errorResponse("Invalid unit type", 400);
      }
    }

    // Validate unit status if provided
    if (body.status) {
      const validStatuses = ['Available', 'Booked', 'Reserved'];
      if (!validStatuses.includes(body.status)) {
        return errorResponse("Invalid unit status", 400);
      }
    }

    // Check if unit number already exists on this floor (excluding current unit)
    if (body.unitNumber && body.unitNumber.trim() !== unit.unitNumber) {
      const existingUnit = floor.units.find((u: any) => 
        u.unitNumber === body.unitNumber.trim() && u._id.toString() !== unitId
      );
      if (existingUnit) {
        return errorResponse("Unit number already exists on this floor", 400);
      }
    }

    // Update unit fields
    if (body.unitNumber) unit.unitNumber = body.unitNumber.trim();
    if (body.type) unit.type = body.type;
    if (body.area) unit.area = Number(body.area);
    if (body.status) {
      unit.status = body.status;
      // Set booking date if status is changed to Booked
      if (body.status === 'Booked' && unit.status !== 'Booked') {
        unit.bookingDate = new Date();
      }
    }
    if (body.description !== undefined) unit.description = body.description;
    if (body.customerInfo) {
      unit.customerInfo = {
        name: body.customerInfo.name || '',
        phone: body.customerInfo.phone || '',
        email: body.customerInfo.email || ''
      };
    }
    if (body.images) unit.images = body.images;

    // Update floor's booked units count
    floor.totalBookedUnits = floor.units.filter((u: any) => u.status === 'Booked').length;

    // Update building's total booked units count
    building.totalBookedUnits = building.floors.reduce((total: number, f: any) => {
      return total + (f.totalBookedUnits || 0);
    }, 0);

    // Save the building
    await building.save();

    logger.info(`Unit ${unit.unitNumber} updated in floor ${floor.floorName || floor.floorNumber} in building ${building._id}`);

    return successResponse(
      {
        unit,
        floor: {
          _id: floor._id,
          floorNumber: floor.floorNumber,
          floorName: floor.floorName,
          totalUnits: floor.totalUnits,
          totalBookedUnits: floor.totalBookedUnits
        }
      },
      "Unit updated successfully"
    );
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