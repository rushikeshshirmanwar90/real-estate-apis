import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

export interface SendNotificationOptions {
  title: string;
  body: string;
  category?: string;
  action?: string;
  data?: Record<string, any>;
  recipients: Array<{ userId: string }>;
  timestamp?: string;
}

export interface SendNotificationResult {
  notificationsSent: number;
  notificationsFailed: number;
  totalProcessed: number;
  errors?: Array<{ token: string; error: string; details?: any }>;
  summary?: Record<string, any>;
}

/**
 * Core notification sending logic — shared between API routes.
 * Call this directly from server code instead of making HTTP round-trips to
 * /api/notifications/send, which causes ECONNREFUSED in Next.js server contexts.
 */
export async function sendNotificationsToRecipients(
  options: SendNotificationOptions
): Promise<SendNotificationResult> {
  await connect();

  const { title, body, category, action, data = {}, recipients, timestamp } = options;

  // Deduplicate userIds to avoid duplicate notifications
  const recipientUserIds = [
    ...new Set(recipients.map((r) => r.userId).filter(Boolean)),
  ];

  console.log(
    `🔍 Looking up push tokens for ${recipientUserIds.length} unique users...`
  );

  if (recipientUserIds.length === 0) {
    console.warn("⚠️ No valid userIds in recipients — skipping send");
    return { notificationsSent: 0, notificationsFailed: 0, totalProcessed: 0 };
  }

  // Look up Expo push tokens from the database
  const tokenDocs = await PushToken.find({
    userId: { $in: recipientUserIds },
  }).lean();

  console.log(`📱 Found ${tokenDocs.length} push tokens`);

  if (tokenDocs.length === 0) {
    console.warn(
      `❌ No push tokens found for users: ${recipientUserIds.join(", ")}`
    );
    return {
      notificationsSent: 0,
      notificationsFailed: recipientUserIds.length,
      totalProcessed: 0,
    };
  }

  // Build Expo messages
  const messages = tokenDocs.map((doc: any) => ({
    to: doc.token,
    title,
    body,
    data: {
      ...data,
      category,
      action,
      timestamp: timestamp || new Date().toISOString(),
    },
    sound: "default",
    priority: "high",
    channelId: "default",
  }));

  console.log(`📨 Prepared ${messages.length} messages for Expo`);

  let totalSent = 0;
  let totalFailed = 0;
  const errors: Array<{ token: string; error: string; details?: any }> = [];

  // Send in batches of 100 (Expo hard limit)
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const batchNum = Math.floor(i / EXPO_BATCH_SIZE) + 1;

    console.log(`📤 Sending batch ${batchNum} (${batch.length} messages)...`);

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
        console.error(
          `❌ Expo API error: ${expoRes.status} ${expoRes.statusText}`,
          errorText
        );
        batch.forEach((msg) => {
          totalFailed++;
          errors.push({
            token: msg.to,
            error: `Expo API error: ${expoRes.status} ${expoRes.statusText}`,
          });
        });
        continue;
      }

      const expoData = await expoRes.json();
      console.log(`📥 Expo response:`, JSON.stringify(expoData, null, 2));

      if (Array.isArray(expoData.data)) {
        expoData.data.forEach((ticket: any, idx: number) => {
          if (ticket.status === "ok") {
            totalSent++;
            console.log(`✅ Message sent: ${ticket.id}`);
          } else {
            totalFailed++;
            const errorMsg =
              ticket.message || ticket.details?.error || "Unknown error";
            console.error(`❌ Message failed: ${errorMsg}`);
            errors.push({
              token: batch[idx].to,
              error: errorMsg,
              details: ticket.details,
            });
          }
        });
      } else {
        // Unexpected format — assume success
        totalSent += batch.length;
      }
    } catch (fetchError) {
      console.error(`❌ Error sending batch ${batchNum} to Expo:`, fetchError);
      batch.forEach((msg) => {
        totalFailed++;
        errors.push({
          token: msg.to,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Unknown fetch error",
        });
      });
    }
  }

  console.log(
    `✅ Notification sending complete — sent: ${totalSent}, failed: ${totalFailed}`
  );

  return {
    notificationsSent: totalSent,
    notificationsFailed: totalFailed,
    totalProcessed: totalSent + totalFailed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Resolve notification recipients directly from the database — no HTTP round-trip.
 * Use this from server-side code instead of calling /api/notifications/recipients.
 */
export async function resolveRecipientsFromDB(
  clientId: string,
  projectId?: string
): Promise<Array<{ userId: string; userType: "admin" | "staff" }>> {
  await connect();

  try {
    // Query push tokens directly by clientId + userType.
    // This avoids the Admin._id vs Client._id mismatch: admins register their
    // push tokens with userId = Client._id (their login ID), not Admin._id.
    const adminTokens = await PushToken.find({
      clientId,
      userType: "admin",
      isActive: true,
    }).select("userId").lean() as any[];

    const recipientMap = new Map<string, { userId: string; userType: "admin" | "staff" }>();

    adminTokens.forEach((t: any) => {
      if (t.userId) {
        recipientMap.set(t.userId, { userId: t.userId, userType: "admin" });
      }
    });

    const recipients = Array.from(recipientMap.values());
    console.log(
      `✅ resolveRecipientsFromDB: found ${recipients.length} admin recipients for clientId ${clientId}`
    );
    return recipients;
  } catch (err) {
    console.error("❌ resolveRecipientsFromDB failed:", err);
    return [];
  }
}
