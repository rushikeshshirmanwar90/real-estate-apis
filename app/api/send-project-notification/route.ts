import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { sendNotificationsToRecipients } from "@/lib/utils/notificationSender";
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
    if (!title || !recipients || !clientId) {
      return errorResponse("title, recipients, and clientId are required", 400);
    }

    if (!message) {
      return errorResponse("message is required", 400);
    }

    console.log(`📋 Project notification: ${title} - ${category}/${action}`);
    console.log(`📤 Sending to ${recipients?.length ?? 0} recipients`);

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
      recipients,
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
