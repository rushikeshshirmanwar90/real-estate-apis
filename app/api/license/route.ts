import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

// Update client license days
export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    
    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }
    
    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }
    
    const { licenseDays } = await req.json();
    
    if (!licenseDays || licenseDays < 0) {
      return errorResponse("Valid license days (positive number) is required", 400);
    }
    
    // Calculate expiry date
    const currentDate = new Date();
    const expiryDate = new Date(currentDate.getTime() + (licenseDays * 24 * 60 * 60 * 1000));
    
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      {
        $set: {
          license: licenseDays,
          licenseExpiryDate: expiryDate,
          isLicenseActive: true
        }
      },
      { new: true, runValidators: true }
    ).select("-password").lean();
    
    if (!updatedClient) {
      return errorResponse("Client not found", 404);
    }
    
    return successResponse(
      updatedClient,
      `License updated successfully. ${licenseDays} days added, expires on ${expiryDate.toDateString()}`
    );
    
  } catch (error: unknown) {
    logger.error("Error updating license", error);
    return errorResponse("Failed to update license", 500);
  }
};

// Get license status for a client
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    
    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }
    
    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }
    
    const client = await Client.findById(clientId)
      .select("license licenseExpiryDate isLicenseActive name email")
      .lean();
    
    if (!client) {
      return errorResponse("Client not found", 404);
    }
    
    // Calculate remaining days
    const currentDate = new Date();
    const expiryDate = client.licenseExpiryDate ? new Date(client.licenseExpiryDate) : null;
    let remainingDays = 0;
    let isExpired = false;
    
    if (expiryDate) {
      const timeDiff = expiryDate.getTime() - currentDate.getTime();
      remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      isExpired = remainingDays <= 0;
    }
    
    const licenseStatus = {
      clientId: client._id,
      clientName: client.name,
      clientEmail: client.email,
      licenseDays: client.license || 0,
      licenseExpiryDate: expiryDate,
      remainingDays: Math.max(0, remainingDays),
      isLicenseActive: client.isLicenseActive && !isExpired,
      isExpired
    };
    
    return successResponse(licenseStatus, "License status retrieved successfully");
    
  } catch (error: unknown) {
    logger.error("Error fetching license status", error);
    return errorResponse("Failed to fetch license status", 500);
  }
};

// Decrement license for all clients (called by cron job)
export const POST = async (req: NextRequest) => {
  try {
    await connect();
    
    const currentDate = new Date();
    
    // Find all clients with active licenses
    const activeClients = await Client.find({
      isLicenseActive: true,
      licenseExpiryDate: { $exists: true, $ne: null }
    });
    
    let updatedCount = 0;
    let expiredCount = 0;
    
    for (const client of activeClients) {
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
        expiredCount++;
      } else {
        // Update remaining days
        await Client.findByIdAndUpdate(client._id, {
          $set: {
            license: remainingDays
          }
        });
        updatedCount++;
      }
    }
    
    return successResponse(
      { updatedCount, expiredCount },
      `License update completed. ${updatedCount} clients updated, ${expiredCount} licenses expired`
    );
    
  } catch (error: unknown) {
    logger.error("Error in daily license update", error);
    return errorResponse("Failed to update licenses", 500);
  }
};