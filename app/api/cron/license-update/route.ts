import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logger";

// Daily license update cron job
export const POST = async (req: NextRequest) => {
  try {
    // Verify cron job authorization (you can add a secret key check here)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse("Unauthorized", 401);
    }

    await connect();
    
    const currentDate = new Date();
    logger.info(`Starting daily license update at ${currentDate.toISOString()}`);
    
    // Find all clients with active licenses
    const activeClients = await Client.find({
      isLicenseActive: true,
      licenseExpiryDate: { $exists: true, $ne: null }
    });
    
    let updatedCount = 0;
    let expiredCount = 0;
    const results = [];
    
    for (const client of activeClients) {
      try {
        const expiryDate = new Date(client.licenseExpiryDate);
        const timeDiff = expiryDate.getTime() - currentDate.getTime();
        const remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (remainingDays <= 0) {
          // License expired
          await Client.findByIdAndUpdate(client._id, {
            $set: {
              license: 0,
              isLicenseActive: false
            }
          });
          
          results.push({
            clientId: client._id,
            clientName: client.name,
            status: 'expired',
            previousDays: client.license,
            newDays: 0
          });
          
          expiredCount++;
          logger.info(`License expired for client: ${client.name} (${client.email})`);
        } else {
          // Update remaining days
          await Client.findByIdAndUpdate(client._id, {
            $set: {
              license: remainingDays
            }
          });
          
          results.push({
            clientId: client._id,
            clientName: client.name,
            status: 'updated',
            previousDays: client.license,
            newDays: remainingDays
          });
          
          updatedCount++;
          logger.info(`License updated for client: ${client.name} - ${remainingDays} days remaining`);
        }
      } catch (clientError) {
        logger.error(`Error updating license for client ${client._id}:`, clientError);
        results.push({
          clientId: client._id,
          clientName: client.name,
          status: 'error',
          error: clientError instanceof Error ? clientError.message : 'Unknown error'
        });
      }
    }
    
    const summary = {
      totalProcessed: activeClients.length,
      updatedCount,
      expiredCount,
      timestamp: currentDate.toISOString(),
      results
    };
    
    logger.info(`Daily license update completed: ${updatedCount} updated, ${expiredCount} expired`);
    
    return successResponse(
      summary,
      `Daily license update completed. ${updatedCount} clients updated, ${expiredCount} licenses expired`
    );
    
  } catch (error: unknown) {
    logger.error("Error in daily license update cron job:", error);
    return errorResponse("Failed to execute daily license update", 500);
  }
};

// Manual trigger for testing (GET request)
export const GET = async (req: NextRequest) => {
  try {
    // For testing purposes, allow GET requests without auth in development
    if (process.env.NODE_ENV === 'production') {
      return errorResponse("Use POST method for cron job execution", 405);
    }
    
    // Redirect to POST method for actual execution
    return POST(req);
    
  } catch (error: unknown) {
    logger.error("Error in manual license update trigger:", error);
    return errorResponse("Failed to trigger license update", 500);
  }
};