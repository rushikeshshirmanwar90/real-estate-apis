import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100; // Expo's hard limit

/**
 * POST /api/notifications/send
 * 
 * Sends push notifications to multiple users via Expo Push Notification Service
 * Used by the notification system for multi-user notification delivery
 */
export async function POST(request: NextRequest) {
  try {
    await connect();
    
    const body = await request.json();
    const { 
      title, 
      body: notificationBody, 
      category, 
      action, 
      data = {}, 
      recipients, 
      timestamp 
    } = body;
    
    console.log('📤 Processing notification send request:');
    console.log('   - Title:', title);
    console.log('   - Recipients:', recipients?.length || 0);
    console.log('   - Category:', category);
    console.log('   - Action:', action);
    
    // Validate required fields
    if (!title || !notificationBody) {
      return errorResponse('Title and body are required', 400);
    }
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return errorResponse('Recipients array is required and must not be empty', 400);
    }
    
    // Step 1: Collect userIds from the recipients already resolved by /recipients endpoint
    // ✅ FIX: Deduplicate userIds to prevent sending duplicate notifications
    const recipientUserIds = [...new Set(
      recipients
        .map((r: any) => r.userId)
        .filter(Boolean)
    )];
    
    if (recipientUserIds.length === 0) {
      return errorResponse('No valid userIds found in recipients', 400);
    }
    
    const originalCount = recipients.length;
    const deduplicatedCount = recipientUserIds.length;
    const duplicatesRemoved = originalCount - deduplicatedCount;
    
    if (duplicatesRemoved > 0) {
      console.log(`🔄 Deduplicated ${duplicatesRemoved} duplicate recipients (${originalCount} → ${deduplicatedCount})`);
    }
    
    console.log(`🔍 Looking up push tokens for ${recipientUserIds.length} unique users...`);
    
    // Step 2: Look up their Expo push tokens in the database
    const tokenDocs = await PushToken.find({ 
      userId: { $in: recipientUserIds } 
    }).lean();
    
    console.log(`📱 Found ${tokenDocs.length} push tokens`);
    
    // ✅ FIX: Return error status when no tokens found instead of 200 OK
    if (tokenDocs.length === 0) {
      console.error(`❌ No push tokens found for users: ${recipientUserIds.join(', ')}`);
      return errorResponse(
        'No push tokens found for any recipients. Users may not have registered for notifications.',
        424, // 424 Failed Dependency - the request was valid but couldn't be completed
        { 
          notificationsSent: 0,
          notificationsFailed: recipientUserIds.length,
          totalProcessed: 0,
          missingTokens: recipientUserIds
        }
      );
    }
    
    // Step 3: Build Expo messages
    const messages = tokenDocs.map((doc) => ({
      to: doc.token,
      title,
      body: notificationBody,
      data: { 
        ...data, 
        category, 
        action, 
        timestamp: timestamp || new Date().toISOString() 
      },
      sound: "default",
      priority: "high",
      channelId: "default",
    }));
    
    console.log(`📨 Prepared ${messages.length} messages for Expo`);
    
    // Step 4: Send in batches of 100 (Expo hard limit)
    let totalSent = 0;
    let totalFailed = 0;
    const errors: any[] = [];
    
    for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
      const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
      
      console.log(`📤 Sending batch ${Math.floor(i / EXPO_BATCH_SIZE) + 1} (${batch.length} messages)...`);
      
      try {
        const expoRes = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(process.env.EXPO_ACCESS_TOKEN
              ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
              : {}),
          },
          body: JSON.stringify(batch),
        });
        
        if (!expoRes.ok) {
          const errorText = await expoRes.text();
          console.error(`❌ Expo API error: ${expoRes.status} ${expoRes.statusText}`, errorText);
          
          // Mark all messages in this batch as failed
          batch.forEach((msg) => {
            totalFailed++;
            errors.push({ 
              token: msg.to, 
              error: `Expo API error: ${expoRes.status} ${expoRes.statusText}` 
            });
          });
          continue;
        }
        
        const expoData = await expoRes.json();
        
        console.log(`📥 Expo response:`, JSON.stringify(expoData, null, 2));
        
        // Process individual ticket results
        if (Array.isArray(expoData.data)) {
          expoData.data.forEach((ticket: any, idx: number) => {
            if (ticket.status === "ok") {
              totalSent++;
              console.log(`✅ Message sent successfully: ${ticket.id}`);
            } else {
              totalFailed++;
              const errorMsg = ticket.message || ticket.details?.error || 'Unknown error';
              console.error(`❌ Message failed: ${errorMsg}`);
              errors.push({ 
                token: batch[idx].to, 
                error: errorMsg,
                details: ticket.details 
              });
            }
          });
        } else {
          console.warn('⚠️ Unexpected Expo response format:', expoData);
          // Assume success if no error array
          totalSent += batch.length;
        }
        
      } catch (fetchError) {
        console.error(`❌ Error sending batch to Expo:`, fetchError);
        
        // Mark all messages in this batch as failed
        batch.forEach((msg) => {
          totalFailed++;
          errors.push({ 
            token: msg.to, 
            error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error' 
          });
        });
      }
    }
    
    console.log(`✅ Notification sending completed:`);
    console.log(`   - Successfully sent: ${totalSent}`);
    console.log(`   - Failed: ${totalFailed}`);
    console.log(`   - Total processed: ${totalSent + totalFailed}`);
    
    // Return success response with detailed results
    return successResponse(
      {
        notificationsSent: totalSent,
        notificationsFailed: totalFailed,
        totalProcessed: totalSent + totalFailed,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          title,
          category,
          action,
          timestamp: timestamp || new Date().toISOString(),
          clientId: data?.clientId,
          projectId: data?.projectId,
          triggeredBy: data?.triggeredBy,
          recipientCount: recipients.length,
          tokensFound: tokenDocs.length
        }
      },
      `Notifications sent: ${totalSent} delivered, ${totalFailed} failed`
    );
    
  } catch (error: unknown) {
    console.error('❌ Send notifications error:', error);
    if (error instanceof Error) {
      return errorResponse('Failed to send notifications', 500, error.message);
    }
    return errorResponse('Failed to send notifications', 500, error);
  }
}