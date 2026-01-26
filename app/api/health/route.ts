import { NextRequest } from "next/server";
import { successResponse } from "@/lib/utils/api-response";

/**
 * GET /api/health
 * 
 * Simple health check endpoint to verify the server is running
 */
export async function GET(request: NextRequest) {
  return successResponse(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      server: "Real Estate APIs",
      version: "1.0.0"
    },
    "Server is healthy and running"
  );
}