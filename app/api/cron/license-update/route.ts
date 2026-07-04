import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logger";
import { safeRedisDelCache, invalidateCachePattern } from "@/lib/utils/redis-helpers";

// Daily license update cron job
export const POST = async (req: NextRequest) => {
  try {
    // Verify cron job authorization
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse("Unauthorized", 401);
    }

    await connect();
    
    const currentDate = new Date();
    logger.info(`Starting daily license update at ${currentDate.toISOString()}`);
    
    // Find all clients with active licenses (excluding lifetime licenses with -1)
    const activeClients = await Client.find({
      license: { $gt: 0 }, // Only process licenses > 0 (excludes -1 and 0)
      isLicenseActive: true
    });
    
    // Also get lifetime license clients for reporting (but won't process them)
    const lifetimeClients = await Client.find({
      license: -1
    });
    
    let updatedCount = 0;
    let expiredCount = 0;
    let skippedLifetime = lifetimeClients.length;
    let cacheInvalidatedCount = 0;
    const results = [];
    
    for (const client of activeClients) {
      try {
        const currentLicense = client.license;
        
        // Double-check: Skip lifetime licenses (-1) - this should not happen due to query but safety first
        if (currentLicense === -1) {
          logger.info(`Skipping lifetime license client: ${client._id}`);
          results.push({
            clientId: client._id,
            action: 'skipped_lifetime',
            oldLicense: currentLicense,
            newLicense: currentLicense
          });
          continue;
        }
        
        // Skip if license is already 0 or negative (except -1)
        if (currentLicense <= 0) {
          logger.info(`Skipping client ${client._id} with license: ${currentLicense}`);
          continue;
        }
        
        // Decrement license by 1 day
        const newLicense = Math.max(0, currentLicense - 1);
        
        if (newLicense === 0) {
          // License expired
          await Client.findByIdAndUpdate(client._id, {
            $set: {
              license: 0,
              isLicenseActive: false,
              licenseExpiryDate: new Date() // Set to today when expired
            }
          });
          
          // Invalidate cache for this client
          await safeRedisDelCache(`client:${client._id}`);
          if (client.email) {
            await safeRedisDelCache(`client:email:${client.email}`);
          }
          cacheInvalidatedCount++;
          
          results.push({
            clientId: client._id,
            action: 'expired',
            oldLicense: currentLicense,
            newLicense: 0
          });
          
          expiredCount++;
          logger.info(`Client ${client._id} license expired (was ${currentLicense} days)`);
        } else {
          // Update license with decremented value AND update expiry date
          // Calculate new expiry date: today + remaining days
          const newExpiryDate = new Date();
          newExpiryDate.setDate(newExpiryDate.getDate() + newLicense);
          
          await Client.findByIdAndUpdate(client._id, {
            $set: {
              license: newLicense,
              licenseExpiryDate: newExpiryDate
            }
          });
          
          // Invalidate cache for this client
          await safeRedisDelCache(`client:${client._id}`);
          if (client.email) {
            await safeRedisDelCache(`client:email:${client.email}`);
          }
          cacheInvalidatedCount++;
          
          results.push({
            clientId: client._id,
            action: 'decremented',
            oldLicense: currentLicense,
            newLicense: newLicense,
            newExpiryDate: newExpiryDate.toISOString()
          });
          
          updatedCount++;
          logger.info(`Client ${client._id} license decremented: ${currentLicense} -> ${newLicense} days, expiry: ${newExpiryDate.toISOString()}`);
        }
        
      } catch (clientError) {
        logger.error(`Error updating client ${client._id}:`, clientError);
        results.push({
          clientId: client._id,
          action: 'error',
          error: clientError instanceof Error ? clientError.message : 'Unknown error'
        });
      }
    }
    
    // Invalidate the "all clients" cache as well
    await safeRedisDelCache('clients:all');
    logger.info(`Invalidated clients:all cache`);
    
    const summary = {
      totalProcessed: activeClients.length,
      updated: updatedCount,
      expired: expiredCount,
      skippedLifetime: skippedLifetime,
      cacheInvalidated: cacheInvalidatedCount,
      timestamp: currentDate.toISOString(),
      results
    };
    
    logger.info(`License update completed: ${updatedCount} updated, ${expiredCount} expired, ${skippedLifetime} lifetime licenses skipped, ${cacheInvalidatedCount} caches invalidated`);
    
    return successResponse(summary, "License update completed successfully");
    
  } catch (error) {
    logger.error("Error in license update cron job:", error);
    return errorResponse("Internal server error during license update", 500);
  }
};