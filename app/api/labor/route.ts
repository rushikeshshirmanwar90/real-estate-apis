import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { Building } from "@/lib/models/Building";
import { OtherSection } from "@/lib/models/OtherSection";
import { RowHouse } from "@/lib/models/RowHouse";
import { Labor } from "@/lib/models/Xsite/Labor";

// POST - Add labor entries
export async function POST(request: NextRequest) {
  try {
    await connect();

    const body = await request.json();
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

    // Validate labor entries structure
    for (const entry of laborEntries) {
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

    // Prepare embedded labor entries (only keep fields needed for embedded schema)
    const embeddedLaborEntries = processedLaborEntries.map(entry => {
      // Create a clean object with only the fields defined in EmbeddedLaborSchema
      return {
        type: entry.type,
        category: entry.category,
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
export async function GET(request: NextRequest) {
  try {
    await connect();

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const projectId = searchParams.get('projectId');
    const miniSectionId = searchParams.get('miniSectionId');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const useStandalone = searchParams.get('useStandalone') === 'true';

    // Build query
    let query: any = {};
    
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (entityType && entityId) {
      query.entityType = entityType;
      query.entityId = entityId;
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

    return NextResponse.json({
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
    });

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
export async function PUT(request: NextRequest) {
  try {
    await connect();

    const body = await request.json();
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
    if (updates.count !== undefined || updates.perLaborCost !== undefined) {
      const currentEntity = await getEntityById(entityType, entityId);
      if (!currentEntity) {
        return NextResponse.json(
          { success: false, message: `${entityType} not found` },
          { status: 404 }
        );
      }

      const currentLabor = currentEntity.Labors?.find((labor: any) => labor._id.toString() === laborId);
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
export async function DELETE(request: NextRequest) {
  try {
    await connect();

    const { searchParams } = new URL(request.url);
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