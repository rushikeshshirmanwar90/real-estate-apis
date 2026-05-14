import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { checkValidClient } from "@/lib/auth";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/admin/fix-license-status
 * 
 * Fixes clients who have license days (> 0 or -1) but isLicenseActive is false.
 * This is a one-time fix for existing data issues.
 * 
 * Requires: Bearer token authentication
 */
export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }

  try {
    await connectDB();
    logger.info("Starting license active status fix...");

    // Find all clients with license > 0 or -1 (lifetime) but isLicenseActive = false
    const clientsToFix = await Client.find({
      $or: [
        { license: { $gt: 0 }, isLicenseActive: false },
        { license: -1, isLicenseActive: false }
      ]
    }).select('name email license isLicenseActive licenseExpiryDate');

    logger.info(`Found ${clientsToFix.length} clients with incorrect isLicenseActive status`);

    if (clientsToFix.length === 0) {
      return successResponse(
        {
          totalFound: 0,
          fixed: 0,
          errors: 0,
          clients: []
        },
        "No clients need fixing. All license statuses are correct!"
      );
    }

    // Fix each client
    const fixedClients = [];
    const errors = [];
    let fixedCount = 0;

    for (const client of clientsToFix) {
      try {
        await Client.findByIdAndUpdate(
          client._id,
          {
            $set: {
              isLicenseActive: true
            }
          }
        );
        
        fixedClients.push({
          id: client._id,
          name: client.name,
          email: client.email,
          license: client.license,
          status: 'fixed'
        });
        
        logger.info(`Fixed: ${client.name} (${client.email})`);
        fixedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          id: client._id,
          name: client.name,
          email: client.email,
          error: errorMsg
        });
        logger.error(`Error fixing ${client.name} (${client.email}):`, error);
      }
    }

    // Verify the fix
    const remainingIssues = await Client.countDocuments({
      $or: [
        { license: { $gt: 0 }, isLicenseActive: false },
        { license: -1, isLicenseActive: false }
      ]
    });

    const result = {
      totalFound: clientsToFix.length,
      fixed: fixedCount,
      errors: errors.length,
      remainingIssues: remainingIssues,
      fixedClients: fixedClients,
      errorDetails: errors.length > 0 ? errors : undefined
    };

    logger.info(`License status fix completed: ${fixedCount} fixed, ${errors.length} errors`);

    return successResponse(
      result,
      `Successfully fixed ${fixedCount} out of ${clientsToFix.length} clients`
    );

  } catch (error) {
    logger.error("Error in fix-license-status endpoint:", error);
    return errorResponse(
      "Failed to fix license status",
      500,
      error instanceof Error ? error.message : error
    );
  }
};
