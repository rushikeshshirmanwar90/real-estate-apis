import connect from "@/lib/db";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { Projects } from "@/lib/models/Project";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { client } from "@/lib/redis";

// POST - Bulk operations for equipment
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const { operation, data, filters } = await req.json();

    if (!operation) {
      return errorResponse("Operation type is required", 400);
    }

    switch (operation) {
      case "create": {
        // Bulk create equipment entries
        if (!Array.isArray(data) || data.length === 0) {
          return errorResponse("Data array is required for bulk create", 400);
        }

        // Validate each entry
        for (const entry of data) {
          const requiredFields = ['type', 'category', 'quantity', 'perUnitCost', 'projectId', 'projectName', 'projectSectionId', 'projectSectionName'];
          for (const field of requiredFields) {
            if (!entry[field]) {
              return errorResponse(`${field} is required for all entries. Missing in entry: ${JSON.stringify(entry)}`, 400);
            }
          }

          if (!isValidObjectId(entry.projectId) || !isValidObjectId(entry.projectSectionId)) {
            return errorResponse(`Invalid ObjectId format in entries. ProjectId: ${entry.projectId}, ProjectSectionId: ${entry.projectSectionId}`, 400);
          }
          
          // Validate numeric fields
          if (typeof entry.quantity !== 'number' || entry.quantity <= 0) {
            return errorResponse(`Invalid quantity: ${entry.quantity}. Must be a positive number.`, 400);
          }
          
          if (typeof entry.perUnitCost !== 'number' || entry.perUnitCost < 0) {
            return errorResponse(`Invalid perUnitCost: ${entry.perUnitCost}. Must be a non-negative number.`, 400);
          }
        }

        console.log('Creating equipment entries:', data.length);
        
        // Calculate total cost for all equipment entries
        const totalEquipmentCost = data.reduce((sum, entry) => sum + (entry.quantity * entry.perUnitCost), 0);
        console.log('Total equipment cost to add to project spent:', totalEquipmentCost);
        
        // Create equipment entries
        const createdEquipment = await Equipment.insertMany(data);
        console.log('Successfully created equipment entries:', createdEquipment.length);
        
        // Update project spent field - get projectId from first entry (all should have same projectId)
        const projectId = data[0].projectId;
        if (totalEquipmentCost > 0) {
          console.log('Updating project spent field for projectId:', projectId);
          await Projects.findByIdAndUpdate(
            projectId,
            { $inc: { spent: totalEquipmentCost } },
            { new: true, runValidators: true }
          );
          console.log('Successfully updated project spent field');
        }
        
        // Invalidate cache for equipment queries
        const keysToDelete = await client.keys(`equipment:query:*`);
        if (keysToDelete.length > 0) {
          await client.del(...keysToDelete);
        }
        
        return successResponse(
          createdEquipment,
          `${createdEquipment.length} equipment entries created successfully`,
          201
        );
      }

      case "update": {
        // Bulk update equipment entries
        if (!filters || !data) {
          return errorResponse("Filters and update data are required for bulk update", 400);
        }

        const updateResult = await Equipment.updateMany(filters, { $set: data });
        
        // Invalidate cache for equipment queries
        const keysToDelete = await client.keys(`equipment:query:*`);
        if (keysToDelete.length > 0) {
          await client.del(...keysToDelete);
        }
        
        return successResponse(
          {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount
          },
          `${updateResult.modifiedCount} equipment entries updated successfully`
        );
      }

      case "delete": {
        // Bulk delete equipment entries
        if (!filters) {
          return errorResponse("Filters are required for bulk delete", 400);
        }

        // Get equipment entries before deleting to calculate total cost to subtract
        const equipmentToDelete = await Equipment.find(filters);
        const totalCostToSubtract = equipmentToDelete.reduce((sum, equipment) => {
          const equipmentCost = equipment.totalCost || (equipment.quantity * equipment.perUnitCost);
          return sum + equipmentCost;
        }, 0);

        // Group by projectId to update each project's spent amount
        const projectCosts = equipmentToDelete.reduce((acc, equipment) => {
          const projectId = equipment.projectId.toString();
          const equipmentCost = equipment.totalCost || (equipment.quantity * equipment.perUnitCost);
          acc[projectId] = (acc[projectId] || 0) + equipmentCost;
          return acc;
        }, {} as { [projectId: string]: number });

        const deleteResult = await Equipment.deleteMany(filters);

        // Update project spent amounts for each affected project
        if (deleteResult.deletedCount > 0) {
          for (const [projectId, costToSubtract] of Object.entries(projectCosts)) {
            try {
              await Projects.findByIdAndUpdate(
                projectId,
                { $inc: { spent: -costToSubtract } },
                { new: true }
              );
              console.log(`Updated project ${projectId} spent amount by -${costToSubtract}`);
            } catch (projectUpdateError) {
              console.error(`Failed to update project ${projectId} spent amount:`, projectUpdateError);
              // Continue with other projects even if one fails
            }
          }
        }

        // Invalidate cache for equipment queries
        const keysToDelete = await client.keys(`equipment:query:*`);
        if (keysToDelete.length > 0) {
          await client.del(...keysToDelete);
        }

        return successResponse(
          { deletedCount: deleteResult.deletedCount },
          `${deleteResult.deletedCount} equipment entries deleted successfully and project spent amounts updated`
        );
      }

      case "status-update": {
        // Bulk status update
        if (!filters || !data.status) {
          return errorResponse("Filters and status are required for bulk status update", 400);
        }

        const statusUpdateResult = await Equipment.updateMany(
          filters,
          { $set: { status: data.status, updatedBy: data.updatedBy } }
        );
        
        // Invalidate cache for equipment queries
        const keysToDelete = await client.keys(`equipment:query:*`);
        if (keysToDelete.length > 0) {
          await client.del(...keysToDelete);
        }
        
        return successResponse(
          {
            matchedCount: statusUpdateResult.matchedCount,
            modifiedCount: statusUpdateResult.modifiedCount
          },
          `${statusUpdateResult.modifiedCount} equipment entries status updated to ${data.status}`
        );
      }

      case "cost-update": {
        // Bulk cost recalculation
        if (!filters) {
          return errorResponse("Filters are required for bulk cost update", 400);
        }

        // Find equipment entries and recalculate costs
        const equipmentToUpdate = await Equipment.find(filters);
        const bulkOps = equipmentToUpdate.map(equipment => ({
          updateOne: {
            filter: { _id: equipment._id },
            update: {
              $set: {
                totalCost: equipment.quantity * equipment.perUnitCost,
                updatedAt: new Date()
              }
            }
          }
        }));

        if (bulkOps.length > 0) {
          const costUpdateResult = await Equipment.bulkWrite(bulkOps);
          
          // Invalidate cache for equipment queries
          const keysToDelete = await client.keys(`equipment:query:*`);
          if (keysToDelete.length > 0) {
            await client.del(...keysToDelete);
          }
          
          return successResponse(
            {
              matchedCount: costUpdateResult.matchedCount,
              modifiedCount: costUpdateResult.modifiedCount
            },
            `${costUpdateResult.modifiedCount} equipment costs recalculated successfully`
          );
        } else {
          return successResponse(
            { matchedCount: 0, modifiedCount: 0 },
            "No equipment entries found matching the criteria"
          );
        }
      }

      case "duplicate": {
        // Duplicate equipment entries to another entity
        if (!filters || !data.targetEntityId || !data.targetEntityType) {
          return errorResponse("Filters, targetEntityId, and targetEntityType are required for duplication", 400);
        }

        if (!isValidObjectId(data.targetEntityId)) {
          return errorResponse("Invalid target entity ID format", 400);
        }

        const equipmentToDuplicate = await Equipment.find(filters).lean();
        const duplicatedEquipment = equipmentToDuplicate.map(equipment => {
          const { _id, createdAt, updatedAt, ...equipmentData } = equipment;
          return {
            ...equipmentData,
            projectSectionId: data.targetEntityId,
            projectId: data.targetProjectId || equipment.projectId,
            addedBy: data.addedBy,
            notes: `Duplicated from ${equipment.projectSectionName || 'section'} ${equipment.projectSectionId}${equipment.notes ? ` - ${equipment.notes}` : ''}`
          };
        });

        if (duplicatedEquipment.length > 0) {
          const duplicateResult = await Equipment.insertMany(duplicatedEquipment);
          
          // Update target project's spent amount if duplicating to a different project
          if (data.targetProjectId && duplicatedEquipment.length > 0) {
            const totalDuplicatedCost = duplicatedEquipment.reduce((sum, equipment) => {
              const equipmentCost = equipment.totalCost || (equipment.quantity * equipment.perUnitCost);
              return sum + equipmentCost;
            }, 0);

            try {
              await Projects.findByIdAndUpdate(
                data.targetProjectId,
                { $inc: { spent: totalDuplicatedCost } },
                { new: true }
              );
              console.log(`Updated target project ${data.targetProjectId} spent amount by +${totalDuplicatedCost} for duplicated equipment`);
            } catch (projectUpdateError) {
              console.error(`Failed to update target project ${data.targetProjectId} spent amount:`, projectUpdateError);
            }
          }
          
          // Invalidate cache for equipment queries
          const keysToDelete = await client.keys(`equipment:query:*`);
          if (keysToDelete.length > 0) {
            await client.del(...keysToDelete);
          }
          
          return successResponse(
            duplicateResult,
            `${duplicateResult.length} equipment entries duplicated successfully`,
            201
          );
        } else {
          return successResponse(
            [],
            "No equipment entries found matching the criteria for duplication"
          );
        }
      }

      case "export": {
        // Export equipment data
        if (!filters) {
          return errorResponse("Filters are required for export", 400);
        }

        const exportData = await Equipment.find(filters)
          .populate('addedBy', 'firstName lastName email')
          .populate('updatedBy', 'firstName lastName email')
          .lean();

        return successResponse(
          exportData,
          `${exportData.length} equipment entries exported successfully`
        );
      }

      default:
        return errorResponse(
          "Invalid operation. Supported operations: create, update, delete, status-update, cost-update, duplicate, export",
          400
        );
    }

  } catch (error: unknown) {
    logger.error("Error in bulk equipment operation", error);

    // Provide more detailed error information
    if (error && typeof error === "object" && "name" in error) {
      if (error.name === "ValidationError") {
        const validationError = error as any;
        const errorDetails = Object.keys(validationError.errors || {}).map(field => ({
          field,
          message: validationError.errors[field]?.message || 'Validation failed'
        }));
        
        return errorResponse(
          `Validation failed: ${errorDetails.map(e => `${e.field}: ${e.message}`).join(', ')}`, 
          400, 
          { validationErrors: errorDetails }
        );
      }
      
      if (error.name === "MongoServerError" || error.name === "MongoError") {
        return errorResponse("Database error occurred", 500, { mongoError: (error as any).message });
      }
    }

    return errorResponse("Failed to perform bulk equipment operation", 500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};