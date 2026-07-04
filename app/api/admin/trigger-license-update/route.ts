import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logger";
import { checkValidClient } from "@/lib/auth";

// Manual trigger for license update (for testing)
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
    logger.info("Manual license update triggered");
    
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
    
    // Call the cron endpoint
    const response = await fetch(`${domain}/api/cron/license-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      logger.info("Manual license update completed successfully:", result);
      return successResponse("License update triggered successfully", result);
    } else {
      const errorText = await response.text();
      logger.error("Manual license update failed:", errorText);
      return errorResponse(`License update failed: ${response.statusText}`, response.status);
    }
    
  } catch (error) {
    logger.error("Error triggering manual license update:", error);
    return errorResponse("Internal server error during manual license update", 500);
  }
};