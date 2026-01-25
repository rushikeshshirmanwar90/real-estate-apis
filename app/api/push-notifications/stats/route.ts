import connect from "@/lib/db";
import { PushNotificationService } from "@/lib/services/pushNotificationService";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

// GET: Get push notification statistics
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    console.log('📊 Fetching push notification statistics...');

    const stats = await PushNotificationService.getStatistics();

    return successResponse(
      stats,
      "Push notification statistics retrieved successfully",
      200
    );

  } catch (error: unknown) {
    console.error('❌ Error fetching push notification statistics:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to fetch statistics", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// POST: Cleanup invalid tokens
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const { action } = await req.json();

    if (action === 'cleanup') {
      console.log('🧹 Starting push token cleanup...');
      
      const cleanedCount = await PushNotificationService.cleanupInvalidTokens();
      
      return successResponse(
        { cleanedTokens: cleanedCount },
        `Cleaned up ${cleanedCount} invalid push tokens`,
        200
      );
    }

    return errorResponse("Invalid action. Use 'cleanup'", 400);

  } catch (error: unknown) {
    console.error('❌ Error in push notification management:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to perform action", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};