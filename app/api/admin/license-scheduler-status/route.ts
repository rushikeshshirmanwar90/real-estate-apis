import { NextRequest, NextResponse } from "next/server";
import { successResponse } from "@/lib/utils/api-response";
import { checkValidClient, authStatus } from "@/lib/auth";
import { licenseScheduler } from "@/lib/utils/license-scheduler";

// Get license scheduler status
export const GET = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req, ["superadmin"]);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: authStatus(error) }
    );
  }

  const status = licenseScheduler.getStatus();
  
  return successResponse({
    ...status,
    environment: process.env.NODE_ENV,
    schedulerEnabled: true, // Always enabled now
    note: "License scheduler runs in all environments"
  }, "License scheduler status retrieved");
};