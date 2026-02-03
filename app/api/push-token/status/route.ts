import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

// GET: Get push token system status
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    // Get overall statistics
    const totalTokens = await PushToken.countDocuments();
    const activeTokens = await PushToken.countDocuments({ isActive: true });
    const inactiveTokens = await PushToken.countDocuments({ isActive: false });

    // Get tokens by platform
    const iosTokens = await PushToken.countDocuments({ platform: 'ios', isActive: true });
    const androidTokens = await PushToken.countDocuments({ platform: 'android', isActive: true });
    const webTokens = await PushToken.countDocuments({ platform: 'web', isActive: true });

    // Get tokens by user type
    const adminTokens = await PushToken.countDocuments({ userType: 'admin', isActive: true });
    const staffTokens = await PushToken.countDocuments({ userType: 'staff', isActive: true });
    const clientTokens = await PushToken.countDocuments({ userType: 'client', isActive: true });

    // Get recent activity (tokens used in last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentlyUsed = await PushToken.countDocuments({
      isActive: true,
      lastUsed: { $gte: yesterday }
    });

    const status = {
      system: {
        status: 'operational',
        timestamp: new Date().toISOString(),
      },
      tokens: {
        total: totalTokens,
        active: activeTokens,
        inactive: inactiveTokens,
        recentlyUsed: recentlyUsed,
      },
      platforms: {
        ios: iosTokens,
        android: androidTokens,
        web: webTokens,
      },
      userTypes: {
        admin: adminTokens,
        staff: staffTokens,
        client: clientTokens,
      },
    };

    console.log('📊 Push token system status:', status);

    return successResponse(
      status,
      "Push token system status retrieved successfully",
      200
    );

  } catch (error: unknown) {
    console.error('❌ Error getting push token status:', error);
    
    const errorStatus = {
      system: {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      tokens: {
        total: 0,
        active: 0,
        inactive: 0,
        recentlyUsed: 0,
      },
      platforms: {
        ios: 0,
        android: 0,
        web: 0,
      },
      userTypes: {
        admin: 0,
        staff: 0,
        client: 0,
      },
    };

    if (error instanceof Error) {
      return successResponse(errorStatus, "Failed to get push token status", 500);
    }
    return successResponse(errorStatus, "Unknown error occurred", 500);
  }
};