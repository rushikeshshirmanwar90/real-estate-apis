import connect from "@/lib/db";
import { notifyMaterialActivityCreated } from "@/lib/services/notificationService";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * POST /api/test-material-notification
 * 
 * Test endpoint for material activity notifications
 * Used by the production test script to verify notification functionality
 */
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const materialActivity = await req.json();

    console.log('🧪 Testing material activity notification:', {
      clientId: materialActivity.clientId,
      projectId: materialActivity.projectId,
      activity: materialActivity.activity,
      materialsCount: materialActivity.materials?.length || 0,
      userId: materialActivity.user?.userId
    });

    // Validation
    if (!materialActivity.clientId) {
      return errorResponse("clientId is required", 400);
    }

    if (!materialActivity.projectId) {
      return errorResponse("projectId is required", 400);
    }

    if (!materialActivity.user?.userId) {
      return errorResponse("user.userId is required", 400);
    }

    if (!materialActivity.activity) {
      return errorResponse("activity is required", 400);
    }

    if (!materialActivity.materials || !Array.isArray(materialActivity.materials)) {
      return errorResponse("materials array is required", 400);
    }

    // Add test metadata
    const testMaterialActivity = {
      ...materialActivity,
      _id: `test_${Date.now()}`,
      isTest: true,
      timestamp: new Date().toISOString(),
      // Ensure required fields have defaults
      projectName: materialActivity.projectName || 'Test Project',
      message: materialActivity.message || 'Test material activity notification'
    };

    // Send notification using the material notification service
    console.log('📦 Sending material activity notification...');
    const result = await notifyMaterialActivityCreated(testMaterialActivity);

    console.log('📊 Material notification result:', {
      success: result.success,
      recipientCount: result.recipientCount,
      deliveredCount: result.deliveredCount,
      failedCount: result.failedCount,
      errors: result.errors.length
    });

    if (result.success) {
      return successResponse(
        {
          recipientCount: result.recipientCount,
          deliveredCount: result.deliveredCount,
          failedCount: result.failedCount,
          errors: result.errors,
          processingTimeMs: result.processingTimeMs,
          notificationId: result.notificationId,
          testData: {
            activity: testMaterialActivity.activity,
            materialsCount: testMaterialActivity.materials.length,
            projectName: testMaterialActivity.projectName,
            timestamp: testMaterialActivity.timestamp
          }
        },
        `Test material notification sent successfully: ${result.deliveredCount}/${result.recipientCount} delivered`,
        200
      );
    } else {
      return errorResponse(
        "Test material notification failed to send",
        500,
        {
          recipientCount: result.recipientCount,
          deliveredCount: result.deliveredCount,
          failedCount: result.failedCount,
          errors: result.errors,
          processingTimeMs: result.processingTimeMs
        }
      );
    }

  } catch (error: unknown) {
    console.error('❌ Error in test material notification:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to send test material notification", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};