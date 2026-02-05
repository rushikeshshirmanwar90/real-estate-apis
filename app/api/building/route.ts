import { Building } from "@/lib/models/Building";
import { Projects } from "@/lib/models/Project";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import {
  getPaginationParams,
  createPaginationMeta,
} from "@/lib/utils/pagination";
import { logger } from "@/lib/utils/logger";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";

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
              
              return successResponse(building, "Building created and retrieved successfully");
            }
          }
        } catch (createError) {
          logger.error("Error creating missing building", createError);
        }
        
        return errorResponse("Building not found", 404);
      }

      return successResponse(building, "Building retrieved successfully");
    }

    // Build filter
    const filter = projectId ? { projectId } : {};

    if (projectId && !isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    // Pagination
    const { page, limit, skip } = getPaginationParams(req);

    const [buildings, total] = await Promise.all([
      Building.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Building.countDocuments(filter),
    ]);

    const meta = createPaginationMeta(page, limit, total);

    return successResponse(
      { buildings, meta },
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

    // Use transaction for atomicity
    await connect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create building with proper defaults
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
      const savedBuilding = await newBuilding.save({ session });

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
        { new: true, session }
      );

      if (!updatedProject) {
        await session.abortTransaction();
        return errorResponse("Project not found", 404);
      }

      await session.commitTransaction();

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

      return successResponse(
        savedBuilding,
        "Building created successfully",
        201
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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

    // Use transaction for atomicity
    await connect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        { $pull: { section: { sectionId: sectionId } } },
        { new: true, session }
      );

      if (!updatedProject) {
        await session.abortTransaction();
        return errorResponse("Project not found", 404);
      }

      const deletedBuilding = await Building.findByIdAndDelete(sectionId, {
        session,
      }).lean();

      if (!deletedBuilding) {
        await session.abortTransaction();
        return errorResponse("Building not found", 404);
      }

      await session.commitTransaction();

      return successResponse(deletedBuilding, "Building deleted successfully");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedBuilding = await Building.findByIdAndUpdate(
        id,
        { isCompleted },
        { new: true, session }
      );

      if (!updatedBuilding) {
        await session.abortTransaction();
        return errorResponse("Building not found", 404);
      }

      // Also update the section in the project
      await Projects.updateOne(
        { "section.sectionId": id },
        { $set: { "section.$.isCompleted": isCompleted } },
        { session }
      );

      // Log activity
      if (clientId && staffId) {
        try {
          await logActivity({
            clientId,
            staffId,
            activityType: 'other' as any,
            description: `Building ${isCompleted ? 'marked as completed' : 'reopened'}`,
            projectId: updatedBuilding.projectId,
            sectionId: id,
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

      await session.commitTransaction();

      return successResponse(
        updatedBuilding,
        "Building completion status updated successfully"
      );

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error updating building completion status:', error);
    return errorResponse("Failed to update building completion status", 500);
  }
};
