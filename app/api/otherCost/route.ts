import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { Building } from "@/lib/models/Building";
import { OtherSection } from "@/lib/models/OtherSection";
import { RowHouse } from "@/lib/models/RowHouse";
import { OtherCost } from "@/lib/models/Xsite/OtherCost";
import { OtherCostActivity } from "@/lib/models/Xsite/otherCost-activity";
import {
  safeRedisGetCache,
  safeRedisSetCache,
  invalidateCachePattern,
  safeRedisDelCache,
} from "@/lib/utils/redis-helpers";

import { checkValidClient } from "@/lib/auth";
import { errorResponse } from "@/lib/utils/api-response";
import { extractUserInfo } from "@/lib/utils/activity-logger";

// POST - Add other cost entries
export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();

    const body = await req.json();
    console.log('📋 OtherCost API - Request body:', JSON.stringify(body, null, 2));

    const {
      otherCostEntries,
      entityType, // 'project', 'building', 'otherSection', 'rowHouse'
      entityId,
      miniSectionId,
      sectionId,
      addedBy, // Optional user ID who added the cost
    } = body;

    // Validation
    if (!otherCostEntries || !Array.isArray(otherCostEntries) || otherCostEntries.length === 0) {
      return NextResponse.json(
        { success: false, message: "Other cost entries are required" },
        { status: 400 }
      );
    }

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, message: "Entity type and ID are required" },
        { status: 400 }
      );
    }

    // Validate entity type
    const validEntityTypes = ['project', 'building', 'otherSection', 'rowHouse'];
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { success: false, message: "Invalid entity type" },
        { status: 400 }
      );
    }

    // Get the entity to validate it exists and get projectId
    const entity = await getEntityById(entityType, entityId);
    if (!entity) {
      return NextResponse.json(
        { success: false, message: `${entityType} not found` },
        { status: 404 }
      );
    }

    // Determine projectId
    let projectId;
    if (entityType === 'project') {
      projectId = entityId;
    } else {
      projectId = entity.projectId;
      if (!projectId) {
        return NextResponse.json(
          { success: false, message: "Project ID not found for this entity" },
          { status: 400 }
        );
      }
    }

    // Validate other cost entries structure
    for (const entry of otherCostEntries) {
      // Accept `name` or `title` for the cost name; accept `unitCost`, `amount`, or `totalCost` for the value
      const hasName = !!(entry.name || entry.title);
      const hasAmount = entry.unitCost !== undefined || entry.amount !== undefined || entry.totalCost !== undefined;

      if (!hasName || !hasAmount) {
        return NextResponse.json(
          { success: false, message: "Each entry needs a name (or title) and an amount (unitCost/amount/totalCost)" },
          { status: 400 }
        );
      }

      const amountValue = entry.amount ?? entry.totalCost ?? entry.unitCost;
      if (amountValue < 0) {
        return NextResponse.json(
          { success: false, message: "Cost amount cannot be negative" },
          { status: 400 }
        );
      }
    }

    // Calculate total cost of all other cost entries
    // The schema field is `amount` (= unitCost * quantity). Support all naming variants.
    const totalOtherCost = otherCostEntries.reduce((sum, entry) => {
      const quantity = entry.quantity || 1;
      const amount = entry.amount ?? entry.totalCost ?? (entry.unitCost ? quantity * entry.unitCost : 0);
      return sum + amount;
    }, 0);

    console.log('💰 Total other cost to add:', totalOtherCost);

    // Map entityType → entityModel once
    const entityModelMap: Record<string, string> = {
      project: 'Projects',
      building: 'Building',
      otherSection: 'OtherSection',
      rowHouse: 'RowHouse',
    };
    const entityModel = entityModelMap[entityType] || 'Projects';

    // Prepare entries mapped to the actual OtherCostSchema fields:
    // Schema fields: title (required), amount (required), description, sectionId,
    //                addedAt, status (enum: active|cancelled), addedBy, addedByName, updatedBy
    //                + entityType, entityId, entityModel, projectId (standalone only)
    const processedOtherCostEntries = otherCostEntries.map(entry => {
      const quantity = entry.quantity || 1;
      const amount = entry.amount ?? entry.totalCost ?? (entry.unitCost ? quantity * entry.unitCost : 0);

      return {
        // ── Schema-matched fields ──────────────────────────────────────────
        title: entry.name || entry.title,   // form sends `name`, schema field is `title`
        amount,                              // form sends `unitCost`, schema field is `amount`
        description: entry.description || '',
        sectionId: sectionId || entry.sectionId || undefined,
        addedAt: new Date(),
        status: 'active',                    // schema enum: ['active', 'cancelled']
        addedBy: addedBy || undefined,
        addedByName: body.user?.fullName || undefined,
        // ── Standalone-only fields ─────────────────────────────────────────
        entityType,
        entityId,
        entityModel,
        projectId,
      };
    });

    console.log('🔍 Processed other cost entries:', JSON.stringify(processedOtherCostEntries, null, 2));

    // Create standalone OtherCost documents
    const createdOtherCostEntries = await OtherCost.insertMany(processedOtherCostEntries);
    console.log('✅ Created standalone other cost entries:', createdOtherCostEntries.length);

    // Embedded entries — only EmbeddedOtherCostSchema fields
    // (no entityType/entityId/entityModel/projectId)
    const embeddedOtherCostEntries = processedOtherCostEntries.map(entry => ({
      title: entry.title,
      amount: entry.amount,
      description: entry.description,
      sectionId: entry.sectionId,
      addedAt: entry.addedAt,
      status: entry.status,
      addedBy: entry.addedBy ? String(entry.addedBy) : undefined,
      addedByName: entry.addedByName,
    }));

    console.log('🔍 Embedded other cost entries:', JSON.stringify(embeddedOtherCostEntries, null, 2));

    let updatedEntity;
    let entityName = '';

    // Handle different entity types - add to embedded arrays
    switch (entityType) {
      case 'project':
        // Add other cost entries and update spent amount
        updatedEntity = await Projects.findByIdAndUpdate(
          entityId,
          {
            $push: { OtherCosts: { $each: embeddedOtherCostEntries } },
            $inc: { spent: totalOtherCost }
          },
          { new: true, runValidators: true }
        );
        entityName = 'Project';
        break;

      case 'building':
        // Add other cost entries to building
        updatedEntity = await Building.findByIdAndUpdate(
          entityId,
          {
            $push: { OtherCosts: { $each: embeddedOtherCostEntries } }
          },
          { new: true, runValidators: true }
        );

        // Also update the parent project's spent amount
        await Projects.findByIdAndUpdate(
          projectId,
          { $inc: { spent: totalOtherCost } },
          { runValidators: true }
        );
        entityName = 'Building';
        break;

      case 'otherSection':
        // Add other cost entries to other section
        updatedEntity = await OtherSection.findByIdAndUpdate(
          entityId,
          {
            $push: { OtherCosts: { $each: embeddedOtherCostEntries } }
          },
          { new: true, runValidators: true }
        );

        // Also update the parent project's spent amount
        await Projects.findByIdAndUpdate(
          projectId,
          { $inc: { spent: totalOtherCost } },
          { runValidators: true }
        );
        entityName = 'Other Section';
        break;

      case 'rowHouse':
        // Add other cost entries to row house
        updatedEntity = await RowHouse.findByIdAndUpdate(
          entityId,
          {
            $push: { OtherCosts: { $each: embeddedOtherCostEntries } }
          },
          { new: true, runValidators: true }
        );

        // Also update the parent project's spent amount
        await Projects.findByIdAndUpdate(
          projectId,
          { $inc: { spent: totalOtherCost } },
          { runValidators: true }
        );
        entityName = 'Row House';
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Invalid entity type" },
          { status: 400 }
        );
    }

    if (!updatedEntity) {
      // Rollback standalone other cost entries if entity update failed
      await OtherCost.deleteMany({ _id: { $in: createdOtherCostEntries.map(entry => entry._id) } });
      return NextResponse.json(
        { success: false, message: `Failed to update ${entityName.toLowerCase()}` },
        { status: 500 }
      );
    }

    console.log('✅ Other cost entries added successfully');
    console.log('📊 Updated entity:', entityName);
    console.log('💰 Total cost added to spent:', totalOtherCost);

    // Invalidate cache for this entity and project
    await invalidateCachePattern(`otherCost:${entityType}:${entityId}:*`);
    if (entityType !== 'project' && projectId) {
      await invalidateCachePattern(`otherCost:project:${projectId}:*`);
    }
    // Invalidate project cache
    await safeRedisDelCache(`project:${projectId}`);
    await invalidateCachePattern(`projects:*`);

    // Log an OtherCostActivity so it appears in the notification feed
    const userInfo = extractUserInfo(req, body);
    if (userInfo) {
      try {
        // Get project name for better activity description
        const project = await Projects.findById(projectId).select('name').lean();
        let sectionName: string | undefined = undefined;

        // Get section name if applicable
        if (updatedEntity && entityType !== 'project' && updatedEntity.name) {
          sectionName = updatedEntity.name;
        }

        await OtherCostActivity.create({
          user: {
            userId: userInfo.userId,
            fullName: userInfo.fullName,
          },
          clientId: body.clientId || 'unknown',
          projectId: String(projectId),
          projectName: project && !Array.isArray(project) ? project.name : undefined,
          sectionName,
          miniSectionName: body.miniSectionName,
          otherCosts: processedOtherCostEntries.map(entry => ({
            name: entry.title,          // OtherCostItemSchema uses `name`
            category: 'Miscellaneous',  // required in OtherCostItemSchema
            description: entry.description,
            quantity: 1,
            unit: 'item',
            unitCost: entry.amount,
            totalCost: entry.amount,
            status: 'pending',          // OtherCostItemSchema enum: pending|approved|paid
            sectionId: entry.sectionId,
            addedAt: entry.addedAt,
          })),
          message: `Total cost: ₹${totalOtherCost.toLocaleString('en-IN')}`,
          activity: 'added',
          date: new Date().toISOString(),
        });

        // Invalidate the activity feed cache so the new entry shows immediately
        await invalidateCachePattern(`otherCostActivity:*`);

        console.log('✅ Other cost activity logged successfully');
      } catch (activityError) {
        console.error('❌ Failed to log other cost activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Other cost entries added successfully to ${entityName}`,
      data: {
        entityType,
        entityId,
        projectId,
        otherCostEntriesAdded: processedOtherCostEntries.length,
        totalCostAdded: totalOtherCost,
        standaloneOtherCostIds: createdOtherCostEntries.map(entry => entry._id),
        updatedEntity: {
          id: updatedEntity._id,
          name: updatedEntity.name,
          totalOtherCosts: updatedEntity.OtherCosts?.length || 0,
          ...(entityType === 'project' && { spent: updatedEntity.spent })
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error in other cost API:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: validationErrors
        },
        { status: 400 }
      );
    }

    // Handle cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, message: "Invalid entity ID format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
};

// GET - Retrieve other cost entries
export const GET = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const projectId = searchParams.get('projectId');
    const miniSectionId = searchParams.get('miniSectionId');
    const sectionId = searchParams.get('sectionId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const useStandalone = searchParams.get('useStandalone') === 'true';
    const addedBy = searchParams.get('addedBy');

    // Check cache first
    const cacheKey = `otherCost:${entityType || 'all'}:${entityId || 'all'}:${projectId || 'all'}:${sectionId || 'all'}:${miniSectionId || 'all'}:${category || 'all'}:${status || 'all'}:${useStandalone}:${addedBy || 'all'}`;
    const cachedData = await safeRedisGetCache(cacheKey);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
      return NextResponse.json(cacheValue, { status: 200 });
    }

    // Build query
    const query: any = {};

    if (projectId) query.projectId = projectId;
    if (addedBy) query.addedBy = addedBy;
    if (entityType && entityId) {
      query.entityType = entityType;
      query.entityId = entityId;
    }
    if (sectionId) query.sectionId = sectionId;
    if (miniSectionId) query.miniSectionId = miniSectionId;
    if (category) query.category = category;
    if (status) query.status = status;

    let otherCostEntries = [];
    let entity = null;

    if (useStandalone || (!entityType || !entityId)) {
      // Use standalone OtherCost model
      otherCostEntries = await OtherCost.find(query)
        .populate('entityId', 'name')
        .populate('projectId', 'name budget spent')
        .sort({ createdAt: -1 });

      if (entityType && entityId) {
        entity = await getEntityById(entityType, entityId);
      }
    } else {
      // Use embedded other cost entries from entity
      entity = await getEntityById(entityType, entityId);
      if (!entity) {
        return NextResponse.json(
          { success: false, message: `${entityType} not found` },
          { status: 404 }
        );
      }

      otherCostEntries = entity.OtherCosts || [];

      if (sectionId) {
        otherCostEntries = otherCostEntries.filter((oc: any) => oc.sectionId === sectionId);
      }
      if (miniSectionId) {
        otherCostEntries = otherCostEntries.filter((oc: any) => oc.miniSectionId === miniSectionId);
      }
      if (category) {
        otherCostEntries = otherCostEntries.filter((oc: any) => oc.category === category);
      }
      if (status) {
        otherCostEntries = otherCostEntries.filter((oc: any) => oc.status === status);
      }
    }

    // Calculate summary statistics
    const totalOtherCost = otherCostEntries.reduce((sum: number, oc: any) => sum + (oc.totalCost || 0), 0);

    // Group by category for summary
    const categoryStats = otherCostEntries.reduce((acc: any, oc: any) => {
      if (!acc[oc.category]) {
        acc[oc.category] = {
          totalCost: 0,
          entries: 0
        };
      }
      acc[oc.category].totalCost += oc.totalCost || 0;
      acc[oc.category].entries += 1;
      return acc;
    }, {});

    const responseData = {
      success: true,
      data: {
        entity: entity ? {
          id: entity._id,
          name: entity.name,
          type: entityType,
          ...(entityType === 'project' && {
            spent: entity.spent,
            budget: entity.budget
          })
        } : null,
        otherCostEntries,
        summary: {
          totalEntries: otherCostEntries.length,
          totalCost: totalOtherCost,
          categoryStats
        },
        filters: {
          entityType,
          entityId,
          projectId,
          miniSectionId,
          category,
          status,
          useStandalone
        }
      }
    };

    // Cache the response with 24-hour expiration
    await safeRedisSetCache(cacheKey, JSON.stringify(responseData), 'EX', 86400);

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('❌ Error retrieving other cost entries:', error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve other cost entries",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
};

// PUT - Update other cost entry
export const PUT = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }

  try {
    await connect();

    const body = await req.json();
    const {
      entityType,
      entityId,
      otherCostId,
      updates
    } = body;

    if (!entityType || !entityId || !otherCostId || !updates) {
      return NextResponse.json(
        { success: false, message: "Entity type, entity ID, other cost ID, and updates are required" },
        { status: 400 }
      );
    }

    // Calculate new total cost if quantity or unitCost is being updated
    let currentEntity: any = null;
    let currentOtherCost: any = null;

    currentEntity = await getEntityById(entityType, entityId);
    if (!currentEntity) {
      return NextResponse.json(
        { success: false, message: `${entityType} not found` },
        { status: 404 }
      );
    }

    currentOtherCost = currentEntity.OtherCosts?.find((oc: any) => oc._id.toString() === otherCostId);
    if (!currentOtherCost) {
      return NextResponse.json(
        { success: false, message: "Other cost entry not found" },
        { status: 404 }
      );
    }

    if (updates.quantity !== undefined || updates.unitCost !== undefined) {
      const newQuantity = updates.quantity !== undefined ? updates.quantity : currentOtherCost.quantity;
      const newUnitCost = updates.unitCost !== undefined ? updates.unitCost : currentOtherCost.unitCost;
      const oldTotalCost = currentOtherCost.totalCost;
      const newTotalCost = newQuantity * newUnitCost;

      updates.totalCost = newTotalCost;

      // Update spent amount in project
      const costDifference = newTotalCost - oldTotalCost;
      if (costDifference !== 0) {
        const projectIdToUpdate = entityType === 'project' ? entityId : currentEntity.projectId;
        if (projectIdToUpdate) {
          await Projects.findByIdAndUpdate(projectIdToUpdate, { $inc: { spent: costDifference } });
        }
      }
    }

    // Update the other cost entry
    const updateQuery: any = {};
    Object.keys(updates).forEach(key => {
      updateQuery[`OtherCosts.$.${key}`] = updates[key];
    });

    let updatedEntity;
    switch (entityType) {
      case 'project':
        updatedEntity = await Projects.findOneAndUpdate(
          { _id: entityId, 'OtherCosts._id': otherCostId },
          { $set: updateQuery },
          { new: true, runValidators: true }
        );
        break;
      case 'building':
        updatedEntity = await Building.findOneAndUpdate(
          { _id: entityId, 'OtherCosts._id': otherCostId },
          { $set: updateQuery },
          { new: true, runValidators: true }
        );
        break;
      case 'otherSection':
        updatedEntity = await OtherSection.findOneAndUpdate(
          { _id: entityId, 'OtherCosts._id': otherCostId },
          { $set: updateQuery },
          { new: true, runValidators: true }
        );
        break;
      case 'rowHouse':
        updatedEntity = await RowHouse.findOneAndUpdate(
          { _id: entityId, 'OtherCosts._id': otherCostId },
          { $set: updateQuery },
          { new: true, runValidators: true }
        );
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid entity type" },
          { status: 400 }
        );
    }

    if (!updatedEntity) {
      return NextResponse.json(
        { success: false, message: "Failed to update other cost entry" },
        { status: 500 }
      );
    }

    // Update standalone OtherCost entry to keep it in sync with embedded entry
    try {
      await OtherCost.findOneAndUpdate(
        {
          entityType,
          entityId,
          name: currentOtherCost.name,
          category: currentOtherCost.category,
          quantity: currentOtherCost.quantity,
          unitCost: currentOtherCost.unitCost,
          totalCost: currentOtherCost.totalCost
        },
        { $set: updates }
      );
    } catch (standaloneError) {
      console.error("⚠️ Failed to update standalone other cost entry in PUT:", standaloneError);
    }

    // Invalidate cache for this entity
    await invalidateCachePattern(`otherCost:${entityType}:${entityId}:*`);

    return NextResponse.json({
      success: true,
      message: "Other cost entry updated successfully",
      data: {
        entityType,
        entityId,
        otherCostId,
        updatedOtherCost: updatedEntity.OtherCosts?.find((oc: any) => oc._id.toString() === otherCostId)
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating other cost entry:', error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update other cost entry",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
};

// DELETE - Remove other cost entry
export const DELETE = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const otherCostId = searchParams.get('otherCostId');

    if (!entityType || !entityId || !otherCostId) {
      return NextResponse.json(
        { success: false, message: "Entity type, entity ID, and other cost ID are required" },
        { status: 400 }
      );
    }

    // Get current entity to find the other cost entry cost
    const currentEntity = await getEntityById(entityType, entityId);
    if (!currentEntity) {
      return NextResponse.json(
        { success: false, message: `${entityType} not found` },
        { status: 404 }
      );
    }

    const otherCostToDelete = currentEntity.OtherCosts?.find((oc: any) => oc._id.toString() === otherCostId);
    if (!otherCostToDelete) {
      return NextResponse.json(
        { success: false, message: "Other cost entry not found" },
        { status: 404 }
      );
    }

    const otherCost = otherCostToDelete.totalCost || 0;

    // Delete corresponding standalone other cost entry
    await OtherCost.deleteOne({
      entityType,
      entityId,
      name: otherCostToDelete.name,
      category: otherCostToDelete.category,
      quantity: otherCostToDelete.quantity,
      unitCost: otherCostToDelete.unitCost,
      totalCost: otherCostToDelete.totalCost
    });

    // Remove other cost entry from embedded array and decrement spent
    let updatedEntity;
    switch (entityType) {
      case 'project':
        updatedEntity = await Projects.findByIdAndUpdate(
          entityId,
          {
            $pull: { OtherCosts: { _id: otherCostId } },
            $inc: { spent: -otherCost }
          },
          { new: true }
        );
        break;
      case 'building':
        updatedEntity = await Building.findByIdAndUpdate(
          entityId,
          { $pull: { OtherCosts: { _id: otherCostId } } },
          { new: true }
        );
        if (currentEntity.projectId) {
          await Projects.findByIdAndUpdate(
            currentEntity.projectId,
            { $inc: { spent: -otherCost } }
          );
        }
        break;
      case 'otherSection':
        updatedEntity = await OtherSection.findByIdAndUpdate(
          entityId,
          { $pull: { OtherCosts: { _id: otherCostId } } },
          { new: true }
        );
        if (currentEntity.projectId) {
          await Projects.findByIdAndUpdate(
            currentEntity.projectId,
            { $inc: { spent: -otherCost } }
          );
        }
        break;
      case 'rowHouse':
        updatedEntity = await RowHouse.findByIdAndUpdate(
          entityId,
          { $pull: { OtherCosts: { _id: otherCostId } } },
          { new: true }
        );
        if (currentEntity.projectId) {
          await Projects.findByIdAndUpdate(
            currentEntity.projectId,
            { $inc: { spent: -otherCost } }
          );
        }
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid entity type" },
          { status: 400 }
        );
    }

    // Invalidate cache for this entity and project
    await invalidateCachePattern(`otherCost:${entityType}:${entityId}:*`);
    if (entityType !== 'project' && currentEntity.projectId) {
      await invalidateCachePattern(`otherCost:project:${currentEntity.projectId}:*`);
    }

    return NextResponse.json({
      success: true,
      message: "Other cost entry deleted successfully",
      data: {
        entityType,
        entityId,
        otherCostId,
        costRemoved: otherCost,
        remainingOtherCosts: updatedEntity?.OtherCosts?.length || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Error deleting other cost entry:', error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete other cost entry",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
};

// Helper function to get entity by type and ID
async function getEntityById(entityType: string, entityId: string) {
  switch (entityType) {
    case 'project':
      return await Projects.findById(entityId);
    case 'building':
      return await Building.findById(entityId);
    case 'otherSection':
      return await OtherSection.findById(entityId);
    case 'rowHouse':
      return await RowHouse.findById(entityId);
    default:
      return null;
  }
}
