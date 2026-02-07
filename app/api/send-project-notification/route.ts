import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";
import { Expo } from 'expo-server-sdk';

// Create Expo SDK client
const expo = new Expo();

// Send project notifications to relevant users
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const {
      projectId,
      type,
      title,
      message,
      recipientType, // 'admins' or 'staff'
      data
    } = await req.json();

    console.log('📤 Sending project notification:', {
      projectId,
      type,
      recipientType,
      title,
    });

    // Basic validation
    if (!projectId || !type || !title || !message || !recipientType) {
      return errorResponse("Missing required fields", 400);
    }

    // Get recipients based on type
    let recipients: any[] = [];

    if (recipientType === 'admins') {
      // Get all admin users for this project
      recipients = await PushToken.find({
        userType: { $in: ['admin', 'client-admin'] },
        isActive: true
      }).populate('userId');
    } else if (recipientType === 'staff') {
      // Get all staff users for this project
      recipients = await PushToken.find({
        userType: 'staff',
        isActive: true
      }).populate('userId');
    }

    if (recipients.length === 0) {
      console.log('⚠️ No recipients found for notification');
      return successResponse(
        { sent: 0, recipients: 0 },
        "No recipients found",
        200
      );
    }

    // Prepare push notifications
    const messages: any[] = [];

    for (const recipient of recipients) {
      if (!Expo.isExpoPushToken(recipient.token)) {
        console.error(`❌ Invalid push token: ${recipient.token}`);
        continue;
      }

      messages.push({
        to: recipient.token,
        sound: 'default',
        title: title,
        body: message,
        data: {
          ...data,
          projectId,
          type,
          timestamp: Date.now(),
        },
        priority: 'high',
        channelId: 'default',
      });
    }

    if (messages.length === 0) {
      return successResponse(
        { sent: 0, recipients: recipients.length },
        "No valid push tokens found",
        200
      );
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    let totalSent = 0;
    let totalErrors = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        
        for (const ticket of ticketChunk) {
          if (ticket.status === 'ok') {
            totalSent++;
          } else {
            totalErrors++;
            console.error('❌ Push notification error:', ticket.message);
          }
        }
      } catch (error) {
        console.error('❌ Error sending push notification chunk:', error);
        totalErrors += chunk.length;
      }
    }

    console.log(`✅ Notifications sent: ${totalSent}, errors: ${totalErrors}`);

    return successResponse(
      {
        sent: totalSent,
        errors: totalErrors,
        recipients: recipients.length,
        type,
        projectId,
      },
      `Sent ${totalSent} notifications successfully`,
      200
    );

  } catch (error: unknown) {
    console.error('❌ Send notification error:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to send notifications", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};