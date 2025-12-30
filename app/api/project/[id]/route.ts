import { Projects } from "@/lib/models/Project";
import { Building } from "@/lib/models/Building";
import { Section } from "@/lib/models/Section";
import { RowHouse } from "@/lib/models/RowHouse";
import { RoomInfo } from "@/lib/models/RoomInfo";
import { OtherSection } from "@/lib/models/OtherSection";
import { CustomerDetails } from "@/lib/models/CustomerDetails";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { MiniSection } from "@/lib/models/Xsite/mini-section";
import { Activity } from "@/lib/models/Xsite/Activity";
import { Updates } from "@/lib/models/updates";
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

// DELETE project by ID with cascading delete
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

    // Start a transaction for cascading delete
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // First, get the project to be deleted for logging
      const projectToDelete = await Projects.findById(id).lean();
      if (!projectToDelete || !isSingleDocument(projectToDelete)) {
        await session.abortTransaction();
        return errorResponse("Project not found", 404);
      }

      const project = projectToDelete as ProjectDocument;
      logger.info(`Starting cascading delete for project: ${project.projectName || project.name} (${id})`);

      // Delete all related data in the correct order (children first, then parents)
      
      // 1. Delete Activities (logs related to this project)
      const deletedActivities = await Activity.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedActivities.deletedCount} activities for project ${id}`);

      // 2. Delete Material Activities
      const deletedMaterialActivities = await MaterialActivity.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedMaterialActivities.deletedCount} material activities for project ${id}`);

      // 3. Delete Updates
      const deletedUpdates = await Updates.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedUpdates.deletedCount} updates for project ${id}`);

      // 4. Delete Customer Details (properties related to this project)
      const deletedCustomerDetails = await CustomerDetails.deleteMany({ 
        "properties.projectId": id 
      }, { session });
      logger.info(`Deleted ${deletedCustomerDetails.deletedCount} customer details for project ${id}`);

      // 5. Delete Buildings (this will also delete all floors and units within them)
      const deletedBuildings = await Building.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedBuildings.deletedCount} buildings for project ${id}`);

      // 6. Delete Sections
      const deletedSections = await Section.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedSections.deletedCount} sections for project ${id}`);

      // 7. Delete Row Houses
      const deletedRowHouses = await RowHouse.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedRowHouses.deletedCount} row houses for project ${id}`);

      // 8. Delete Room Info
      const deletedRoomInfo = await RoomInfo.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedRoomInfo.deletedCount} room info records for project ${id}`);

      // 9. Delete Other Sections
      const deletedOtherSections = await OtherSection.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedOtherSections.deletedCount} other sections for project ${id}`);

      // 10. Delete Mini Sections
      const deletedMiniSections = await MiniSection.deleteMany({ projectId: id }, { session });
      logger.info(`Deleted ${deletedMiniSections.deletedCount} mini sections for project ${id}`);

      // 11. Finally, delete the project itself
      const deletedProject = await Projects.findByIdAndDelete(id, { session }).lean();
      if (!deletedProject) {
        await session.abortTransaction();
        return errorResponse("Failed to delete project", 500);
      }

      // Commit the transaction
      await session.commitTransaction();
      logger.info(`Successfully completed cascading delete for project ${id}`);

      // Log activity for project deletion (after successful deletion)
      const userInfo = extractUserInfo(req);
      if (userInfo && project) {
        try {
          // Create a new session for activity logging (outside the main transaction)
          await logActivity({
            user: userInfo,
            clientId: project.clientId?.toString() || 'unknown',
            projectId: project._id?.toString() || id,
            projectName: project.projectName || project.name || 'Deleted Project',
            activityType: "project_deleted",
            category: "project",
            action: "delete",
            description: `Deleted project and all related data: ${project.projectName || project.name || 'Unnamed Project'}`,
            message: `Project and all related data deleted successfully`,
            metadata: {
              deletedProjectData: {
                name: project.projectName || project.name,
                location: project.location,
                type: project.type
              },
              cascadingDeleteSummary: {
                buildings: deletedBuildings.deletedCount,
                sections: deletedSections.deletedCount,
                rowHouses: deletedRowHouses.deletedCount,
                roomInfo: deletedRoomInfo.deletedCount,
                otherSections: deletedOtherSections.deletedCount,
                miniSections: deletedMiniSections.deletedCount,
                materialActivities: deletedMaterialActivities.deletedCount,
                activities: deletedActivities.deletedCount,
                updates: deletedUpdates.deletedCount,
                customerDetails: deletedCustomerDetails.deletedCount
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

      return successResponse(
        {
          deletedProject: project,
          cascadingDeleteSummary: {
            buildings: deletedBuildings.deletedCount,
            sections: deletedSections.deletedCount,
            rowHouses: deletedRowHouses.deletedCount,
            roomInfo: deletedRoomInfo.deletedCount,
            otherSections: deletedOtherSections.deletedCount,
            miniSections: deletedMiniSections.deletedCount,
            materialActivities: deletedMaterialActivities.deletedCount,
            activities: deletedActivities.deletedCount,
            updates: deletedUpdates.deletedCount,
            customerDetails: deletedCustomerDetails.deletedCount
          }
        },
        "Project and all related data deleted successfully"
      );

    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      logger.error("Error during cascading delete, transaction rolled back", error);
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error: unknown) {
    logger.error("Error deleting project", error);
    return errorResponse("Failed to delete project and related data", 500);
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