import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { licenseScheduler } from "@/lib/utils/license-scheduler";
import { logger } from "@/lib/utils/logger";

// Get scheduler status
export const GET = async (req: NextRequest) => {
  try {
    const status = licenseScheduler.getStatus();
    return successResponse(status, "Scheduler status retrieved successfully");
  } catch (error: unknown) {
    logger.error("Error getting scheduler status:", error);
    return errorResponse("Failed to get scheduler status", 500);
  }
};

// Control scheduler (start/stop/trigger)
export const POST = async (req: NextRequest) => {
  try {
    const { action } = await req.json();
    
    if (!action) {
      return errorResponse("Action is required (start, stop, or trigger)", 400);
    }
    
    switch (action) {
      case 'start':
        licenseScheduler.start();
        return successResponse(
          licenseScheduler.getStatus(),
          "License scheduler started successfully"
        );
        
      case 'stop':
        licenseScheduler.stop();
        return successResponse(
          licenseScheduler.getStatus(),
          "License scheduler stopped successfully"
        );
        
      case 'trigger':
        // Manual trigger for immediate execution
        await licenseScheduler.runLicenseUpdate();
        return successResponse(
          { triggered: true },
          "License update triggered manually"
        );
        
      default:
        return errorResponse("Invalid action. Use 'start', 'stop', or 'trigger'", 400);
    }
    
  } catch (error: unknown) {
    logger.error("Error controlling scheduler:", error);
    return errorResponse("Failed to control scheduler", 500);
  }
};