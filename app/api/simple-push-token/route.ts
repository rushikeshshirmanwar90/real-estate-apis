import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { Staff } from "@/lib/models/users/Staff";
import { Client } from "@/lib/models/super-admin/Client";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { checkValidClient } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Simple push token registration with clientId support
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
      userId,
      userType,
      token,
      platform,
      deviceId,
      deviceName,
      // ✅ Add clientId for proper notification grouping
      clientId,
    } = await req.json();

    console.log('📤 Simple push token registration:', {
      userId,
      userType,
      platform,
      deviceId,
      clientId,
    });

    // Basic validation
    if (!userId || !token || !userType) {
      return errorResponse("Missing required fields", 400);
    }

    // ✅ Determine clientId if not provided
    let targetClientId = clientId;

    if (!targetClientId && userType === 'staff') {
      // For staff, get clientId from their assignments
      try {
        const staff = await Staff.findById(userId).select('clients assignedProjects');
        if (staff && staff.clients && staff.clients.length > 0) {
          targetClientId = staff.clients[0].clientId; // Use first client
          console.log(`📋 Found clientId for staff from assignments: ${targetClientId}`);
        } else if (staff && staff.assignedProjects && staff.assignedProjects.length > 0) {
          targetClientId = staff.assignedProjects[0].clientId; // Use first project's client
          console.log(`📋 Found clientId for staff from projects: ${targetClientId}`);
        }
      } catch (error) {
        console.error('❌ Error fetching staff clientId:', error);
      }
    } else if (!targetClientId && (userType === 'admin' || userType === 'client-admin')) {
      // For admins, get their clientId from Admin model
      try {
        const { Admin } = await import('@/lib/models/users/Admin');
        const admin = await Admin.findById(userId).select('clientId');
        if (admin && admin.clientId) {
          targetClientId = admin.clientId;
          console.log(`📋 Found clientId for admin from Admin model: ${targetClientId}`);
        } else {
          // Fallback: check if admin is the client themselves
          const client = await Client.findById(userId);
          if (client) {
            targetClientId = userId; // Admin is the client
            console.log(`📋 Admin is client (fallback): ${targetClientId}`);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching admin clientId:', error);
      }
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
      existingToken.clientId = targetClientId; // ✅ Update clientId
      existingToken.isActive = true;
      existingToken.lastUsed = new Date();

      await existingToken.save();

      console.log('✅ Updated existing push token with clientId:', targetClientId);

      return successResponse(
        {
          tokenId: existingToken._id,
          isNew: false,
          clientId: targetClientId,
        },
        "Push token updated successfully",
        200
      );
    }

    // Deactivate old tokens for this user/device
    if (deviceId) {
      await PushToken.updateMany(
        { userId, deviceId, isActive: true },
        { isActive: false, deactivationReason: 'New device token registered' }
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
      clientId: targetClientId, // ✅ Include clientId
      isActive: true,
      lastUsed: new Date(),
    });

    await newToken.save();

    console.log('✅ Created new push token with clientId:', targetClientId);

    return successResponse(
      {
        tokenId: newToken._id,
        isNew: true,
        clientId: targetClientId,
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const clientId = searchParams.get("clientId");

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    // ✅ Build query with optional clientId filter
    const query: any = { userId, isActive: true };
    if (clientId) {
      query.clientId = clientId;
    }

    const tokens = await PushToken.find(query)
      .select('-token') // Don't return the actual token
      .sort({ lastUsed: -1 });

    return successResponse(
      {
        tokens,
        count: tokens.length,
        clientId,
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