import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

// POST - Initialize spent field for a project
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const { projectId } = await req.json();

    if (!projectId) {
      return errorResponse("Project ID is required", 400);
    }

    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    // Get current project
    const project = await Projects.findById(projectId);
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    console.log('🔧 Initializing spent field for project:', {
      projectId,
      currentSpent: project.spent,
      spentType: typeof project.spent,
      spentIsNull: project.spent === null,
      spentIsUndefined: project.spent === undefined
    });

    // Initialize spent field to 0 if it's null or undefined
    let updatedProject;
    if (project.spent === null || project.spent === undefined) {
      updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        { $set: { spent: 0 } },
        { new: true }
      );
      
      console.log('✅ Spent field initialized to 0');
    } else {
      updatedProject = project;
      console.log('ℹ️ Spent field already has a value:', project.spent);
    }

    return successResponse(
      {
        projectId,
        previousSpent: project.spent,
        newSpent: updatedProject?.spent,
        wasInitialized: project.spent === null || project.spent === undefined
      },
      "Project spent field initialization completed"
    );
  } catch (error: unknown) {
    console.error('❌ Failed to initialize spent field:', error);
    logger.error("Failed to initialize spent field", error);
    return errorResponse("Failed to initialize spent field", 500);
  }
};

// GET - Check spent field status for all projects
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    // Get all projects and check their spent field status
    const projects = await Projects.find({}, { _id: 1, name: 1, spent: 1 }).lean();

    const projectStatus = projects.map(project => ({
      id: project._id,
      name: project.name,
      spent: project.spent,
      spentType: typeof project.spent,
      spentIsNull: project.spent === null,
      spentIsUndefined: project.spent === undefined,
      needsInitialization: project.spent === null || project.spent === undefined
    }));

    const needsInitialization = projectStatus.filter(p => p.needsInitialization);

    console.log('📊 Project spent field status:', {
      totalProjects: projects.length,
      needsInitialization: needsInitialization.length,
      projectsWithSpent: projects.length - needsInitialization.length
    });

    return successResponse(
      {
        totalProjects: projects.length,
        needsInitialization: needsInitialization.length,
        projectsWithSpent: projects.length - needsInitialization.length,
        projects: projectStatus
      },
      "Project spent field status retrieved successfully"
    );
  } catch (error: unknown) {
    console.error('❌ Failed to check spent field status:', error);
    return errorResponse("Failed to check spent field status", 500);
  }
};