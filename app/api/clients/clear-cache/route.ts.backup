import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/redis";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";

// POST - Clear cache for specific client or all clients
export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { clientId, clearAll } = body;

    const clearedKeys: string[] = [];

    if (clearAll) {
      // Clear all client-related cache
      await client.del('clients:all');
      clearedKeys.push('clients:all');
      
      console.log('🧹 Cleared all clients cache');
      
      return successResponse(
        { clearedKeys },
        "All client cache cleared successfully"
      );
    }

    if (clientId) {
      if (!isValidObjectId(clientId)) {
        return errorResponse("Invalid client ID format", 400);
      }

      // Clear specific client cache
      await client.del(`client:${clientId}`);
      clearedKeys.push(`client:${clientId}`);
      
      // Also clear the all clients cache since it contains this client
      await client.del('clients:all');
      clearedKeys.push('clients:all');
      
      console.log(`🧹 Cleared cache for client: ${clientId}`);
      
      return successResponse(
        { clientId, clearedKeys },
        "Client cache cleared successfully"
      );
    }

    return errorResponse("Either clientId or clearAll must be provided", 400);

  } catch (error) {
    console.error("Error clearing client cache:", error);
    return errorResponse("Failed to clear cache", 500, error);
  }
};

// GET - Check cache status for a client
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // Check if client is cached
    const cachedData = await client.get(`client:${clientId}`);
    const isCached = !!cachedData;
    
    let cacheData = null;
    if (cachedData) {
      cacheData = JSON.parse(cachedData);
    }

    return successResponse(
      {
        clientId,
        isCached,
        hasLicenseField: cacheData ? ('license' in cacheData) : false,
        licenseValue: cacheData?.license,
        cacheData: cacheData
      },
      isCached ? "Client is cached" : "Client is not cached"
    );

  } catch (error) {
    console.error("Error checking cache status:", error);
    return errorResponse("Failed to check cache status", 500, error);
  }
};
