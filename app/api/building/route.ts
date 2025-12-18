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

      const building = await Building.findById(id).lean();
      if (!building) {
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
      const newBuilding = new Building(body);
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

    const updatedBuilding = await Building.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBuilding) {
      return errorResponse("Building not found", 404);
    }

    return successResponse(updatedBuilding, "Building updated successfully");
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
