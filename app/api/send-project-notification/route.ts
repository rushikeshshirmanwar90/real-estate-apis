import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { Projects } from "@/lib/models/Project";
import { Staff } from "@/lib/models/users/Staff";
import { Client } from "@/lib/models/super-admin/Client";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";
import { Expo } from 'expo-server-sdk';

// Create Expo SDK client
const expo = new Expo();

// Send project notifications to relevant users with proper grouping
export const POST = async (req: NextRequest) => {
  try {
    console.log('🔔 === NOTIFICATION API CALLED ===');
    
    await connect();
    console.log('✅ Database connected');

    const {
      projectId,
      type,
      title,
      message,
      recipientType, // 'admins' or 'staff'
      data,
      // ✅ New fields for proper grouping
      clientId,
      staffId, // ID of the staff member performing the action
    } = await req.json();

    console.log('📤 Notification request:', {
      projectId,
      type,
      recipientType,
      title,
      messageLength: message?.length,
      clientId,
      staffId,
    });

    // Basic validation
    if (!projectId || !type || !title || !message || !recipientType) {
      console.error('❌ Missing required fields:', { projectId, type, title, message, recipientType });
      return errorResponse("Missing required fields", 400);
    }

    // ✅ Get project details to determine clientId if not provided
    let targetClientId = clientId;
    if (!targetClientId && projectId) {
      try {
        const project = await Projects.findById(projectId).select('clientId');
        if (project) {
          targetClientId = project.clientId.toString();
          console.log(`📋 Found clientId from project: ${targetClientId}`);
        }
      } catch (error) {
        console.error('❌ Error fetching project:', error);
      }
    }

    if (!targetClientId) {
      console.error('❌ No clientId found for notification grouping');
      return errorResponse("ClientId is required for notification grouping", 400);
    }

    // ✅ Get recipients based on type and clientId
    let recipients: any[] = [];

    console.log(`🔍 Looking for ${recipientType} recipients for clientId: ${targetClientId}...`);

    if (recipientType === 'admins') {
      // Get admins for this specific client only
      recipients = await PushToken.find({
        clientId: targetClientId,
        userType: { $in: ['admin', 'client-admin'] },
        isActive: true,
        'healthMetrics.isHealthy': true,
      }).populate('userId');
      
      console.log(`📋 Found ${recipients.length} admin recipients for client ${targetClientId}`);
      
    } else if (recipientType === 'staff') {
      // Get staff assigned to this specific client's projects
      recipients = await PushToken.find({
        clientId: targetClientId,
        userType: 'staff',
        isActive: true,
        'healthMetrics.isHealthy': true,
      }).populate('userId');
      
      console.log(`📋 Found ${recipients.length} staff recipients for client ${targetClientId}`);
    }

    // ✅ Filter out the user who performed the action (no self-notification)
    if (staffId) {
      const originalCount = recipients.length;
      recipients = recipients.filter(recipient => recipient.userId !== staffId);
      console.log(`🚫 Filtered out action performer: ${originalCount} → ${recipients.length} recipients`);
    }

    if (recipients.length === 0) {
      console.log('⚠️ No recipients found for notification after filtering');
      return successResponse(
        { 
          sent: 0, 
          recipients: 0, 
          reason: 'No recipients found for this client',
          clientId: targetClientId,
        },
        "No recipients found for this client",
        200
      );
    }

    // Log recipient details (without sensitive info)
    recipients.forEach((recipient, index) => {
      console.log(`👤 Recipient ${index + 1}:`, {
        userType: recipient.userType,
        clientId: recipient.clientId,
        hasToken: !!recipient.token,
        tokenValid: Expo.isExpoPushToken(recipient.token),
        isActive: recipient.isActive,
      });
    });

    // Prepare push notifications
    const messages: any[] = [];

    for (const recipient of recipients) {
      if (!Expo.isExpoPushToken(recipient.token)) {
        console.error(`❌ Invalid push token for user ${recipient.userId}: ${recipient.token}`);
        continue;
      }

      messages.push({
        to: recipient.token,
        sound: 'default', // ✅ Enable default sound
        title: title,
        body: message,
        data: {
          ...data,
          projectId,
          type,
          clientId: targetClientId,
          timestamp: Date.now(),
          // ✅ Add navigation data
          route: 'notifications', // Navigate to notifications page
          screen: 'notifications',
        },
        priority: 'high',
        channelId: 'project-updates', // Use the project-updates channel
        categoryId: 'project-activity',
        badge: 1,
      });
    }

    console.log(`📨 Prepared ${messages.length} messages to send for client ${targetClientId}`);

    if (messages.length === 0) {
      console.log('⚠️ No valid push tokens found');
      return successResponse(
        { 
          sent: 0, 
          recipients: recipients.length, 
          reason: 'No valid push tokens',
          clientId: targetClientId,
        },
        "No valid push tokens found",
        200
      );
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    let totalSent = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    console.log(`📦 Sending ${chunks.length} chunks for client ${targetClientId}...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        console.log(`📤 Sending chunk ${i + 1}/${chunks.length} with ${chunk.length} messages...`);
        
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        
        for (let j = 0; j < ticketChunk.length; j++) {
          const ticket = ticketChunk[j];
          if (ticket.status === 'ok') {
            totalSent++;
            console.log(`✅ Message ${j + 1} sent successfully`);
          } else {
            totalErrors++;
            const errorMsg = `Message ${j + 1} failed: ${ticket.message}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      } catch (error) {
        console.error(`❌ Error sending chunk ${i + 1}:`, error);
        totalErrors += chunk.length;
        errors.push(`Chunk ${i + 1} failed: ${error}`);
      }
    }

    console.log(`🎯 Final results for client ${targetClientId}: ${totalSent} sent, ${totalErrors} errors`);
    
    if (errors.length > 0) {
      console.log('❌ Errors encountered:', errors);
    }

    return successResponse(
      {
        sent: totalSent,
        errors: totalErrors,
        recipients: recipients.length,
        validTokens: messages.length,
        type,
        projectId,
        clientId: targetClientId,
        filteredSelfNotification: !!staffId,
        errorDetails: errors.length > 0 ? errors : undefined,
      },
      `Sent ${totalSent} notifications successfully to client ${targetClientId}`,
      200
    );

  } catch (error: unknown) {
    console.error('❌ Send notification error:', error);
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack);
      return errorResponse("Failed to send notifications", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};