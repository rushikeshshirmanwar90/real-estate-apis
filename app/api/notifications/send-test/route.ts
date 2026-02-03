import connect from "@/lib/db";
import { PushNotificationService } from "@/lib/services/pushNotificationService";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * POST /api/notifications/send-test
 * 
 * Send test push notifications to specific users
 */
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const {
      userIds,
      title = 'Test Notification',
      body = 'This is a test notification',
      data = {},
      options = {}
    } = await req.json();

    console.log('🧪 Sending test notification to users:', userIds);

    // Validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return errorResponse("userIds array is required and must not be empty", 400);
    }

    if (userIds.length > 100) {
      return errorResponse("Cannot send to more than 100 users at once", 400);
    }

    // Add test metadata to data
    const testData = {
      ...data,
      isTest: true,
      testId: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    // Send notifications using the push notification service
    const result = await PushNotificationService.sendToUsers(
      userIds,
      title,
      body,
      testData,
      {
        sound: options.sound || 'default',
        priority: options.priority || 'high',
        ttl: options.ttl || 3600,
        badge: options.badge
      }
    );

    console.log('📱 Test notification result:', {
      success: result.success,
      messagesSent: result.messagesSent,
      errors: result.errors.length
    });

    if (result.success) {
      return successResponse(
        {
          messagesSent: result.messagesSent,
          recipientCount: userIds.length,
          errors: result.errors,
          testData: {
            title,
            body,
            userIds: userIds.length,
            timestamp: new Date().toISOString()
          }
        },
        `Test notification sent successfully to ${result.messagesSent} recipients`,
        200
      );
    } else {
      return errorResponse(
        "Test notification failed to send",
        500,
        {
          messagesSent: result.messagesSent,
          errors: result.errors,
          recipientCount: userIds.length
        }
      );
    }

  } catch (error: unknown) {
    console.error('❌ Error sending test notification:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to send test notification", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};