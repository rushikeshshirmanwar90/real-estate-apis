import { Projects } from "@/lib/models/Project";
import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import {
  getPaginationParams,
  createPaginationMeta,
} from "@/lib/utils/pagination";
import { logger } from "@/lib/utils/logger";
import { requireValidClient } from "@/lib/utils/client-validation";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    await connect();

    // ✅ Validate client exists before fetching projects
    try {
      await requireValidClient(clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid project ID format", 400);
      }

      const project = await Projects.findOne({
        _id: new ObjectId(id),
        clientId: new ObjectId(clientId),
      }).lean();

      if (!project) {
        return errorResponse("Project not found", 404);
      }

      return successResponse(project, "Project retrieved successfully");
    }

    // Pagination
    const { page, limit, skip } = getPaginationParams(req);

    const [projects, total] = await Promise.all([
      Projects.find({ clientId: new ObjectId(clientId) })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Projects.countDocuments({ clientId: new ObjectId(clientId) }),
    ]);

    const meta = createPaginationMeta(page, limit, total);

    return successResponse(
      { projects, meta },
      `Retrieved ${projects.length} project(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error fetching projects", error);
    return errorResponse("Failed to fetch projects", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const body = await req.json();

    // Validate required fields
    if (!body.clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(body.clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // ✅ Validate client exists before creating project
    try {
      await requireValidClient(body.clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    const formattedBody = {
      ...body,
      clientId: new ObjectId(body.clientId),
    };

    const newProject = new Projects(formattedBody);
    await newProject.save();

    // ✅ Log activity for project creation
    const userInfo = extractUserInfo(req, body);
    if (userInfo) {
      await logActivity({
        user: userInfo,
        clientId: body.clientId,
        projectId: newProject._id.toString(),
        projectName: newProject.projectName || newProject.name || 'Unnamed Project',
        activityType: "project_created",
        category: "project",
        action: "create",
        description: `Created new project: ${newProject.projectName || newProject.name || 'Unnamed Project'}`,
        message: `Project created successfully with ID: ${newProject._id}`,
        metadata: {
          projectData: {
            name: newProject.projectName || newProject.name,
            location: newProject.location,
            type: newProject.type
          }
        }
      });
    } else {
      console.log('⚠️ No user info available for activity logging - skipping activity log');
    }

    return successResponse(newProject, "Project created successfully", 201);
  } catch (error: unknown) {
    logger.error("Error creating project", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create project", 500);
  }
};

// DELETE and PUT methods moved to /api/project/[id]/route.ts for proper dynamic routing
