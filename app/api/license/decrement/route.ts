import { NextRequest, NextResponse } from "next/server";
import connectDB  from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";

// Helper functions
const errorResponse = (message: string, status: number, error?: unknown) => {
  console.error(`Error: ${message}`, error);
  return NextResponse.json(
    { success: false, message, error: error instanceof Error ? error.message : error },
    { status }
  );
};

const successResponse = (
  data: any,
  message: string = "Success",
  status: number = 200
) => {
  return NextResponse.json(
    { success: true, message, data },
    { status }
  );
};

// POST - Decrement all client licenses by 1 day (for daily cron job)
export const POST = async (req: NextRequest) => {
  try {
    await connectDB();

    console.log('🕒 Starting daily license decrement job...');

    // Find all clients with active licenses (license > 0, excluding lifetime -1)
    const clientsWithActiveLicense = await Client.find({
      license: { $gt: 0 }, // Greater than 0 (excludes expired 0 and lifetime -1)
      isLicenseActive: true
    });

    console.log(`📊 Found ${clientsWithActiveLicense.length} clients with active licenses`);

    const results = {
      processed: 0,
      expired: 0,
      stillActive: 0,
      errors: 0,
      details: [] as any[]
    };

    // Process each client
    for (const client of clientsWithActiveLicense) {
      try {
        const newLicenseValue = client.license - 1;
        const isNowExpired = newLicenseValue <= 0;

        // Update the client
        await Client.findByIdAndUpdate(client._id, {
          license: Math.max(0, newLicenseValue), // Ensure it doesn't go below 0
          isLicenseActive: !isNowExpired,
          ...(isNowExpired && { licenseExpiryDate: new Date() }) // Set expiry date if expired
        });

        results.processed++;
        
        if (isNowExpired) {
          results.expired++;
          console.log(`⚠️ Client ${client.name} (${client._id}) license expired`);
        } else {
          results.stillActive++;
          console.log(`✅ Client ${client.name} (${client._id}) license decremented to ${newLicenseValue} days`);
        }

        results.details.push({
          clientId: client._id,
          clientName: client.name,
          clientEmail: client.email,
          previousLicense: client.license,
          newLicense: Math.max(0, newLicenseValue),
          isExpired: isNowExpired,
          status: isNowExpired ? 'expired' : newLicenseValue <= 7 ? 'expiring_soon' : 'active'
        });

      } catch (clientError) {
        results.errors++;
        console.error(`❌ Error processing client ${client._id}:`, clientError);
        
        results.details.push({
          clientId: client._id,
          clientName: client.name,
          error: clientError instanceof Error ? clientError.message : 'Unknown error'
        });
      }
    }

    console.log('✅ Daily license decrement job completed');
    console.log(`📊 Results: ${results.processed} processed, ${results.expired} expired, ${results.stillActive} still active, ${results.errors} errors`);

    return successResponse(results, 
      `Daily license decrement completed. Processed: ${results.processed}, Expired: ${results.expired}, Still Active: ${results.stillActive}, Errors: ${results.errors}`
    );

  } catch (error) {
    console.error('❌ Daily license decrement job failed:', error);
    return errorResponse("Failed to decrement licenses", 500, error);
  }
};

// GET - Get license decrement status and next run info
export const GET = async (req: NextRequest) => {
  try {
    await connectDB();

    // Get license statistics
    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ 
      license: { $gt: 0 }, 
      isLicenseActive: true 
    });
    const expiredClients = await Client.countDocuments({ 
      license: 0, 
      isLicenseActive: false 
    });
    const lifetimeClients = await Client.countDocuments({ 
      license: -1, 
      isLicenseActive: true 
    });
    const expiringSoonClients = await Client.countDocuments({ 
      license: { $gt: 0, $lte: 7 }, 
      isLicenseActive: true 
    });

    // Get clients expiring in next 7 days
    const expiringSoonList = await Client.find({ 
      license: { $gt: 0, $lte: 7 }, 
      isLicenseActive: true 
    }).select('name email license licenseExpiryDate').sort({ license: 1 });

    return successResponse({
      statistics: {
        totalClients,
        activeClients,
        expiredClients,
        lifetimeClients,
        expiringSoonClients
      },
      expiringSoon: expiringSoonList.map(client => ({
        clientId: client._id,
        clientName: client.name,
        clientEmail: client.email,
        daysLeft: client.license,
        expiryDate: client.licenseExpiryDate
      })),
      lastRun: new Date().toISOString(),
      nextRun: 'Scheduled daily via cron job'
    }, "License status retrieved successfully");

  } catch (error) {
    return errorResponse("Failed to get license status", 500, error);
  }
};