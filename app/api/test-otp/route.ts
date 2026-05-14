import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { checkValidClient } from "@/lib/auth";

/**
 * Simple test endpoint to verify the app can reach the server
 */
export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    console.log("📧 Test OTP endpoint called");
    console.log("   Body:", JSON.stringify(body, null, 2));

    return successResponse(
      {
        received: body,
        message: "Test endpoint working",
      },
      "Test successful"
    );
  } catch (error: unknown) {
    console.error("❌ Test endpoint error:", error);
    return errorResponse("Test failed", 500);
  }
};

export const GET = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  return successResponse({ status: "ok" }, "Test endpoint is working");
};
