import { NextRequest, NextResponse } from "next/server";
import { checkLicense, withLicenseCheck } from "@/lib/middleware/licenseCheck";

// Example 1: Protected route using withLicenseCheck wrapper
export const GET = withLicenseCheck(async (req: NextRequest) => {
  // This handler only runs if the client has valid license access
  
  return NextResponse.json({
    success: true,
    message: "Access granted to protected resource",
    data: {
      // Your protected data here
      message: "This is protected content"
    }
  });
});

// Example 2: Route that manually checks license
export const POST = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({
        success: false,
        message: "Client ID is required"
      }, { status: 400 });
    }

    // Manual license check
    const licenseInfo = await checkLicense(clientId);
    
    if (!licenseInfo.hasAccess) {
      // Handle expired license case - maybe return limited data or warning
      return NextResponse.json({
        success: true,
        message: "Limited access due to expired license",
        warning: licenseInfo.message,
        license: licenseInfo.license,
        data: {
          // Limited data for expired users
          basicInfo: "Some basic information"
        }
      });
    }

    // Full access for valid license
    return NextResponse.json({
      success: true,
      message: "Full access granted",
      license: licenseInfo.license,
      data: {
        // Full data for valid license users
        fullData: "Complete information"
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