import { Projects } from "@/lib/models/Project";
import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
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
    const staffId = searchParams.get("staffId"); // Add staffId parameter for filtering

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // Validate staffId if provided
    if (staffId && !isValidObjectId(staffId)) {
      return errorResponse("Invalid staff ID format", 400);
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

      // Build query for single project
      const projectQuery: any = {
        _id: new Types.ObjectId(id),
        clientId: new Types.ObjectId(clientId),
      };

      // If staffId is provided, filter by assigned staff
      if (staffId) {
        projectQuery["assignedStaff._id"] = staffId;
      }

      const project = await Projects.findOne(projectQuery).lean();

      if (!project) {
        return errorResponse("Project not found or not assigned to this staff member", 404);
      }

      return successResponse(project, "Project retrieved successfully");
    }

    // Pagination
    const { page, limit, skip } = getPaginationParams(req);

    // Build query for multiple projects
    const projectsQuery: any = { clientId: new Types.ObjectId(clientId) };

    // If staffId is provided, filter by assigned staff
    if (staffId) {
      projectsQuery["assignedStaff._id"] = staffId;
      console.log(`🔍 Filtering projects for staff ID: ${staffId}`);
    }

    const [projects, total] = await Promise.all([
      Projects.find(projectsQuery)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Projects.countDocuments(projectsQuery),
    ]);

    console.log(`📊 Found ${projects.length} projects for clientId: ${clientId}${staffId ? `, staffId: ${staffId}` : ''}`);

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
      clientId: new Types.ObjectId(body.clientId),
    };

    const newProject = new Projects(formattedBody);
    await newProject.save();

    // ✅ SYNC STAFF ASSIGNMENTS: Add project to Staff model when assignedStaff is provided
    if (body.assignedStaff && Array.isArray(body.assignedStaff) && body.assignedStaff.length > 0) {
      try {
        console.log(`🔄 Syncing ${body.assignedStaff.length} staff assignments for new project ${newProject._id}`);
        
        // Import utility function
        const { addProjectToStaff } = await import("@/lib/utils/staffProjectUtils");

        // Add each assigned staff member to the Staff model
        for (const staff of body.assignedStaff) {
          try {
            console.log(`➕ Adding project to staff ${staff.fullName} (${staff._id})`);
            
            await addProjectToStaff(
              staff._id,
              newProject._id.toString(),
              newProject.name || newProject.projectName || 'Unknown Project',
              body.clientId,
              'Unknown Client' // We don't have client name in project creation data
            );
            
            console.log(`✅ Successfully added project to staff ${staff.fullName}'s assignedProjects`);
          } catch (error) {
            console.error(`❌ Error adding project to staff ${staff.fullName}:`, error);
            // Continue with other staff members even if one fails
          }
        }

        console.log(`✅ Staff synchronization completed for new project ${newProject._id}`);
      } catch (error) {
        console.error(`❌ Error during staff synchronization for new project ${newProject._id}:`, error);
        // Don't fail the project creation if staff sync fails, but log the error
        logger.error("Staff synchronization failed during project creation", { 
          projectId: newProject._id, 
          error: error 
        });
      }
    }

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
      return errorResponse("Invalid project ID format", 400);
    }

    const updatedProject = await Projects.findByIdAndUpdate(
      id,
      { isCompleted },
      { new: true }
    );

    if (!updatedProject) {
      return errorResponse("Project not found", 404);
    }

    // Log activity
    if (clientId && staffId) {
      try {
        await logActivity({
          clientId,
          staffId,
          activityType: 'other' as any,
          description: `Project ${isCompleted ? 'marked as completed' : 'reopened'}`,
          projectId: id,
          metadata: {
            previousStatus: !isCompleted,
            newStatus: isCompleted,
            itemType: 'project',
            itemId: id
          }
        });
      } catch (logError) {
        console.error('Failed to log project completion activity:', logError);
        // Don't fail the request if logging fails
      }
    }

    return successResponse(
      updatedProject,
      "Project completion status updated successfully"
    );

  } catch (error) {
    console.error('Error updating project completion status:', error);
    return errorResponse("Failed to update project completion status", 500);
  }
};
