import { Projects } from "@/lib/models/Project";
import connect from "@/lib/db";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { requireValidClient } from "@/lib/utils/client-validation";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";

// Type for project document
interface ProjectDocument {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  projectName?: string;
  name?: string;
  location?: string;
  type?: string;
  spent?: number;
  materials?: any[];
  [key: string]: any;
}

// Type guard to ensure we have a single document, not an array
function isSingleDocument(doc: any): doc is ProjectDocument {
  return doc && !Array.isArray(doc) && typeof doc === 'object' && doc._id;
}

// GET single project by ID
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid project ID format", 400);
    }

    await connect();

    // Validate client exists
    try {
      await requireValidClient(clientId);
    } catch (clientError) {
      logger.error("Client validation failed", { clientId, error: clientError });
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    const projectResult = await Projects.findOne({
      _id: id,
      clientId: clientId,
    }).lean();

    if (!projectResult || !isSingleDocument(projectResult)) {
      return errorResponse("Project not found", 404);
    }

    const project = projectResult as ProjectDocument;

    return successResponse(project, "Project retrieved successfully");
  } catch (error: unknown) {
    logger.error("Error fetching project", error);
    return errorResponse("Failed to fetch project", 500);
  }
};

// DELETE project by ID
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid project ID format", 400);
    }

    await connect();

    // Delete the project
    const deletedProjectResult = await Projects.findByIdAndDelete(id).lean();

    if (!deletedProjectResult || !isSingleDocument(deletedProjectResult)) {
      return errorResponse("Project not found", 404);
    }
    const deletedProject = deletedProjectResult as ProjectDocument;

    // Log activity for project deletion
    const userInfo = extractUserInfo(req);
    if (userInfo && deletedProject) {
      try {
        await logActivity({
          user: userInfo,
          clientId: deletedProject.clientId?.toString() || 'unknown',
          projectId: deletedProject._id?.toString() || id,
          projectName: deletedProject.projectName || deletedProject.name || 'Deleted Project',
          activityType: "project_deleted",
          category: "project",
          action: "delete",
          description: `Deleted project: ${deletedProject.projectName || deletedProject.name || 'Unnamed Project'}`,
          message: `Project deleted successfully`,
          metadata: {
            deletedProjectData: {
              name: deletedProject.projectName || deletedProject.name,
              location: deletedProject.location,
              type: deletedProject.type
            }
          }
        });
      } catch (activityError) {
        logger.error("Failed to log delete activity", activityError);
        // Don't fail the delete operation if activity logging fails
      }
    } else {
      logger.warn('No user info available for delete activity logging - skipping activity log');
    }

    return successResponse(deletedProject, "Project deleted successfully");
  } catch (error: unknown) {
    logger.error("Error deleting project", error);
    return errorResponse("Failed to delete project", 500);
  }
};

// PUT update project by ID
export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid project ID format", 400);
    }

    await connect();

    let body: any;
    try {
      body = await req.json();
    } catch (parseError) {
      return errorResponse("Invalid JSON in request body", 400);
    }

    // Validate required fields for update
    if (body.clientId && !isValidObjectId(body.clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // Ensure we have something to update
    if (!body || Object.keys(body).length === 0) {
      return errorResponse("No update data provided", 400);
    }

    // Prepare update data
    const updateData = { ...body };
    // MongoDB will automatically convert string IDs to ObjectIds

    // Update the project
    const updatedProjectResult = await Projects.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProjectResult || !isSingleDocument(updatedProjectResult)) {
      return errorResponse("Project not found", 404);
    }
    const updatedProject = updatedProjectResult as ProjectDocument;

    // Log activity for project update
    const userInfo = extractUserInfo(req, body);
    if (userInfo) {
      try {
        await logActivity({
          user: userInfo,
          clientId: updatedProject.clientId?.toString() || 'unknown',
          projectId: updatedProject._id?.toString() || id,
          projectName: updatedProject.projectName || updatedProject.name || 'Updated Project',
          activityType: "project_updated",
          category: "project",
          action: "update",
          description: `Updated project: ${updatedProject.projectName || updatedProject.name || 'Unnamed Project'}`,
          message: `Project updated successfully`,
          changedData: Object.keys(body).filter(key => key !== 'user').map(field => ({
            field,
            newValue: body[field]
          })),
          metadata: {
            updatedFields: Object.keys(body).filter(key => key !== 'user'),
            projectData: {
              name: updatedProject.projectName || updatedProject.name,
              location: updatedProject.location,
              type: updatedProject.type
            }
          }
        });
      } catch (activityError) {
        logger.error("Failed to log update activity", activityError);
        // Don't fail the update operation if activity logging fails
      }
    } else {
      logger.warn('No user info available for update activity logging - skipping activity log');
    }

    return successResponse(updatedProject, "Project updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating project", error);
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }
    return errorResponse("Failed to update project", 500);
  }
};