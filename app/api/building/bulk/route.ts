import { Building } from "@/lib/models/Building";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";

// POST: Bulk operations for floors and units
export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const { operation, buildingId, data } = body;

    if (!buildingId || !operation) {
      return errorResponse("Building ID and operation are required", 400);
    }

    if (!isValidObjectId(buildingId)) {
      return errorResponse("Invalid building ID format", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const building = await Building.findById(buildingId).session(session);
      if (!building) {
        await session.abortTransaction();
        return errorResponse("Building not found", 404);
      }

      let result;

      switch (operation) {
        case 'createFloors':
          result = await bulkCreateFloors(building, data, session);
          break;
        case 'createUnits':
          result = await bulkCreateUnits(building, data, session);
          break;
        case 'updateUnits':
          result = await bulkUpdateUnits(building, data, session);
          break;
        case 'updateUnitStatus':
          result = await bulkUpdateUnitStatus(building, data, session);
          break;
        case 'generateUnits':
          result = await generateUnitsForFloor(building, data, session);
          break;
        default:
          await session.abortTransaction();
          return errorResponse("Invalid operation", 400);
      }

      await session.commitTransaction();

      // Log activity
      const userInfo = extractUserInfo(req, body);
      if (userInfo && building) {
        await logActivity({
          user: userInfo,
          clientId: body.clientId || 'unknown',
          projectId: (building as any).projectId?.toString() || 'unknown',
          projectName: 'Building Bulk Operations',
          sectionId: (building as any)._id.toString(),
          sectionName: (building as any).name || 'Unknown Building',
          activityType: "other",
          category: "section",
          action: "update",
          description: `Performed bulk operation "${operation}" on building "${(building as any).name}"`,
          message: `${(result as any).summary}`,
          metadata: {
            bulkOperation: {
              operation: operation,
              buildingId: buildingId,
              itemsProcessed: (result as any).processed || 0,
              itemsSuccessful: (result as any).successful || 0,
              itemsFailed: (result as any).failed || 0
            }
          }
        });
      }

      return successResponse(
        result,
        `Bulk operation "${operation}" completed successfully`,
        201
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error performing bulk operation", error);
    return errorResponse("Failed to perform bulk operation", 500);
  }
};

// Bulk create floors
async function bulkCreateFloors(building: any, data: any, session: any) {
  const { floors } = data;
  
  if (!Array.isArray(floors)) {
    throw new Error("Floors data must be an array");
  }

  const results: {
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{floorNumber: any; error: string}>;
    createdFloors: Array<{floorNumber: any; floorName: any; totalUnits: any}>;
    summary?: string;
  } = {
    processed: floors.length,
    successful: 0,
    failed: 0,
    errors: [],
    createdFloors: []
  };

  for (const floorData of floors) {
    try {
      // Validate floor data
      if (typeof floorData.floorNumber !== 'number') {
        throw new Error("Floor number is required and must be a number");
      }

      // Check if floor already exists
      const existingFloor = building.floors?.find((f: any) => f.floorNumber === floorData.floorNumber);
      if (existingFloor) {
        throw new Error(`Floor ${floorData.floorNumber} already exists`);
      }

      const newFloorData = {
        floorNumber: floorData.floorNumber,
        floorName: floorData.floorName || `Floor ${floorData.floorNumber}`,
        floorType: floorData.floorType || 'Residential',
        totalUnits: floorData.totalUnits || 0,
        totalBookedUnits: floorData.totalBookedUnits || 0,
        unitTypes: floorData.unitTypes || [],
        units: floorData.units || [],
        floorPlan: floorData.floorPlan || '',
        images: floorData.images || [],
        amenities: floorData.amenities || [],
        description: floorData.description || '',
        isActive: floorData.isActive !== undefined ? floorData.isActive : true,
      };

      // Add floor to building
      await Building.findByIdAndUpdate(
        building._id,
        { 
          $push: { floors: newFloorData },
          $inc: { 
            totalFloors: 1,
            totalUnits: newFloorData.totalUnits,
            totalBookedUnits: newFloorData.totalBookedUnits
          }
        },
        { session }
      );

      results.successful++;
      results.createdFloors.push({
        floorNumber: newFloorData.floorNumber,
        floorName: newFloorData.floorName,
        totalUnits: newFloorData.totalUnits
      });
    } catch (error) {
      results.failed++;
      results.errors.push({
        floorNumber: floorData.floorNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  results.summary = `Created ${results.successful} floors, ${results.failed} failed`;
  return results;
}

// Bulk create units
async function bulkCreateUnits(building: any, data: any, session: any) {
  const { floorId, units } = data;
  
  if (!floorId || !Array.isArray(units)) {
    throw new Error("Floor ID and units array are required");
  }

  const floorIndex = building.floors?.findIndex((f: any) => f._id?.toString() === floorId);
  if (floorIndex === -1 || floorIndex === undefined) {
    throw new Error("Floor not found");
  }

  const results: {
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{unitNumber: any; error: string}>;
    createdUnits: Array<{unitNumber: any; type: any; area: any; status: any}>;
    summary?: string;
  } = {
    processed: units.length,
    successful: 0,
    failed: 0,
    errors: [],
    createdUnits: []
  };

  for (const unitData of units) {
    try {
      // Validate unit data
      if (!unitData.unitNumber || !unitData.type || !unitData.area) {
        throw new Error("Unit number, type, and area are required");
      }

      // Check if unit already exists on this floor
      const floor = building.floors[floorIndex];
      const existingUnit = floor.units?.find((u: any) => u.unitNumber === unitData.unitNumber);
      if (existingUnit) {
        throw new Error(`Unit ${unitData.unitNumber} already exists on this floor`);
      }

      const newUnitData = {
        unitNumber: unitData.unitNumber,
        type: unitData.type,
        area: unitData.area,
        price: unitData.price || 0,
        status: unitData.status || 'Available',
        customerInfo: unitData.customerInfo || {},
        bookingDate: unitData.bookingDate ? new Date(unitData.bookingDate) : undefined,
        description: unitData.description || '',
        images: unitData.images || [],
      };

      // Add unit to floor
      await Building.findOneAndUpdate(
        { 
          _id: building._id,
          "floors._id": floorId 
        },
        { 
          $push: { "floors.$.units": newUnitData },
          $inc: { 
            "floors.$.totalUnits": 1,
            "floors.$.totalBookedUnits": ['Booked', 'Sold', 'Reserved'].includes(newUnitData.status) ? 1 : 0,
            totalUnits: 1,
            totalBookedUnits: ['Booked', 'Sold', 'Reserved'].includes(newUnitData.status) ? 1 : 0
          }
        },
        { session }
      );

      results.successful++;
      results.createdUnits.push({
        unitNumber: newUnitData.unitNumber,
        type: newUnitData.type,
        area: newUnitData.area,
        status: newUnitData.status
      });
    } catch (error) {
      results.failed++;
      results.errors.push({
        unitNumber: unitData.unitNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  results.summary = `Created ${results.successful} units, ${results.failed} failed`;
  return results;
}

// Bulk update units
async function bulkUpdateUnits(building: any, data: any, session: any) {
  const { updates } = data;
  
  if (!Array.isArray(updates)) {
    throw new Error("Updates data must be an array");
  }

  const results: {
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{unitId: any; error: string}>;
    updatedUnits: Array<{floorId: any; unitId: any; updatedFields: string[]}>;
    summary?: string;
  } = {
    processed: updates.length,
    successful: 0,
    failed: 0,
    errors: [],
    updatedUnits: []
  };

  for (const updateData of updates) {
    try {
      const { floorId, unitId, ...updateFields } = updateData;
      
      if (!floorId || !unitId) {
        throw new Error("Floor ID and Unit ID are required");
      }

      const floorIndex = building.floors?.findIndex((f: any) => f._id?.toString() === floorId);
      if (floorIndex === -1 || floorIndex === undefined) {
        throw new Error("Floor not found");
      }

      const floor = building.floors[floorIndex];
      const unitIndex = floor.units?.findIndex((u: any) => u._id?.toString() === unitId);
      if (unitIndex === -1 || unitIndex === undefined) {
        throw new Error("Unit not found");
      }

      // Prepare update data
      const updateQuery: any = {};
      const allowedFields = [
        'unitNumber', 'type', 'area', 'price', 'status',
        'customerInfo', 'bookingDate', 'description', 'images'
      ];

      allowedFields.forEach(field => {
        if (updateFields[field] !== undefined) {
          updateQuery[`floors.${floorIndex}.units.${unitIndex}.${field}`] = updateFields[field];
        }
      });

      if (Object.keys(updateQuery).length === 0) {
        throw new Error("No valid fields to update");
      }

      await Building.findByIdAndUpdate(
        building._id,
        { $set: updateQuery },
        { session }
      );

      results.successful++;
      results.updatedUnits.push({
        floorId: floorId,
        unitId: unitId,
        updatedFields: Object.keys(updateFields)
      });
    } catch (error) {
      results.failed++;
      results.errors.push({
        unitId: updateData.unitId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  results.summary = `Updated ${results.successful} units, ${results.failed} failed`;
  return results;
}

// Bulk update unit status
async function bulkUpdateUnitStatus(building: any, data: any, session: any) {
  const { unitIds, newStatus, customerInfo, bookingDate } = data;
  
  if (!Array.isArray(unitIds) || !newStatus) {
    throw new Error("Unit IDs array and new status are required");
  }

  const results: {
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{unitId: any; error: string}>;
    updatedUnits: Array<{unitId: any; unitNumber: any; oldStatus: any; newStatus: any; floorId: any}>;
    summary?: string;
  } = {
    processed: unitIds.length,
    successful: 0,
    failed: 0,
    errors: [],
    updatedUnits: []
  };

  for (const unitId of unitIds) {
    try {
      let unitFound = false;
      
      // Find the unit across all floors
      for (let floorIndex = 0; floorIndex < (building.floors?.length || 0); floorIndex++) {
        const floor = building.floors[floorIndex];
        const unitIndex = floor.units?.findIndex((u: any) => u._id?.toString() === unitId);
        
        if (unitIndex !== -1 && unitIndex !== undefined) {
          const currentUnit = floor.units[unitIndex];
          const oldStatus = currentUnit.status;
          
          // Prepare update data
          const updateQuery: any = {
            [`floors.${floorIndex}.units.${unitIndex}.status`]: newStatus
          };
          
          if (customerInfo) {
            updateQuery[`floors.${floorIndex}.units.${unitIndex}.customerInfo`] = customerInfo;
          }
          
          if (bookingDate) {
            updateQuery[`floors.${floorIndex}.units.${unitIndex}.bookingDate`] = new Date(bookingDate);
          }

          await Building.findByIdAndUpdate(
            building._id,
            { $set: updateQuery },
            { session }
          );

          // Update booked counts if status changed
          const wasBooked = ['Booked', 'Sold', 'Reserved'].includes(oldStatus);
          const isBooked = ['Booked', 'Sold', 'Reserved'].includes(newStatus);

          if (wasBooked !== isBooked) {
            const increment = isBooked ? 1 : -1;
            await Building.findOneAndUpdate(
              { 
                _id: building._id,
                "floors._id": floor._id 
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

          results.successful++;
          results.updatedUnits.push({
            unitId: unitId,
            unitNumber: currentUnit.unitNumber,
            oldStatus: oldStatus,
            newStatus: newStatus,
            floorId: floor._id
          });
          
          unitFound = true;
          break;
        }
      }
      
      if (!unitFound) {
        throw new Error("Unit not found");
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        unitId: unitId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  results.summary = `Updated status for ${results.successful} units, ${results.failed} failed`;
  return results;
}

// Generate units for a floor based on pattern
async function generateUnitsForFloor(building: any, data: any, session: any) {
  const { 
    floorId, 
    unitPattern, 
    startNumber = 1, 
    count, 
    unitType, 
    area, 
    price = 0,
    status = 'Available'
  } = data;
  
  if (!floorId || !unitPattern || !count || !unitType || !area) {
    throw new Error("Floor ID, unit pattern, count, unit type, and area are required");
  }

  const floorIndex = building.floors?.findIndex((f: any) => f._id?.toString() === floorId);
  if (floorIndex === -1 || floorIndex === undefined) {
    throw new Error("Floor not found");
  }

  const results: {
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{unitNumber: string; error: string}>;
    generatedUnits: Array<{unitNumber: any; type: any; area: any; status: any}>;
    summary?: string;
  } = {
    processed: count,
    successful: 0,
    failed: 0,
    errors: [],
    generatedUnits: []
  };

  for (let i = 0; i < count; i++) {
    try {
      const unitNumber = unitPattern.replace('{n}', (startNumber + i).toString().padStart(2, '0'));
      
      // Check if unit already exists
      const floor = building.floors[floorIndex];
      const existingUnit = floor.units?.find((u: any) => u.unitNumber === unitNumber);
      if (existingUnit) {
        throw new Error(`Unit ${unitNumber} already exists`);
      }

      const newUnitData = {
        unitNumber: unitNumber,
        type: unitType,
        area: area,
        price: price,
        status: status,
        customerInfo: {},
        description: `Auto-generated ${unitType} unit`,
        images: [],
      };

      // Add unit to floor
      await Building.findOneAndUpdate(
        { 
          _id: building._id,
          "floors._id": floorId 
        },
        { 
          $push: { "floors.$.units": newUnitData },
          $inc: { 
            "floors.$.totalUnits": 1,
            "floors.$.totalBookedUnits": ['Booked', 'Sold', 'Reserved'].includes(status) ? 1 : 0,
            totalUnits: 1,
            totalBookedUnits: ['Booked', 'Sold', 'Reserved'].includes(status) ? 1 : 0
          }
        },
        { session }
      );

      results.successful++;
      results.generatedUnits.push({
        unitNumber: unitNumber,
        type: unitType,
        area: area,
        status: status
      });
    } catch (error) {
      results.failed++;
      results.errors.push({
        unitNumber: `${unitPattern.replace('{n}', (startNumber + i).toString())}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  results.summary = `Generated ${results.successful} units, ${results.failed} failed`;
  return results;
}