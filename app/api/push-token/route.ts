import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

// POST: Register or update push token
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const {
      userId,
      userType = 'client',
      token,
      platform,
      deviceId,
      deviceName,
      appVersion,
    } = await req.json();

    // Validation
    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    if (!token) {
      return errorResponse("token is required", 400);
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return errorResponse("platform must be 'ios', 'android', or 'web'", 400);
    }

    if (!['client', 'staff', 'admin'].includes(userType)) {
      return errorResponse("userType must be 'client', 'staff', or 'admin'", 400);
    }

    console.log('📱 Registering push token:', {
      userId,
      userType,
      platform,
      deviceId,
      tokenPreview: token.substring(0, 20) + '...',
    });

    // Check if token already exists
    const existingToken = await PushToken.findOne({ token });

    if (existingToken) {
      // Update existing token
      existingToken.userId = userId;
      existingToken.userType = userType;
      existingToken.platform = platform;
      existingToken.deviceId = deviceId;
      existingToken.deviceName = deviceName;
      existingToken.appVersion = appVersion;
      existingToken.isActive = true;
      existingToken.lastUsed = new Date();

      await existingToken.save();

      console.log('✅ Updated existing push token:', existingToken._id);

      return successResponse(
        {
          tokenId: existingToken._id,
          isNew: false,
        },
        "Push token updated successfully",
        200
      );
    }

    // Deactivate old tokens for this user/device combination
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
      appVersion,
      isActive: true,
      lastUsed: new Date(),
    });

    await newToken.save();

    console.log('✅ Created new push token:', newToken._id);

    return successResponse(
      {
        tokenId: newToken._id,
        isNew: true,
      },
      "Push token registered successfully",
      201
    );

  } catch (error: unknown) {
    console.error('❌ Error registering push token:', error);
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
    const userType = searchParams.get("userType");
    const isActive = searchParams.get("isActive");

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    const query: any = { userId };
    
    if (userType) {
      query.userType = userType;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    const tokens = await PushToken.find(query)
      .select('-token') // Don't return the actual token for security
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
    console.error('❌ Error retrieving push tokens:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to retrieve push tokens", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// DELETE: Deactivate push token
export const DELETE = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get("tokenId");
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");

    if (!tokenId && !token && !userId) {
      return errorResponse("tokenId, token, or userId is required", 400);
    }

    let query: any = {};
    
    if (tokenId) {
      query._id = tokenId;
    } else if (token) {
      query.token = token;
    } else if (userId) {
      query.userId = userId;
    }

    const result = await PushToken.updateMany(query, { isActive: false });

    console.log('🗑️ Deactivated push tokens:', result.modifiedCount);

    return successResponse(
      {
        deactivatedCount: result.modifiedCount,
      },
      `${result.modifiedCount} push token(s) deactivated successfully`,
      200
    );

  } catch (error: unknown) {
    console.error('❌ Error deactivating push tokens:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to deactivate push tokens", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};