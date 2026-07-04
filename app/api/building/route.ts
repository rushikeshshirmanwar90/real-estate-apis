import { Building } from "@/lib/models/Building";
import { Projects } from "@/lib/models/Project";
import { MiniSection } from "@/lib/models/Xsite/mini-section";
import { ConstructionTracker } from "@/lib/models/Xsite/construction-tracker";
import { buildPhases } from "@/lib/utils/constructionTracker";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";
import { checkValidClient } from "@/lib/auth";
import {
  safeRedisGetCache, 
  safeRedisSetCache, 
  safeRedisDelCache,
  safeRedisKeysCache 
} from "@/lib/utils/redis-helpers";

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
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");

    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid building ID format", 400);
      }

      // Check cache
      const cachedData = await safeRedisGetCache(`building:${id}`);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
        return successResponse(cacheValue, "Building retrieved successfully (cached)");
      }

      let building = await Building.findById(id).lean();
      
      // If building doesn't exist, try to create it from project section data
      if (!building) {
        logger.info(`Building ${id} not found, attempting to create from project section`);
        
        try {
          // Find the project that contains this building section
          const project = await Projects.findOne({
            $or: [
              { "section.sectionId": id, "section.type": "building" },
              { "section.sectionId": id, "section.type": "Buildings" }
            ]
          }).lean() as any;

          if (project && project.section && Array.isArray(project.section)) {
            const section = project.section.find((s: any) => 
              s.sectionId === id && (s.type === "building" || s.type === "Buildings")
            );

            if (section) {
              // Create the building record
              const newBuilding = new Building({
                _id: id,
                name: section.name,
                projectId: project._id,
                description: '',
                totalFloors: 0,
                totalBookedUnits: 0,
                hasBasement: false,
                hasGroundFloor: true,
                floors: [],
                images: [],
                isActive: true
              });

              building = await newBuilding.save();
              logger.info(`Created missing building record for ${id}`);
              
              // Cache the building with 24-hour expiration
              await safeRedisSetCache(`building:${id}`, JSON.stringify(building), 'EX', 86400);
              
              return successResponse(building, "Building created and retrieved successfully");
            }
          }
        } catch (createError) {
          logger.error("Error creating missing building", createError);
        }
        
        return errorResponse("Building not found", 404);
      }

      // Cache the building with 24-hour expiration
      await safeRedisSetCache(`building:${id}`, JSON.stringify(building), 'EX', 86400);

      return successResponse(building, "Building retrieved successfully");
    }

    // Build filter
    const filter = projectId ? { projectId } : {};

    if (projectId && !isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    // Check cache for buildings list
    const cacheKey = projectId ? `buildings:project:${projectId}` : `buildings:all`;
    const cachedData = await safeRedisGetCache(cacheKey);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
      return successResponse(cacheValue, `Retrieved ${Array.isArray(cacheValue) ? cacheValue.length : 0} building(s) successfully (cached)`);
    }

    // Get all buildings without pagination
    const buildings = await Building.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Cache the buildings list with 24-hour expiration
    await safeRedisSetCache(cacheKey, JSON.stringify(buildings), 'EX', 86400);

    return successResponse(
      buildings,
      `Retrieved ${buildings.length} building(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error fetching buildings", error);
    return errorResponse("Failed to fetch buildings", 500);
  }
};

export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }
  
  try {
    await connect();

    const body = await req.json();

    // Validate required fields
    if (!body.projectId) {
      return errorResponse("Project ID is required", 400);
    }
    if (!isValidObjectId(body.projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    const project = await Projects.findById(body.projectId);
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const createSingleBuilding = async (buildingData: any) => {
      if (!buildingData.name) {
        throw new Error("Building name is required");
      }

      const slabsCount = typeof buildingData.slabsCount === 'number' ? buildingData.slabsCount : 1;
      const hasTerrace = buildingData.hasTerrace !== undefined ? buildingData.hasTerrace : true;

      const formattedBuildingData = {
        name: buildingData.name,
        projectId: body.projectId,
        clientId: body.clientId,
        description: buildingData.description || '',
        totalFloors: buildingData.totalFloors || slabsCount,
        totalBookedUnits: buildingData.totalBookedUnits || 0,
        hasBasement: buildingData.hasBasement || false,
        hasGroundFloor: buildingData.hasGroundFloor !== undefined ? buildingData.hasGroundFloor : true,
        floors: buildingData.floors || [],
        images: buildingData.images || [],
        isActive: true
      };

      const newBuilding = new Building(formattedBuildingData);
      const savedBuilding = await newBuilding.save();

      // Check if section already exists in project before adding
      const sectionExists = project.section?.some((s: any) => 
        s.sectionId?.toString() === savedBuilding._id.toString()
      );

      if (!sectionExists) {
        await Projects.findByIdAndUpdate(
          body.projectId,
          {
            $push: {
              section: {
                sectionId: savedBuilding._id,
                name: savedBuilding.name,
                type: "Buildings",
              },
            },
          }
        );
      }

      // Log activity for building creation
      const userInfo = extractUserInfo(req, body);
      if (userInfo) {
        await logActivity({
          user: userInfo,
          clientId: body.clientId?.toString() || 'unknown',
          projectId: body.projectId.toString(),
          projectName: project.projectName || project.name || 'Unknown Project',
          sectionId: savedBuilding._id.toString(),
          sectionName: savedBuilding.name || 'Unnamed Building',
          activityType: "section_created",
          category: "section",
          action: "create",
          description: `Created section "${savedBuilding.name || 'Unnamed Building'}" in project "${project.projectName || project.name || 'Unknown Project'}"`,
          message: `Section created successfully in project`,
          metadata: {
            sectionData: {
              name: savedBuilding.name,
              type: 'Buildings',
              projectId: savedBuilding.projectId,
              floors: savedBuilding.floors
            }
          }
        });
      }

      // Auto-create default sections: Foundation, Slab 1…N, Terrace
      const projectName = project.name || 'Unknown Project';
      const defaultSections = ['Foundation'];

      // Add one section per slab (Slab 1, Slab 2, …)
      for (let i = 1; i <= slabsCount; i++) {
        defaultSections.push(`Slab ${i}`);
      }
      if (hasTerrace) {
        defaultSections.push('Terrace');
      }

      for (const sectionName of defaultSections) {
        try {
          const miniSection = await MiniSection.create({
            name: sectionName,
            projectDetails: {
              projectName,
              projectId: body.projectId.toString(),
            },
            mainSectionDetails: {
              sectionName: savedBuilding.name,
              sectionId: savedBuilding._id.toString(),
            },
            isCompleted: false,
          });

          await ConstructionTracker.create({
            miniSectionId: miniSection._id.toString(),
            projectId: body.projectId.toString(),
            projectName,
            sectionName,
            overallProgress: 0,
            phases: buildPhases(sectionName),
          });

          logger.info(`Auto-created default section "${sectionName}" for building ${savedBuilding._id}`);
        } catch (sectionError) {
          logger.error(`Failed to auto-create default section "${sectionName}"`, sectionError);
        }
      }

      return savedBuilding;
    };

    if (body.buildings && Array.isArray(body.buildings)) {
      const createdBuildings = [];
      for (const bData of body.buildings) {
        const saved = await createSingleBuilding(bData);
        createdBuildings.push(saved);
      }

      // Invalidate cache
      await safeRedisDelCache(`buildings:all`);
      await safeRedisDelCache(`buildings:project:${body.projectId}`);
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }

      return successResponse(createdBuildings, "Buildings created successfully", 201);
    } else {
      if (!body.name) {
        return errorResponse("Building name is required", 400);
      }
      const savedBuilding = await createSingleBuilding(body);

      // Invalidate cache
      await safeRedisDelCache(`buildings:all`);
      await safeRedisDelCache(`buildings:project:${body.projectId}`);
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }

      return successResponse(savedBuilding, "Building created successfully", 201);
    }
  } catch (error: unknown) {
    logger.error("Error creating building", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    const message = error instanceof Error ? error.message : "Failed to create building";
    return errorResponse(message, 500);
  }
};

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
    const projectId = searchParams.get("projectId");
    const sectionId = searchParams.get("sectionId");

    console.log('🗑️ DELETE /api/building - Request received');
    console.log('   Project ID:', projectId);
    console.log('   Section ID:', sectionId);

    if (!projectId || !sectionId) {
      console.error('❌ Missing required parameters');
      return errorResponse("Project ID and Section ID are required", 400);
    }

    if (!isValidObjectId(projectId) || !isValidObjectId(sectionId)) {
      console.error('❌ Invalid ID format');
      return errorResponse("Invalid ID format", 400);
    }

    // Delete building and update project
    try {
      console.log('🔄 Removing section from project...');
      const updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        { $pull: { section: { sectionId: sectionId } } },
        { new: true }
      );

      if (!updatedProject) {
        console.error('❌ Project not found:', projectId);
        return errorResponse("Project not found", 404);
      }

      console.log('✅ Section removed from project');
      console.log('🔄 Deleting building record...');

      const deletedBuilding = await Building.findByIdAndDelete(sectionId).lean();

      if (!deletedBuilding) {
        console.warn('⚠️ Building record not found, but section was removed from project');
        // Don't rollback - the section removal is what matters
        // The building record might not exist (which is fine)
        console.log('✅ Section deleted successfully (building record did not exist)');
        
        // Invalidate cache
        await safeRedisDelCache(`building:${sectionId}`);
        await safeRedisDelCache(`buildings:all`);
        await safeRedisDelCache(`buildings:project:${projectId}`);
        const projectKeys = await safeRedisKeysCache(`project:*`);
        if (projectKeys.length > 0) {
          await safeRedisDelCache(...projectKeys);
        }
        
        return successResponse(
          { _id: sectionId, projectId }, 
          "Section deleted successfully (building record did not exist)"
        );
      }

      console.log('✅ Building record deleted');

      // Invalidate cache
      await safeRedisDelCache(`building:${sectionId}`);
      await safeRedisDelCache(`buildings:all`);
      await safeRedisDelCache(`buildings:project:${projectId}`);
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }

      return successResponse(deletedBuilding, "Building deleted successfully");
    } catch (error) {
      console.error('❌ Error in delete operation:', error);
      throw error;
    }
  } catch (error: unknown) {
    console.error('❌ Error deleting building:', error);
    logger.error("Error deleting building", error);
    return errorResponse("Failed to delete building", 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const PUT = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }
  
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");

    console.log('🔍 PUT /api/building - Request received');
    console.log('   Building ID:', id);
    console.log('   Project ID:', projectId);

    if (!id) {
      console.error('❌ Building ID is missing');
      return errorResponse("Building ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      console.error('❌ Invalid building ID format:', id);
      return errorResponse("Invalid building ID format", 400);
    }

    const body = await req.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    // Remove immutable fields from update payload
    const updatePayload = { ...body };
    delete updatePayload._id;
    delete updatePayload.projectId;
    delete updatePayload.clientId;

    // Handle automatic floor creation if floors array is provided
    if (updatePayload.floors && Array.isArray(updatePayload.floors)) {
      // Create floors with proper ObjectIds
      const floorsWithIds = updatePayload.floors.map((floor: any) => ({
        ...floor,
        _id: new mongoose.Types.ObjectId(),
        unitTypes: floor.unitTypes || [],
        units: floor.units || [],
        images: floor.images || [],
        amenities: floor.amenities || [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      updatePayload.floors = floorsWithIds;
      
      logger.info(`Creating ${floorsWithIds.length} floors for building ${id}`);
    }

    console.log('🔄 Attempting to update building...');
    const updatedBuilding = await Building.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBuilding) {
      console.error('❌ Building not found:', id);
      return errorResponse("Building not found", 404);
    }

    console.log('✅ Building updated successfully:', id);

    // Also update the section name in the project if name was changed
    if (updatePayload.name && projectId) {
      console.log('🔄 Updating section name in project...');
      try {
        await Projects.updateOne(
          { _id: projectId, "section.sectionId": id },
          { $set: { "section.$.name": updatePayload.name } }
        );
        console.log('✅ Section name updated in project');
      } catch (projectUpdateError) {
        console.error('⚠️ Failed to update section name in project:', projectUpdateError);
        // Don't fail the request if project update fails
      }
    }

    const responseMessage = updatePayload.floors && Array.isArray(updatePayload.floors) 
      ? `Building updated successfully with ${updatePayload.floors.length} floors created`
      : "Building updated successfully";

    // Invalidate cache
    await safeRedisDelCache(`building:${id}`);
    await safeRedisDelCache(`buildings:all`);
    if (updatedBuilding && !Array.isArray(updatedBuilding) && updatedBuilding.projectId) {
      await safeRedisDelCache(`buildings:project:${updatedBuilding.projectId}`);
    }
    if (projectId) {
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }
    }

    return successResponse(updatedBuilding, responseMessage);
  } catch (error: unknown) {
    console.error('❌ Error updating building:', error);
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    logger.error("Error updating building", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      console.error('❌ Validation error details:', error);
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update building", 500, {
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.constructor.name : typeof error
    });
  }
};

export const PATCH = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }
  
  try {
    await connect();
    const body = await req.json();
    const { id, isCompleted, clientId, staffId } = body;

    // Validation
    if (!id || typeof isCompleted !== 'boolean') {
      return errorResponse("Missing required fields: id, isCompleted", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid building ID format", 400);
    }

    try {
      const updatedBuilding = await Building.findByIdAndUpdate(
        id,
        { isCompleted },
        { new: true }
      );

      if (!updatedBuilding) {
        return errorResponse("Building not found", 404);
      }

      // Also update the section in the project
      await Projects.updateOne(
        { "section.sectionId": id },
        { $set: { "section.$.isCompleted": isCompleted } }
      );

      // Log activity
      const userInfo = extractUserInfo(req, body);
      if (userInfo) {
        try {
          await logActivity({
            user: userInfo,
            clientId: clientId || 'unknown',
            projectId: updatedBuilding.projectId,
            sectionId: id,
            activityType: 'other',
            category: 'other',
            action: 'update',
            description: `Building ${isCompleted ? 'marked as completed' : 'reopened'}`,
            metadata: {
              previousStatus: !isCompleted,
              newStatus: isCompleted,
              itemType: 'building',
              itemId: id
            }
          });
        } catch (logError) {
          console.error('Failed to log building completion activity:', logError);
          // Don't fail the request if logging fails
        }
      }

      return successResponse(
        updatedBuilding,
        "Building completion status updated successfully"
      );

    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error updating building completion status:', error);
    return errorResponse("Failed to update building completion status", 500);
  }
};
