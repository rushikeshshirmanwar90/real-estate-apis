import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * POST /api/send-project-notification
 * 
 * Send project-related notifications (section created, project updated, etc.)
 * This endpoint wraps the main /api/notifications/send endpoint with project-specific logic
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
      metadata = {}
    } = await req.json();

    // Validate required fields
    if (!title || !recipients || !clientId) {
      return errorResponse("title, recipients, and clientId are required", 400);
    }

    if (!message) {
      return errorResponse("message is required", 400);
    }

    console.log(`📋 Project notification: ${title} - ${category}/${action}`);

    // Forward to the main notification send endpoint
    const domain = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";
    const sendRes = await fetch(`${domain}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body: message,
        category,
        action,
        data: { 
          clientId, 
          projectId, 
          projectName, 
          triggeredBy,
          ...metadata
        },
        recipients,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!sendRes.ok) {
      const errorText = await sendRes.text();
      console.error(`❌ Failed to send project notification: ${sendRes.status}`, errorText);
      return errorResponse(
        "Failed to send project notification",
        sendRes.status,
        errorText
      );
    }

    const result = await sendRes.json();
    
    console.log(`✅ Project notification sent: ${result.data?.notificationsSent || 0} delivered`);
    
    return successResponse(
      result.data,
      "Project notification processed successfully"
    );

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
