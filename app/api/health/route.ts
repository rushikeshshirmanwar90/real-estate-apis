import { NextRequest } from "next/server";
import { successResponse } from "@/lib/utils/api-response";
import { checkValidClient } from "@/lib/auth";

/**
 * GET /api/health
 * 
 * Simple health check endpoint to verify the server is running
 * Protected with Bearer token authentication
 */
export const GET = async (request: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(request);
  } catch (error) {
    return successResponse(
      {
        status: "unauthorized",
        message: error instanceof Error ? error.message : "Unauthorized"
      },
      "Unauthorized",
      401
    );
  }
  
  return successResponse(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      server: "Real Estate APIs",
      version: "1.0.0"
    },
    "Server is healthy and running"
  );
};