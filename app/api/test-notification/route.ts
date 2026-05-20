/**
 * Test Notification API Endpoint
 * 
 * Allows users to send test notifications to verify the notification system
 * is working correctly on both iOS and Android.
 * 
 * POST /api/test-notification
 * - Sends a test notification to the requesting user
 * - Verifies token exists and is active
 * - Tests platform-specific features (channelId for Android)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkValidClient } from '@/lib/auth';
import { PushNotificationService } from '@/lib/services/pushNotificationService';
import { PushToken } from '@/lib/models/PushToken';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import connect from '@/lib/db';

export const POST = async (req: NextRequest) => {
  // Authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await connect();

    const body = await req.json();
    const { userId, title, body: messageBody, data } = body;

    // Validate input
    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    console.log('📱 Test notification request:', {
      userId,
      title: title || 'Test Notification',
      body: messageBody || 'This is a test notification',
    });

    // Check if user has an active push token
    const token = await PushToken.findOne({
      userId,
      isActive: true,
    }).lean() as { platform?: string; deviceName?: string; lastUsed?: Date } | null;

    if (!token) {
      return errorResponse(
        'No active push token found for this user. Please register a token first.',
        404
      );
    }

    console.log('✅ Found active token:', {
      platform: token.platform,
      deviceName: token.deviceName,
      lastUsed: token.lastUsed,
    });

    // Send test notification
    const result = await PushNotificationService.sendToUsers(
      [userId],
      title || '✅ Test Notification',
      messageBody || `This is a test notification from ${token.platform} backend`,
      {
        ...data,
        test: true,
        platform: token.platform,
        timestamp: new Date().toISOString(),
        source: 'test-api',
      },
      {
        sound: 'default',
        priority: 'high',
        ttl: 3600,
      }
    );

    if (result.success && result.messagesSent > 0) {
      return successResponse(
        {
          messagesSent: result.messagesSent,
          platform: token.platform,
          deviceName: token.deviceName,
          tokenValidationStats: result.tokenValidationStats,
        },
        'Test notification sent successfully',
        200
      );
    } else {
      return errorResponse(
        'Failed to send test notification',
        500,
        result.errors.join(', ')
      );
    }

  } catch (error) {
    console.error('❌ Test notification error:', error);
    return errorResponse(
      'Failed to send test notification',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

// GET endpoint to check test notification capability
export const GET = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    // Get user's push tokens
    const tokens = await PushToken.find({
      userId,
      isActive: true,
    }).lean() as Array<{ platform?: string; deviceName?: string; lastUsed?: Date; isActive?: boolean }>;

    if (tokens.length === 0) {
      return successResponse(
        {
          canSendTest: false,
          reason: 'No active push tokens found',
          tokens: [],
        },
        'User has no active push tokens',
        200
      );
    }

    return successResponse(
      {
        canSendTest: true,
        tokens: tokens.map(t => ({
          platform: t.platform,
          deviceName: t.deviceName,
          lastUsed: t.lastUsed,
          isActive: t.isActive,
        })),
      },
      'User can receive test notifications',
      200
    );

  } catch (error) {
    console.error('❌ Test notification check error:', error);
    return errorResponse(
      'Failed to check test notification capability',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
