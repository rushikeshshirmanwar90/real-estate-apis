import { NextRequest, NextResponse } from "next/server";
import { requireLicense, checkLicense, LicenseCheckResult } from "@/lib/middleware/licenseCheck";

// Example 1: Protected route that requires valid license
export const GET = requireLicense(async (req: NextRequest, licenseInfo: LicenseCheckResult) => {
  // This handler only runs if the admin has valid license access
  
  return NextResponse.json({
    success: true,
    message: "Access granted to protected resource",
    data: {
      // Your protected data here
      adminInfo: licenseInfo.admin,
      clientInfo: licenseInfo.client,
      accessStatus: licenseInfo.accessStatus
    }
  });
});

// Example 2: Route that checks license but doesn't block access
export const POST = checkLicense(async (req: NextRequest, licenseInfo: LicenseCheckResult) => {
  // This handler runs regardless of license status, but provides license info
  
  if (!licenseInfo.hasAccess) {
    // Handle expired license case - maybe return limited data or warning
    return NextResponse.json({
      success: true,
      message: "Limited access due to expired license",
      warning: licenseInfo.message,
      accessStatus: licenseInfo.accessStatus,
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
    data: {
      // Full data for valid license users
      adminInfo: licenseInfo.admin,
      clientInfo: licenseInfo.client,
      accessStatus: licenseInfo.accessStatus,
      fullData: "Complete information"
    }
  });
});

// Example 3: Custom license checking with specific parameters
export const PUT = async (req: NextRequest) => {
  // Manual license check with custom parameter names
  const { checkAdminLicenseAccess } = await import("@/lib/middleware/licenseCheck");
  
  try {
    const body = await req.json();
    const { userId, companyId } = body; // Your custom parameter names
    
    // Check license with custom parameters
    const licenseInfo = await checkAdminLicenseAccess(userId, undefined, companyId);
    
    if (!licenseInfo.hasAccess) {
      return NextResponse.json({
        success: false,
        message: licenseInfo.message,
        accessStatus: licenseInfo.accessStatus
      }, { status: 403 });
    }
    
    // Proceed with your business logic
    return NextResponse.json({
      success: true,
      message: "Operation completed successfully",
      data: {
        // Your response data
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