import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

// Simple push token registration without complex security
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const {
      userId,
      userType,
      token,
      platform,
      deviceId,
      deviceName,
    } = await req.json();

    console.log('📤 Simple push token registration:', {
      userId,
      userType,
      platform,
      deviceId,
    });

    // Basic validation
    if (!userId || !token || !userType) {
      return errorResponse("Missing required fields", 400);
    }

    // Check if token already exists
    const existingToken = await PushToken.findOne({ token });

    if (existingToken) {
      // Update existing token
      existingToken.userId = userId;
      existingToken.userType = userType;
      existingToken.platform = platform;
      existingToken.deviceId = deviceId;
      existingToken.deviceName = deviceName;
      existingToken.isActive = true;
      existingToken.lastUsed = new Date();

      await existingToken.save();

      console.log('✅ Updated existing push token');

      return successResponse(
        {
          tokenId: existingToken._id,
          isNew: false,
        },
        "Push token updated successfully",
        200
      );
    }

    // Deactivate old tokens for this user/device
    if (deviceId) {
      await PushToken.updateMany(
        { userId, deviceId, isActive: true },
        { isActive: false }
      );
    }

    // Create new token
    const newToken = new PushToken({
      userId,
      userType,
      token,
      platform,
      deviceId,
      deviceName,
      isActive: true,
      lastUsed: new Date(),
    });

    await newToken.save();

    console.log('✅ Created new push token');

    return successResponse(
      {
        tokenId: newToken._id,
        isNew: true,
      },
      "Push token registered successfully",
      201
    );

  } catch (error: unknown) {
    console.error('❌ Push token registration error:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to register push token", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// GET: Get push tokens for a user
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    const tokens = await PushToken.find({ userId, isActive: true })
      .select('-token') // Don't return the actual token
      .sort({ lastUsed: -1 });

    return successResponse(
      {
        tokens,
        count: tokens.length,
      },
      "Push tokens retrieved successfully",
      200
    );

  } catch (error: unknown) {
    console.error('❌ Push token retrieval error:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to retrieve push tokens", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};