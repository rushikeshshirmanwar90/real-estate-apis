import { MiniSection } from "@/lib/models/MiniSection";
import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logActivity } from "@/lib/utils/activity-logger";

export const PATCH = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const { miniSectionId, isCompleted, clientId, staffId, completedBy } = body;

    // Validation
    if (!miniSectionId || typeof isCompleted !== 'boolean') {
      return errorResponse("Missing required fields: miniSectionId, isCompleted", 400);
    }

    if (!isValidObjectId(miniSectionId)) {
      return errorResponse("Invalid mini-section ID format", 400);
    }

    const updateData: any = { 
      isCompleted,
      ...(isCompleted && { completedAt: new Date(), completedBy })
    };

    const updatedMiniSection = await MiniSection.findByIdAndUpdate(
      miniSectionId,
      updateData,
      { new: true }
    );

    if (!updatedMiniSection) {
      return errorResponse("Mini-section not found", 404);
    }

    // Log activity
    if (clientId && staffId) {
      try {
        await logActivity({
          clientId,
          staffId,
          activityType: isCompleted ? 'mini_section_completed' : 'mini_section_reopened',
          description: `Mini-section "${updatedMiniSection.name}" ${isCompleted ? 'marked as completed' : 'reopened'}`,
          projectId: updatedMiniSection.projectId,
          sectionId: updatedMiniSection.sectionId,
          miniSectionId: miniSectionId,
          metadata: {
            miniSectionName: updatedMiniSection.name,
            previousStatus: !isCompleted,
            newStatus: isCompleted,
            completedBy: completedBy || staffId
          }
        });
      } catch (logError) {
        console.error('Failed to log mini-section completion activity:', logError);
        // Don't fail the request if logging fails
      }
    }

    return successResponse(
      updatedMiniSection,
      `Mini-section completion status updated successfully`
    );

  } catch (error) {
    console.error('Error updating mini-section completion status:', error);
    return errorResponse("Failed to update mini-section completion status", 500);
  }
};

export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");
    const projectId = searchParams.get("projectId");

    if (!sectionId) {
      return errorResponse("Section ID is required", 400);
    }

    if (!isValidObjectId(sectionId)) {
      return errorResponse("Invalid section ID format", 400);
    }

    const query: any = { sectionId };
    if (projectId) {
      if (!isValidObjectId(projectId)) {
        return errorResponse("Invalid project ID format", 400);
      }
      query.projectId = projectId;
    }

    const miniSections = await MiniSection.find(query).sort({ createdAt: -1 });

    return successResponse(
      miniSections,
      "Mini-sections retrieved successfully"
    );

  } catch (error) {
    console.error('Error fetching mini-sections:', error);
    return errorResponse("Failed to fetch mini-sections", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const { name, sectionId, projectId, description, clientId, staffId } = body;

    // Validation
    if (!name || !sectionId || !projectId) {
      return errorResponse("Missing required fields: name, sectionId, projectId", 400);
    }

    if (!isValidObjectId(sectionId) || !isValidObjectId(projectId)) {
      return errorResponse("Invalid section ID or project ID format", 400);
    }

    const newMiniSection = new MiniSection({
      name,
      sectionId,
      projectId,
      description: description || '',
      isCompleted: false
    });

    const savedMiniSection = await newMiniSection.save();

    // Log activity
    if (clientId && staffId) {
      try {
        await logActivity({
          clientId,
          staffId,
          activityType: 'mini_section_created',
          description: `Mini-section "${name}" created`,
          projectId,
          sectionId,
          miniSectionId: savedMiniSection._id.toString(),
          metadata: {
            miniSectionName: name,
            description: description || ''
          }
        });
      } catch (logError) {
        console.error('Failed to log mini-section creation activity:', logError);
        // Don't fail the request if logging fails
      }
    }

    return successResponse(
      savedMiniSection,
      "Mini-section created successfully"
    );

  } catch (error) {
    console.error('Error creating mini-section:', error);
    return errorResponse("Failed to create mini-section", 500);
  }
};