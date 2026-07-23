import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { Building } from "@/lib/models/Building";
import { OtherSection } from "@/lib/models/OtherSection";
import { RowHouse } from "@/lib/models/RowHouse";
import { Labor } from "@/lib/models/Xsite/Labor";
import { Types } from "mongoose";
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisDelCache 
} from "@/lib/utils/redis-helpers";

import { checkValidClient } from "@/lib/auth";
import { errorResponse } from "@/lib/utils/api-response";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";

// Helper function to check staff access to project
async function checkStaffProjectAccess(req: NextRequest, projectId: string): Promise<NextResponse | null> {
  const { searchParams } = new URL(req.url);
  const userRole = searchParams.get("userRole") || 'admin';
  
  // Admin users: no restrictions
  if (userRole === 'admin') {
    return null; // No error, proceed
  }
  
  // Staff users: check project access
  // Get project to find clientId
  const project = await Projects.findById(projectId).select('clientId').lean();
  if (!project) {
    return NextResponse.json(
      { success: false, message: "Project not found" },
      { status: 404 }
    );
  }
  
  // Project found and accessible
  return null; // No error, proceed
}

// POST - Add labor entries
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
    console.log('📋 Labor API - Request body:', JSON.stringify(body, null, 2));

    const {
      laborEntries,
      entityType, // 'project', 'building', 'otherSection', 'rowHouse'
      entityId,
      miniSectionId,
      sectionId,
      addedBy, // Optional user ID who added the labor
    } = body;

    // Validation
    if (!laborEntries || !Array.isArray(laborEntries) || laborEntries.length === 0) {
      return NextResponse.json(
        { success: false, message: "Labor entries are required" },
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

    // Check staff access to this project
    const accessError = await checkStaffProjectAccess(req, projectId);
    if (accessError) {
      return accessError;
    }

    // Check if the user is a contractor on this project
    let contractorRecords: any[] = [];
    if (addedBy && Types.ObjectId.isValid(addedBy)) {
      const { Contractor } = await import("@/lib/models/Xsite/Contractor");
      contractorRecords = await Contractor.find({ projectId, staffId: addedBy });
      if (contractorRecords.length > 0) {
        console.log(`👷 ${contractorRecords.length} contractor contract(s) found for staff ${addedBy}:`, contractorRecords.map(c => c.contractType));
      }
    }

    // Validate labor entries structure
    for (const entry of laborEntries) {
      if (contractorRecords.length === 1) {
        // If exactly one contract exists, force/ensure it matches that contract type for backward compatibility
        entry.category = contractorRecords[0].contractType;
      } else if (contractorRecords.length > 1) {
        // If multiple contracts exist, preserve selection if it matches one of the active contract types
        const matchesAny = contractorRecords.some(
          c => c.contractType.toLowerCase() === entry.category?.toLowerCase()
        );
        if (matchesAny) {
          const matchingContract = contractorRecords.find(
            c => c.contractType.toLowerCase() === entry.category.toLowerCase()
          );
          if (matchingContract) {
            entry.category = matchingContract.contractType; // Normalize casing to DB value
          }
        } else {
          console.warn(`⚠️ Entry category "${entry.category}" does not match any of the contractor's contract types:`, contractorRecords.map(c => c.contractType));
        }
      }

      if (!entry.type || !entry.category || !entry.count || !entry.perLaborCost) {
        return NextResponse.json(
          { success: false, message: "Invalid labor entry structure. Required: type, category, count, perLaborCost" },
          { status: 400 }
        );
      }

      if (entry.count <= 0 || entry.perLaborCost <= 0) {
        return NextResponse.json(
          { success: false, message: "Count and perLaborCost must be greater than 0" },
          { status: 400 }
        );
      }
    }

    // Calculate total cost of all labor entries
    const totalLaborCost = laborEntries.reduce((sum, entry) => {
      const entryCost = entry.totalCost || (entry.count * entry.perLaborCost);
      return sum + entryCost;
    }, 0);

    console.log('💰 Total labor cost to add:', totalLaborCost);

    // Prepare labor entries for both standalone and embedded models
    const processedLaborEntries = laborEntries.map(entry => {
      // Set entityModel based on entityType
      let entityModel;
      switch (entityType) {
        case 'project':
          entityModel = 'Projects';
          break;
        case 'building':
          entityModel = 'Building';
          break;
        case 'otherSection':
          entityModel = 'OtherSection';
          break;
        case 'rowHouse':
          entityModel = 'RowHouse';
          break;
        default:
          entityModel = 'Projects'; // Default fallback
      }

      return {
        ...entry,
        totalCost: entry.totalCost || (entry.count * entry.perLaborCost),
        entityType,
        entityId,
        entityModel, // Explicitly set entityModel
        projectId,
        sectionId: sectionId || entry.sectionId,
        miniSectionId: miniSectionId || entry.miniSectionId,
        addedAt: new Date(),
        status: 'active',
        addedBy: addedBy || null,
      };
    });

    console.log('🔍 Processed labor entries:', JSON.stringify(processedLaborEntries, null, 2));

    // Create standalone Labor documents
    const createdLaborEntries = await Labor.insertMany(processedLaborEntries);
    console.log('✅ Created standalone labor entries:', createdLaborEntries.length);

    const embeddedLaborEntries = processedLaborEntries.map(entry => {
      // Create a clean object with only the fields defined in EmbeddedLaborSchema
      return {
        type: entry.type,
        category: entry.category,
        skillLevel: entry.skillLevel || 'na',
        count: entry.count,
        perLaborCost: entry.perLaborCost,
        totalCost: entry.totalCost,
        miniSectionId: entry.miniSectionId,
        miniSectionName: entry.miniSectionName,
        sectionId: entry.sectionId,
        icon: entry.icon || 'people',
        color: entry.color || '#3B82F6',
        addedAt: entry.addedAt,
        notes: entry.notes,
        description: entry.description,
        workDate: entry.workDate,
        status: entry.status || 'active',
        addedBy: entry.addedBy || null, // String type in embedded schema
        updatedBy: entry.updatedBy || null // String type in embedded schema
        // NOTE: Do NOT include projectId, entityId, entityType, entityModel 
        // as these are only for standalone Labor documents, not embedded ones
      };
    });

    console.log('🔍 Embedded labor entries:', JSON.stringify(embeddedLaborEntries, null, 2));

    let updatedEntity;
    let entityName = '';

    // Handle different entity types - add to embedded arrays
    switch (entityType) {
      case 'project':
        // Add labor entries and update spent amount
        updatedEntity = await Projects.findByIdAndUpdate(
          entityId,
          {
            $push: { Labors: { $each: embeddedLaborEntries } },
            $inc: { spent: totalLaborCost }
          },
          { new: true, runValidators: true }
        );
        entityName = 'Project';
        break;

      case 'building':
        // Add labor entries to building
        updatedEntity = await Building.findByIdAndUpdate(
          entityId,
          {
            $push: { Labors: { $each: embeddedLaborEntries } }
          },
          { new: true, runValidators: true }
        );

        // Also update the parent project's spent amount
        await Projects.findByIdAndUpdate(
          projectId,
          { $inc: { spent: totalLaborCost } },
          { runValidators: true }
        );
        entityName = 'Building';
        break;

      case 'otherSection':
        // Add labor entries to other section
        updatedEntity = await OtherSection.findByIdAndUpdate(
          entityId,
          {
            $push: { Labors: { $each: embeddedLaborEntries } }
          },
          { new: true, runValidators: true }
        );

        // Also update the parent project's spent amount
        await Projects.findByIdAndUpdate(
          projectId,
          { $inc: { spent: totalLaborCost } },
          { runValidators: true }
        );
        entityName = 'Other Section';
        break;

      case 'rowHouse':
        // Add labor entries to row house
        updatedEntity = await RowHouse.findByIdAndUpdate(
          entityId,
          {
            $push: { Labors: { $each: embeddedLaborEntries } }
          },
          { new: true, runValidators: true }
        );

        // Also update the parent project's spent amount
        await Projects.findByIdAndUpdate(
          projectId,
          { $inc: { spent: totalLaborCost } },
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
      // Rollback standalone labor entries if entity update failed
      await Labor.deleteMany({ _id: { $in: createdLaborEntries.map(entry => entry._id) } });
      return NextResponse.json(
        { success: false, message: `Failed to update ${entityName.toLowerCase()}` },
        { status: 500 }
      );
    }

    console.log('✅ Labor entries added successfully');
    console.log('📊 Updated entity:', entityName);
    console.log('💰 Total cost added to spent:', totalLaborCost);

    // Invalidate cache for this entity and project
    await invalidateCachePattern(`labor:${entityType}:${entityId}:*`);
    // Also invalidate project-level cache if not a project entity
    if (entityType !== 'project' && projectId) {
      await invalidateCachePattern(`labor:project:${projectId}:*`);
    }
    // Invalidate project cache
    await safeRedisDelCache(`project:${projectId}`);
    await invalidateCachePattern(`projects:*`);

    // Log activity for labor addition
    const userInfo = extractUserInfo(req, body);
    if (userInfo) {
      try {
        // Get project name for better activity description
        const project = await Projects.findById(projectId).select('name').lean();
        let sectionName = undefined;
        let miniSectionName = undefined;
        
        // Get section/mini-section names if applicable
        if (updatedEntity) {
          if (entityType !== 'project' && updatedEntity.name) {
            sectionName = updatedEntity.name;
          }
        }
        
        await logActivity({
          user: userInfo,
          clientId: body.clientId || 'unknown',
          projectId: projectId,
          projectName: project && !Array.isArray(project) ? project.name : undefined,
          sectionId: sectionId,
          sectionName: sectionName,
          miniSectionId: miniSectionId,
          miniSectionName: miniSectionName,
          activityType: 'labor_added',
          category: 'labor',
          action: 'add',
          description: `Added ${laborEntries.length} labor ${laborEntries.length === 1 ? 'entry' : 'entries'} to ${entityName}. Work done: ${processedLaborEntries.map(e => `${e.type} (${e.description || 'No work description'})`).join(', ')}`,
          message: `Total cost: ₹${totalLaborCost.toLocaleString('en-IN')}`,
          metadata: {
            laborEntries: processedLaborEntries.map(entry => ({
              type: entry.type,
              category: entry.category,
              count: entry.count,
              perLaborCost: entry.perLaborCost,
              totalCost: entry.totalCost
            })),
            totalCost: totalLaborCost,
            entityType,
            entityId
          }
        });
        
        console.log('✅ Labor activity logged successfully');
      } catch (activityError) {
        console.error('❌ Failed to log labor activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    }

    // Recalculate contractor usedAmount if added by a contractor
    if (contractorRecords.length > 0 && addedBy) {
      await recalculateContractorUsedAmount(projectId.toString(), addedBy.toString());
    }

    return NextResponse.json({
      success: true,
      message: `Labor entries added successfully to ${entityName}`,
      data: {
        entityType,
        entityId,
        projectId,
        laborEntriesAdded: processedLaborEntries.length,
        totalCostAdded: totalLaborCost,
        standaloneLaborIds: createdLaborEntries.map(entry => entry._id),
        updatedEntity: {
          id: updatedEntity._id,
          name: updatedEntity.name,
          totalLabors: updatedEntity.Labors?.length || 0,
          ...(entityType === 'project' && { spent: updatedEntity.spent })
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error in labor API:', error);
    
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
}

// GET - Retrieve labor entries
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
    const status = searchParams.get('status') || 'active';
    const useStandalone = searchParams.get('useStandalone') === 'true';
    const addedBy = searchParams.get('addedBy');

    // Check cache first
    const cacheKey = `labor:${entityType || 'all'}:${entityId || 'all'}:${projectId || 'all'}:${sectionId || 'all'}:${miniSectionId || 'all'}:${category || 'all'}:${status}:${useStandalone}:${addedBy || 'all'}`;
    const cachedData = await safeRedisGetCache(cacheKey);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
      return NextResponse.json(cacheValue, { status: 200 });
    }

    // Build query
    let query: any = {};
    
    if (projectId) {
      query.projectId = projectId;
    }

    if (addedBy) {
      query.addedBy = addedBy;
    }
    
    if (entityType && entityId) {
      query.entityType = entityType;
      query.entityId = entityId;
    }

    if (sectionId) {
      query.sectionId = sectionId;
    }

    if (miniSectionId) {
      query.miniSectionId = miniSectionId;
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    let laborEntries = [];
    let entity = null;

    if (useStandalone || (!entityType || !entityId)) {
      // Use standalone Labor model
      laborEntries = await Labor.find(query)
        .populate('entityId', 'name')
        .populate('projectId', 'name budget spent')
        .sort({ createdAt: -1 });

      // Get entity info if specified
      if (entityType && entityId) {
        entity = await getEntityById(entityType, entityId);
      }
    } else {
      // Use embedded labor entries from entity
      entity = await getEntityById(entityType, entityId);
      if (!entity) {
        return NextResponse.json(
          { success: false, message: `${entityType} not found` },
          { status: 404 }
        );
      }

      // Filter embedded labor entries
      laborEntries = entity.Labors || [];

      if (sectionId) {
        laborEntries = laborEntries.filter((labor: any) => labor.sectionId === sectionId);
      }

      if (miniSectionId) {
        laborEntries = laborEntries.filter((labor: any) => labor.miniSectionId === miniSectionId);
      }

      if (category) {
        laborEntries = laborEntries.filter((labor: any) => labor.category === category);
      }

      if (status) {
        laborEntries = laborEntries.filter((labor: any) => labor.status === status);
      }
    }

    // Calculate summary statistics
    const totalLaborCost = laborEntries.reduce((sum: number, labor: any) => sum + (labor.totalCost || 0), 0);
    const totalLaborers = laborEntries.reduce((sum: number, labor: any) => sum + (labor.count || 0), 0);
    
    // Group by category for summary
    const categoryStats = laborEntries.reduce((acc: any, labor: any) => {
      if (!acc[labor.category]) {
        acc[labor.category] = {
          count: 0,
          totalCost: 0,
          laborers: 0,
          entries: 0
        };
      }
      acc[labor.category].totalCost += labor.totalCost || 0;
      acc[labor.category].laborers += labor.count || 0;
      acc[labor.category].entries += 1;
      return acc;
    }, {});

    // Group by mini-section for summary
    const miniSectionStats = laborEntries.reduce((acc: any, labor: any) => {
      const sectionId = labor.miniSectionId || 'unassigned';
      const sectionName = labor.miniSectionName || 'Unassigned';
      
      if (!acc[sectionId]) {
        acc[sectionId] = {
          miniSectionId: sectionId,
          miniSectionName: sectionName,
          totalCost: 0,
          laborers: 0,
          entries: 0
        };
      }
      acc[sectionId].totalCost += labor.totalCost || 0;
      acc[sectionId].laborers += labor.count || 0;
      acc[sectionId].entries += 1;
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
        laborEntries,
        summary: {
          totalEntries: laborEntries.length,
          totalLaborers,
          totalCost: totalLaborCost,
          categoryStats,
          miniSectionStats: Object.values(miniSectionStats)
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
    console.error('❌ Error retrieving labor entries:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to retrieve labor entries",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Update labor entry
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
      laborId,
      updates
    } = body;

    if (!entityType || !entityId || !laborId || !updates) {
      return NextResponse.json(
        { success: false, message: "Entity type, entity ID, labor ID, and updates are required" },
        { status: 400 }
      );
    }

    // Calculate new total cost if count or perLaborCost is being updated
    let currentEntity: any = null;
    let currentLabor: any = null;

    if (updates.count !== undefined || updates.perLaborCost !== undefined) {
      currentEntity = await getEntityById(entityType, entityId);
      if (!currentEntity) {
        return NextResponse.json(
          { success: false, message: `${entityType} not found` },
          { status: 404 }
        );
      }

      currentLabor = currentEntity.Labors?.find((labor: any) => labor._id.toString() === laborId);
      if (!currentLabor) {
        return NextResponse.json(
          { success: false, message: "Labor entry not found" },
          { status: 404 }
        );
      }

      const newCount = updates.count !== undefined ? updates.count : currentLabor.count;
      const newPerLaborCost = updates.perLaborCost !== undefined ? updates.perLaborCost : currentLabor.perLaborCost;
      const oldTotalCost = currentLabor.totalCost;
      const newTotalCost = newCount * newPerLaborCost;
      
      updates.totalCost = newTotalCost;

      // Update spent amount in project
      const costDifference = newTotalCost - oldTotalCost;
      if (costDifference !== 0) {
        if (entityType === 'project') {
          await Projects.findByIdAndUpdate(entityId, { $inc: { spent: costDifference } });
        } else {
          // Update parent project's spent amount
          const projectId = currentEntity.projectId;
          if (projectId) {
            await Projects.findByIdAndUpdate(projectId, { $inc: { spent: costDifference } });
          }
        }
      }
    } else {
      // Still fetch entity/labor for the standalone-sync block below
      currentEntity = await getEntityById(entityType, entityId);
      if (currentEntity) {
        currentLabor = currentEntity.Labors?.find((labor: any) => labor._id.toString() === laborId) || null;
      }
    }

    // Update the labor entry
    const updateQuery = {};
    Object.keys(updates).forEach(key => {
      (updateQuery as any)[`Labors.$.${key}`] = updates[key];
    });

    let updatedEntity;
    switch (entityType) {
      case 'project':
        updatedEntity = await Projects.findOneAndUpdate(
          { _id: entityId, 'Labors._id': laborId },
          { $set: updateQuery },
          { new: true, runValidators: true }
        );
        break;
      case 'building':
        updatedEntity = await Building.findOneAndUpdate(
          { _id: entityId, 'Labors._id': laborId },
          { $set: updateQuery },
          { new: true, runValidators: true }
        );
        break;
      case 'otherSection':
        updatedEntity = await OtherSection.findOneAndUpdate(
          { _id: entityId, 'Labors._id': laborId },
          { $set: updateQuery },
          { new: true, runValidators: true }
        );
        break;
      case 'rowHouse':
        updatedEntity = await RowHouse.findOneAndUpdate(
          { _id: entityId, 'Labors._id': laborId },
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
        { success: false, message: "Failed to update labor entry" },
        { status: 500 }
      );
    }

    // Update standalone Labor entry to keep it in sync with embedded entry
    try {
      const { Labor } = await import("@/lib/models/Xsite/Labor");
      await Labor.findOneAndUpdate(
        {
          entityType,
          entityId,
          type: currentLabor.type,
          category: currentLabor.category,
          count: currentLabor.count,
          perLaborCost: currentLabor.perLaborCost,
          totalCost: currentLabor.totalCost
        },
        { $set: updates }
      );
      
      // If we have a projectId and addedBy, recalculate contractor usedAmount
      const projectIdToUse = entityType === 'project' ? entityId : currentEntity.projectId;
      const addedBy = currentLabor.addedBy;
      if (projectIdToUse && addedBy) {
        await recalculateContractorUsedAmount(projectIdToUse.toString(), addedBy.toString());
      }
    } catch (standaloneError) {
      console.error("⚠️ Failed to update standalone labor entry in PUT:", standaloneError);
    }

    // Invalidate cache for this entity and project
    await invalidateCachePattern(`labor:${entityType}:${entityId}:*`);

    return NextResponse.json({
      success: true,
      message: "Labor entry updated successfully",
      data: {
        entityType,
        entityId,
        laborId,
        updatedLabor: updatedEntity.Labors?.find((labor: any) => labor._id.toString() === laborId)
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating labor entry:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update labor entry",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove labor entry
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
    const laborId = searchParams.get('laborId');
    const standaloneLaborId = searchParams.get('standaloneLaborId');

    if (standaloneLaborId) {
      // Delete standalone labor entry
      const laborEntry = await Labor.findById(standaloneLaborId);
      if (!laborEntry) {
        return NextResponse.json(
          { success: false, message: "Labor entry not found" },
          { status: 404 }
        );
      }

      const laborCost = laborEntry.totalCost || 0;
      const projectId = laborEntry.projectId;
      const entityType = laborEntry.entityType;
      const entityId = laborEntry.entityId;

      // Delete standalone labor entry
      await Labor.findByIdAndDelete(standaloneLaborId);

      // Remove from embedded array
      await removeFromEmbeddedArray(entityType, entityId, laborId);

      // Update project spent amount
      if (projectId) {
        await Projects.findByIdAndUpdate(
          projectId,
          { $inc: { spent: -laborCost } }
        );
      }

      // Recalculate contractor usedAmount if deleted standalone labor has addedBy
      if (projectId && laborEntry.addedBy) {
        await recalculateContractorUsedAmount(projectId.toString(), laborEntry.addedBy.toString());
      }

      // Invalidate cache for this entity and project
      await invalidateCachePattern(`labor:${entityType}:${entityId}:*`);
      if (projectId) {
        await invalidateCachePattern(`labor:project:${projectId}:*`);
      }

      return NextResponse.json({
        success: true,
        message: "Labor entry deleted successfully",
        data: {
          standaloneLaborId,
          entityType,
          entityId,
          costRemoved: laborCost
        }
      });
    }

    // Handle embedded labor entry deletion
    if (!entityType || !entityId || !laborId) {
      return NextResponse.json(
        { success: false, message: "Entity type, entity ID, and labor ID are required" },
        { status: 400 }
      );
    }

    // Get current entity to find the labor entry cost
    const currentEntity = await getEntityById(entityType, entityId);
    if (!currentEntity) {
      return NextResponse.json(
        { success: false, message: `${entityType} not found` },
        { status: 404 }
      );
    }

    const laborToDelete = currentEntity.Labors?.find((labor: any) => labor._id.toString() === laborId);
    if (!laborToDelete) {
      return NextResponse.json(
        { success: false, message: "Labor entry not found" },
        { status: 404 }
      );
    }

    const laborCost = laborToDelete.totalCost || 0;

    // Delete corresponding standalone labor entry
    await Labor.deleteOne({
      entityType,
      entityId,
      type: laborToDelete.type,
      category: laborToDelete.category,
      count: laborToDelete.count,
      perLaborCost: laborToDelete.perLaborCost,
      totalCost: laborToDelete.totalCost
    });

    // Remove labor entry from embedded array
    let updatedEntity;
    switch (entityType) {
      case 'project':
        updatedEntity = await Projects.findByIdAndUpdate(
          entityId,
          { 
            $pull: { Labors: { _id: laborId } },
            $inc: { spent: -laborCost }
          },
          { new: true }
        );
        break;
      case 'building':
        updatedEntity = await Building.findByIdAndUpdate(
          entityId,
          { $pull: { Labors: { _id: laborId } } },
          { new: true }
        );
        // Update parent project's spent amount
        if (currentEntity.projectId) {
          await Projects.findByIdAndUpdate(
            currentEntity.projectId,
            { $inc: { spent: -laborCost } }
          );
        }
        break;
      case 'otherSection':
        updatedEntity = await OtherSection.findByIdAndUpdate(
          entityId,
          { $pull: { Labors: { _id: laborId } } },
          { new: true }
        );
        // Update parent project's spent amount
        if (currentEntity.projectId) {
          await Projects.findByIdAndUpdate(
            currentEntity.projectId,
            { $inc: { spent: -laborCost } }
          );
        }
        break;
      case 'rowHouse':
        updatedEntity = await RowHouse.findByIdAndUpdate(
          entityId,
          { $pull: { Labors: { _id: laborId } } },
          { new: true }
        );
        // Update parent project's spent amount
        if (currentEntity.projectId) {
          await Projects.findByIdAndUpdate(
            currentEntity.projectId,
            { $inc: { spent: -laborCost } }
          );
        }
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid entity type" },
          { status: 400 }
        );
    }

    // Recalculate contractor usedAmount if deleted embedded labor has addedBy
    const projectIdToUse = entityType === 'project' ? entityId : currentEntity.projectId;
    if (projectIdToUse && laborToDelete.addedBy) {
      await recalculateContractorUsedAmount(projectIdToUse.toString(), laborToDelete.addedBy.toString());
    }

    // Invalidate cache for this entity and project
    await invalidateCachePattern(`labor:${entityType}:${entityId}:*`);
    // Also invalidate project-level cache if not a project entity
    if (entityType !== 'project' && currentEntity.projectId) {
      await invalidateCachePattern(`labor:project:${currentEntity.projectId}:*`);
    }

    return NextResponse.json({
      success: true,
      message: "Labor entry deleted successfully",
      data: {
        entityType,
        entityId,
        laborId,
        costRemoved: laborCost,
        remainingLabors: updatedEntity?.Labors?.length || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Error deleting labor entry:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete labor entry",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to remove from embedded array
async function removeFromEmbeddedArray(entityType: string, entityId: string, laborId?: string | null) {
  if (!laborId) return;

  switch (entityType) {
    case 'project':
      await Projects.findByIdAndUpdate(
        entityId,
        { $pull: { Labors: { _id: laborId } } }
      );
      break;
    case 'building':
      await Building.findByIdAndUpdate(
        entityId,
        { $pull: { Labors: { _id: laborId } } }
      );
      break;
    case 'otherSection':
      await OtherSection.findByIdAndUpdate(
        entityId,
        { $pull: { Labors: { _id: laborId } } }
      );
      break;
    case 'rowHouse':
      await RowHouse.findByIdAndUpdate(
        entityId,
        { $pull: { Labors: { _id: laborId } } }
      );
      break;
  }
}

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

// Helper function to recalculate and update a contractor's usedAmount
async function recalculateContractorUsedAmount(projectId: string, staffId: string) {
  try {
    const { Labor } = await import("@/lib/models/Xsite/Labor");
    const { Contractor } = await import("@/lib/models/Xsite/Contractor");

    const PREDEFINED_CATEGORIES = [
      'Civil / Structural Works',
      'Electrical Works',
      'Plumbing & Sanitary Works',
      'Finishing Works',
      'Mechanical & HVAC Works',
      'Fire Fighting & Safety Works',
      'External & Infrastructure Works',
      'Waterproofing & Treatment Works',
      'Site Management & Support Staff',
      'Equipment Operators',
      'Security & Housekeeping',
      'RCC contractor',
      'Other Works',
    ];

    // Find all contracts for this staff member on this project
    const contracts = await Contractor.find({ projectId, staffId });

    for (const contract of contracts) {
      const isPredefined = PREDEFINED_CATEGORIES.some(
        c => c.toLowerCase() === contract.contractType.toLowerCase()
      );

      // For custom contract types, map to "Other Works" category in Labor records
      const laborCategory = isPredefined ? contract.contractType : 'Other Works';

      const activeEntries = await Labor.find({
        projectId,
        addedBy: staffId,
        category: laborCategory,
        status: "active"
      });

      const totalCost = activeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);

      contract.usedAmount = totalCost;
      await contract.save();
      console.log(`🔄 Recalculated usedAmount for staff ${staffId} on project ${projectId} | contractType: ${contract.contractType} | laborCategory: ${laborCategory} | total: ${totalCost}`);
    }
  } catch (error) {
    console.error("❌ Failed to recalculate contractor usedAmount:", error);
  }
}
