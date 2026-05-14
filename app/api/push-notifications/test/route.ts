import connect from "@/lib/db";
import { PushNotificationService } from "@/lib/services/pushNotificationService";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { checkValidClient } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST: Send test push notification
export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();

    const {
      userIds,
      projectId,
      title = '🧪 Test Notification',
      body = 'This is a test notification to verify the push notification system is working correctly.',
      data = {},
    } = await req.json();

    console.log('🧪 Sending test push notification...');

    let result;

    if (projectId) {
      // Send to project admins
      console.log('📱 Sending test notification to project admins:', projectId);
      
      result = await PushNotificationService.sendToProjectAdmins(
        projectId,
        title,
        body,
        {
          ...data,
          isTest: true,
          testTimestamp: new Date().toISOString(),
        },
        {
          sound: 'default',
          priority: 'high',
          ttl: 3600,
        }
      );
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Send to specific users
      console.log('📱 Sending test notification to users:', userIds);
      
      result = await PushNotificationService.sendToUsers(
        userIds,
        title,
        body,
        {
          ...data,
          isTest: true,
          testTimestamp: new Date().toISOString(),
        },
        {
          sound: 'default',
          priority: 'high',
          ttl: 3600,
        }
      );
    } else {
      return errorResponse("Either 'userIds' array or 'projectId' is required", 400);
    }

    if (result.success) {
      console.log(`✅ Test notification sent: ${result.messagesSent} messages`);
      
      return successResponse(
        {
          messagesSent: result.messagesSent,
          errors: result.errors,
          success: result.success,
        },
        `Test notification sent successfully to ${result.messagesSent} devices`,
        200
      );
    } else {
      console.error('❌ Test notification failed:', result.errors);
      
      return errorResponse(
        "Test notification failed",
        500,
        result.errors.join(', ')
      );
    }

  } catch (error: unknown) {
    console.error('❌ Error sending test push notification:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to send test notification", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};