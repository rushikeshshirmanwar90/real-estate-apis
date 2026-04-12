import { Building } from "@/lib/models/Building";
import { Projects } from "@/lib/models/Project";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisDelCache,
  safeRedisKeysCache 
} from "@/lib/utils/redis-helpers";

export const GET = async (req: NextRequest) => {
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
          const Projects = (await import("@/lib/models/Project")).Projects;
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

    if (!body.name) {
      return errorResponse("Building name is required", 400);
    }

    // Create building with proper defaults
    try {
      const buildingData = {
        ...body,
        description: body.description || '',
        totalFloors: body.totalFloors || 0,
        totalBookedUnits: body.totalBookedUnits || 0,
        hasBasement: body.hasBasement || false,
        hasGroundFloor: body.hasGroundFloor !== undefined ? body.hasGroundFloor : true,
        floors: body.floors || [],
        images: body.images || [],
        isActive: true
      };

      const newBuilding = new Building(buildingData);
      const savedBuilding = await newBuilding.save();

      const updatedProject = await Projects.findByIdAndUpdate(
        savedBuilding.projectId,
        {
          $push: {
            section: {
              sectionId: savedBuilding._id,
              name: savedBuilding.name,
              type: "Buildings",
            },
          },
        },
        { new: true }
      );

      if (!updatedProject) {
        // Rollback: delete the created building
        await Building.findByIdAndDelete(savedBuilding._id);
        return errorResponse("Project not found", 404);
      }

      // ✅ Log activity for building creation (consistent with section creation)
      const userInfo = extractUserInfo(req, body);
      if (userInfo && updatedProject) {
        await logActivity({
          user: userInfo,
          clientId: updatedProject.clientId?.toString() || 'unknown',
          projectId: savedBuilding.projectId.toString(),
          projectName: updatedProject.projectName || updatedProject.name || 'Unknown Project',
          sectionId: savedBuilding._id.toString(),
          sectionName: savedBuilding.name || 'Unnamed Building',
          activityType: "section_created",
          category: "section",
          action: "create",
          description: `Created section "${savedBuilding.name || 'Unnamed Building'}" in project "${updatedProject.projectName || updatedProject.name || 'Unknown Project'}"`,
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

      logger.info(`Building created successfully: ${savedBuilding._id} with ${savedBuilding.floors?.length || 0} floors`);

      // Invalidate cache
      await safeRedisDelCache(`buildings:all`);
      await safeRedisDelCache(`buildings:project:${savedBuilding.projectId}`);
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }

      return successResponse(
        savedBuilding,
        "Building created successfully",
        201
      );
    } catch (error) {
      throw error;
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

    return errorResponse("Failed to create building", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const sectionId = searchParams.get("sectionId");

    if (!projectId || !sectionId) {
      return errorResponse("Project ID and Section ID are required", 400);
    }

    if (!isValidObjectId(projectId) || !isValidObjectId(sectionId)) {
      return errorResponse("Invalid ID format", 400);
    }

    // Delete building and update project
    try {
      const updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        { $pull: { section: { sectionId: sectionId } } },
        { new: true }
      );

      if (!updatedProject) {
        return errorResponse("Project not found", 404);
      }

      const deletedBuilding = await Building.findByIdAndDelete(sectionId).lean();

      if (!deletedBuilding) {
        // Rollback: restore the section in project
        await Projects.findByIdAndUpdate(
          projectId,
          { $push: { section: { sectionId: sectionId } } }
        );
        return errorResponse("Building not found", 404);
      }

      // Invalidate cache
      await safeRedisDelCache(`building:${sectionId}`);
      await safeRedisDelCache(`buildings:all`);
      if (updatedProject.projectId) {
        await safeRedisDelCache(`buildings:project:${updatedProject.projectId}`);
      }
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }

      return successResponse(deletedBuilding, "Building deleted successfully");
    } catch (error) {
      throw error;
    }
  } catch (error: unknown) {
    logger.error("Error deleting building", error);
    return errorResponse("Failed to delete building", 500);
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Building ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid building ID format", 400);
    }

    const body = await req.json();

    // Handle automatic floor creation if floors array is provided
    if (body.floors && Array.isArray(body.floors)) {
      // Create floors with proper ObjectIds
      const floorsWithIds = body.floors.map((floor: any) => ({
        ...floor,
        _id: new mongoose.Types.ObjectId(),
        unitTypes: floor.unitTypes || [],
        units: floor.units || [],
        images: floor.images || [],
        amenities: floor.amenities || [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      body.floors = floorsWithIds;
      
      // DO NOT modify totalFloors here - it should represent only upper floors (1, 2, 3, etc.)
      // The totalFloors field is the user's input for "Number of Upper Floors"
      // Basement (-1) and Ground Floor (0) are tracked separately via hasBasement and hasGroundFloor
      
      logger.info(`Creating ${floorsWithIds.length} floors for building ${id}`);
    }

    const updatedBuilding = await Building.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBuilding) {
      return errorResponse("Building not found", 404);
    }

    const responseMessage = body.floors && Array.isArray(body.floors) 
      ? `Building updated successfully with ${body.floors.length} floors created`
      : "Building updated successfully";

    // Invalidate cache
    await safeRedisDelCache(`building:${id}`);
    await safeRedisDelCache(`buildings:all`);
    if (updatedBuilding && !Array.isArray(updatedBuilding) && updatedBuilding.projectId) {
      await safeRedisDelCache(`buildings:project:${updatedBuilding.projectId}`);
    }

    return successResponse(updatedBuilding, responseMessage);
  } catch (error: unknown) {
    logger.error("Error updating building", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update building", 500);
  }
};

export const PATCH = async (req: NextRequest) => {
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
