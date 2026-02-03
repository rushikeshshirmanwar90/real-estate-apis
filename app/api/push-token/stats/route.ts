import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * GET /api/push-token/stats
 * 
 * Get push token statistics for a client or overall system
 */
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    console.log('📊 Getting push token stats for clientId:', clientId);

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // If clientId is provided, we need to filter by users belonging to that client
    // For now, we'll get all tokens and filter by userType if needed
    const matchStage: any = {};
    
    pipeline.push({ $match: matchStage });

    // Group by various dimensions
    pipeline.push({
      $group: {
        _id: null,
        totalTokens: { $sum: 1 },
        activeTokens: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
        inactiveTokens: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
        staffTokens: { $sum: { $cond: [{ $eq: ["$userType", "staff"] }, 1, 0] } },
        adminTokens: { $sum: { $cond: [{ $eq: ["$userType", "admin"] }, 1, 0] } },
        clientTokens: { $sum: { $cond: [{ $eq: ["$userType", "client"] }, 1, 0] } },
        iosTokens: { $sum: { $cond: [{ $eq: ["$platform", "ios"] }, 1, 0] } },
        androidTokens: { $sum: { $cond: [{ $eq: ["$platform", "android"] }, 1, 0] } },
        webTokens: { $sum: { $cond: [{ $eq: ["$platform", "web"] }, 1, 0] } },
        recentTokens: { 
          $sum: { 
            $cond: [
              { 
                $gte: [
                  "$lastUsed", 
                  { $dateSubtract: { startDate: new Date(), unit: "day", amount: 7 } }
                ] 
              }, 
              1, 
              0
            ] 
          } 
        }
      }
    });

    const [stats] = await PushToken.aggregate(pipeline);

    const result = stats || {
      totalTokens: 0,
      activeTokens: 0,
      inactiveTokens: 0,
      staffTokens: 0,
      adminTokens: 0,
      clientTokens: 0,
      iosTokens: 0,
      androidTokens: 0,
      webTokens: 0,
      recentTokens: 0
    };

    // Add calculated fields
    result.healthyPercentage = result.totalTokens > 0 
      ? Math.round((result.activeTokens / result.totalTokens) * 100) 
      : 0;

    result.timestamp = new Date().toISOString();

    console.log('✅ Push token stats retrieved:', result);

    return successResponse(
      result,
      "Push token statistics retrieved successfully",
      200
    );

  } catch (error: unknown) {
    console.error('❌ Error getting push token stats:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to get push token statistics", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};