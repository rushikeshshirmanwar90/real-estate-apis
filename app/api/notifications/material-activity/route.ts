import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * POST /api/notifications/material-activity
 * 
 * Send notifications for material activities (imported, used, transferred)
 * This endpoint wraps the main /api/notifications/send endpoint with material-specific logic
 */
export async function POST(req: NextRequest) {
  try {
    const { 
      activity, 
      materials = [], 
      projectId, 
      projectName,
      sectionName, 
      triggeredBy, 
      recipients, 
      clientId 
    } = await req.json();

    // Validate required fields
    if (!activity || !recipients || !clientId) {
      return errorResponse("activity, recipients, and clientId are required", 400);
    }

    if (!['imported', 'used', 'transferred'].includes(activity)) {
      return errorResponse("activity must be 'imported', 'used', or 'transferred'", 400);
    }

    // Build notification title based on activity type
    const actionLabel =
      activity === "imported"    ? "📦 Materials Imported" :
      activity === "used"        ? "🔨 Materials Used"     :
                                   "🔄 Materials Transferred";

    // Build notification body
    const materialNames = materials.map((m: any) => m.name).join(", ") || "materials";
    const materialCount = materials.length;
    const totalCost = materials.reduce((sum: number, m: any) => 
      sum + (m.totalCost || m.cost || 0), 0
    );

    let notifBody = '';
    if (sectionName) {
      notifBody = `${triggeredBy?.fullName || "Someone"} ${activity} ${materialCount} material${materialCount > 1 ? 's' : ''} (₹${totalCost.toLocaleString()}) in ${sectionName} (${projectName})`;
    } else {
      notifBody = `${triggeredBy?.fullName || "Someone"} ${activity} ${materialCount} material${materialCount > 1 ? 's' : ''} (₹${totalCost.toLocaleString()}) in ${projectName}`;
    }

    console.log(`📦 Material activity notification: ${activity} - ${materialCount} materials`);

    // Forward to the main notification send endpoint
    const domain = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";
    const sendRes = await fetch(`${domain}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: actionLabel,
        body: notifBody,
        category: "material",
        action: activity,
        data: { 
          clientId, 
          projectId, 
          projectName, 
          sectionName,
          triggeredBy, 
          materialCount,
          totalCost,
          materials: materials.map((m: any) => ({
            name: m.name,
            quantity: m.qnt || m.quantity,
            unit: m.unit,
            cost: m.cost || m.totalCost
          }))
        },
        recipients,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!sendRes.ok) {
      const errorText = await sendRes.text();
      console.error(`❌ Failed to send material activity notification: ${sendRes.status}`, errorText);
      return errorResponse(
        "Failed to send material activity notification",
        sendRes.status,
        errorText
      );
    }

    const result = await sendRes.json();
    
    console.log(`✅ Material activity notification sent: ${result.data?.notificationsSent || 0} delivered`);
    
    return successResponse(
      result.data,
      "Material activity notification processed successfully"
    );

  } catch (error: unknown) {
    console.error("❌ /api/notifications/material-activity error:", error);
    if (error instanceof Error) {
      return errorResponse(
        "Failed to send material activity notification",
        500,
        error.message
      );
    }
    return errorResponse("Failed to send material activity notification", 500, error);
  }
}
