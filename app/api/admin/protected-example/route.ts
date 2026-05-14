import { NextRequest, NextResponse } from "next/server";
import { checkValidClient } from "@/lib/auth";

// Example 1: Protected route using checkValidClient for Bearer token authentication
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

  // This handler only runs if valid Bearer token is provided
  
  return NextResponse.json({
    success: true,
    message: "Access granted to protected resource",
    data: {
      // Your protected data here
      message: "This is protected content"
    }
  });
};

// Example 2: Simple protected route
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
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({
        success: false,
        message: "Client ID is required"
      }, { status: 400 });
    }

    // Process request with Bearer token authentication
    return NextResponse.json({
      success: true,
      message: "Access granted with Bearer token",
      data: {
        clientId,
        message: "Complete information available"
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to process request",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};