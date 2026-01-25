import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { NotificationQueue } from "@/lib/middleware/notificationMiddleware";

// POST: Add notification to queue for batch processing
export const POST = async (req: NextRequest) => {
  try {
    const {
      userIds,
      projectId,
      title,
      body,
      data = {},
      options = {},
      priority = 'normal'
    } = await req.json();
    
    // Validation
    if (!title || !body) {
      return errorResponse("Title and body are required", 400);
    }
    
    if (!userIds && !projectId) {
      return errorResponse("Either userIds or projectId is required", 400);
    }
    
    if (priority && !['low', 'normal', 'high'].includes(priority)) {
      return errorResponse("Priority must be 'low', 'normal', or 'high'", 400);
    }
    
    console.log('📬 Adding notification to queue...');
    
    let targetUserIds = userIds;
    
    // If projectId is provided, get project admins
    if (projectId && !userIds) {
      const { Projects } = await import("@/lib/models/Project");
      const project = await Projects.findById(projectId)
        .select('assignedStaff name')
        .lean() as any;
        
      if (!project || !project.assignedStaff || project.assignedStaff.length === 0) {
        return errorResponse("No assigned staff found for project", 404);
      }
      
      targetUserIds = project.assignedStaff.map((staff: any) => staff._id);
      
      // Add project info to data
      data.projectId = projectId;
      data.projectName = project.name;
    }
    
    if (!targetUserIds || targetUserIds.length === 0) {
      return errorResponse("No target users found", 400);
    }
    
    // Add to queue
    const notificationId = await NotificationQueue.addToQueue(
      targetUserIds,
      title,
      body,
      data,
      options,
      priority
    );
    
    // Get queue status
    const queueStatus = NotificationQueue.getQueueStatus();
    
    console.log(`✅ Notification queued: ${notificationId}`);
    
    return successResponse(
      {
        notificationId,
        targetUsers: targetUserIds.length,
        priority,
        queueStatus,
      },
      "Notification added to queue successfully",
      201
    );
    
  } catch (error: unknown) {
    console.error('❌ Error adding notification to queue:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to queue notification", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// GET: Get queue status
export const GET = async (req: NextRequest) => {
  try {
    const queueStatus = NotificationQueue.getQueueStatus();
    
    return successResponse(
      queueStatus,
      "Queue status retrieved successfully",
      200
    );
    
  } catch (error: unknown) {
    console.error('❌ Error getting queue status:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to get queue status", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// DELETE: Clear queue
export const DELETE = async (req: NextRequest) => {
  try {
    NotificationQueue.clearQueue();
    
    return successResponse(
      { cleared: true, timestamp: new Date().toISOString() },
      "Queue cleared successfully",
      200
    );
    
  } catch (error: unknown) {
    console.error('❌ Error clearing queue:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to clear queue", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};