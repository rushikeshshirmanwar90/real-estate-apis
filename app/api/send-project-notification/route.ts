import { successResponse, errorResponse } from "@/lib/utils/api-response";
import {
  sendNotificationsToRecipients,
  resolveRecipientsFromDB,
} from "@/lib/utils/notificationSender";
import { NextRequest } from "next/server";

/**
 * POST /api/send-project-notification
 *
 * Send project-related notifications (section created, project updated, etc.)
 *
 * ✅ FIX: Previously this route made a self-referential HTTP fetch to
 *    /api/notifications/send, causing ECONNREFUSED in Next.js server contexts.
 *    Now the shared sendNotificationsToRecipients() utility is called directly.
 */
export async function POST(req: NextRequest) {
  try {
    const {
      title,
      message,
      projectId,
      projectName,
      category = "project",
      action,
      triggeredBy,
      recipients,
      clientId,
      metadata = {},
    } = await req.json();

    // Validate required fields
    if (!title || !clientId) {
      return errorResponse("title and clientId are required", 400);
    }

    if (!message) {
      return errorResponse("message is required", 400);
    }

    console.log(`📋 Project notification: ${title} - ${category}/${action}`);

    // ✅ Resolve recipients server-side: all admins of this client, from their
    // registered push tokens. The client-supplied list is only a fallback so
    // the route can't be used to push to arbitrary users.
    let finalRecipients: Array<{ userId: string }> =
      await resolveRecipientsFromDB(clientId);

    if (finalRecipients.length === 0 && Array.isArray(recipients)) {
      console.log(
        "⚠️ No admin push tokens found in DB — falling back to client-supplied recipients (admins only)"
      );
      finalRecipients = recipients.filter(
        (r: any) => r?.userId && r.userType === "admin"
      );
    }

    // Never notify the user who performed the activity
    if (triggeredBy) {
      finalRecipients = finalRecipients.filter(
        (r) => r.userId !== triggeredBy
      );
    }

    console.log(`📤 Sending to ${finalRecipients.length} admin recipients`);

    // ✅ Call the shared utility directly — no HTTP round-trip
    const result = await sendNotificationsToRecipients({
      title,
      body: message,
      category,
      action,
      data: {
        clientId,
        projectId,
        projectName,
        triggeredBy,
        ...metadata,
      },
      recipients: finalRecipients,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `✅ Project notification sent: ${result.notificationsSent} delivered`
    );

    return successResponse(result, "Project notification processed successfully");
  } catch (error: unknown) {
    console.error("❌ /api/send-project-notification error:", error);
    if (error instanceof Error) {
      return errorResponse(
        "Failed to send project notification",
        500,
        error.message
      );
    }
    return errorResponse("Failed to send project notification", 500, error);
  }
}
