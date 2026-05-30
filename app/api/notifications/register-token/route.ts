import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * POST /api/notifications/register-token
 * 
 * Register or update a user's Expo push token
 * Used by the frontend to register device tokens for push notifications
 */
export async function POST(req: NextRequest) {
  try {
    await connect();
    
    const { userId, clientId, role, token, platform } = await req.json();

    // Validate required fields
    if (!userId || !clientId || !role || !token) {
      return errorResponse("userId, clientId, role, and token are all required", 400);
    }

    // Validate platform if provided
    if (platform && !["ios", "android", "web"].includes(platform)) {
      return errorResponse("platform must be 'ios', 'android', or 'web'", 400);
    }

    // Validate role
    if (!["admin", "staff"].includes(role)) {
      return errorResponse("role must be 'admin' or 'staff'", 400);
    }

    // Validate token format (Expo push tokens start with ExponentPushToken[)
    // ✅ FIX: Reject invalid tokens instead of just warning
    if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      console.error("❌ Invalid token format:", token.substring(0, 20));
      return errorResponse(
        "Invalid Expo push token format. Token must start with 'ExponentPushToken[' or 'ExpoPushToken['",
        400
      );
    }

    console.log(`📱 Registering push token for userId=${userId} role=${role} clientId=${clientId} platform=${platform || 'not specified'}`);

    // Upsert — latest token always wins
    const result = await PushToken.findOneAndUpdate(
      { userId },
      {
        userId,
        clientId,
        userType: role,  // PushToken schema uses `userType`, not `role`
        token,
        isActive: true,  // Re-activate in case it was deactivated
        ...(platform && { platform }),
        updatedAt: new Date()
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    console.log(`✅ Token registered successfully: ${result._id}`);

    return successResponse(
      { 
        registered: true,
        tokenId: result._id,
        userId: result.userId,
        clientId: result.clientId,
        role: result.role
      },
      "Push token registered successfully"
    );

  } catch (error: unknown) {
    console.error("❌ Error registering push token:", error);
    
    if (error instanceof Error) {
      // Handle duplicate key error
      if ((error as any).code === 11000) {
        return errorResponse("Token already registered for this user", 409, error.message);
      }
      return errorResponse("Failed to register push token", 500, error.message);
    }
    
    return errorResponse("Unknown error occurred", 500);
  }
}

/**
 * GET /api/notifications/register-token
 * 
 * Get token registration status for a user
 */
export async function GET(req: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    const tokenDoc = await PushToken.findOne({ userId }).lean();

    if (!tokenDoc) {
      return successResponse(
        { registered: false, userId },
        "No token registered for this user"
      );
    }

    // Type assertion for lean() result
    const token = tokenDoc as unknown as {
      userId: string;
      clientId: string;
      role: string;
      updatedAt: Date;
    };

    return successResponse(
      {
        registered: true,
        userId: token.userId,
        clientId: token.clientId,
        role: token.role,
        updatedAt: token.updatedAt
      },
      "Token registration found"
    );

  } catch (error: unknown) {
    console.error("❌ Error checking token registration:", error);
    if (error instanceof Error) {
      return errorResponse("Failed to check token registration", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
}

/**
 * DELETE /api/notifications/register-token
 * 
 * Unregister a user's push token
 */
export async function DELETE(req: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    const result = await PushToken.findOneAndDelete({ userId });

    if (!result) {
      return errorResponse("No token found for this user", 404);
    }

    console.log(`🗑️ Token unregistered for userId=${userId}`);

    return successResponse(
      { unregistered: true, userId },
      "Push token unregistered successfully"
    );

  } catch (error: unknown) {
    console.error("❌ Error unregistering push token:", error);
    if (error instanceof Error) {
      return errorResponse("Failed to unregister push token", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
}