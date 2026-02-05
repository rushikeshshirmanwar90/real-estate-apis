import { Projects } from "@/lib/models/Project";
import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";

export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId || !isValidObjectId(projectId)) {
      return errorResponse("Valid project ID is required", 400);
    }

    console.log('🔍 DEBUG: Fetching project sections for:', projectId);

    const project = await Projects.findById(projectId);
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    console.log('🔍 DEBUG: Project found:', project.name);
    console.log('🔍 DEBUG: Project has', project.section?.length || 0, 'sections');

    const sectionsInfo = project.section?.map((s: any) => ({
      _id: s._id?.toString(),
      sectionId: s.sectionId,
      name: s.name,
      type: s.type,
      isCompleted: s.isCompleted,
      hasIsCompletedField: s.hasOwnProperty('isCompleted'),
      isCompletedType: typeof s.isCompleted
    })) || [];

    console.log('🔍 DEBUG: Sections info:', sectionsInfo);

    return successResponse({
      projectId,
      projectName: project.name,
      sectionsCount: project.section?.length || 0,
      sections: sectionsInfo
    }, "Project sections debug info retrieved successfully");

  } catch (error) {
    console.error('❌ DEBUG: Error fetching project sections:', error);
    return errorResponse("Failed to fetch project sections debug info", 500);
  }
};