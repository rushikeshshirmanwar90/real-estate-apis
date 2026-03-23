import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { Admin } from "@/lib/models/users/Admin";

export interface LicenseCheckResult {
  hasAccess: boolean;
  accessStatus: 'active' | 'expiring_soon' | 'expired' | 'lifetime';
  message: string;
  client?: {
    _id: string;
    name: string;
    license: number;
    isLicenseActive: boolean;
  };
  admin?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    clientId: string;
  };
}

/**
 * Check if an admin has access based on their client's license status
 */
export async function checkAdminLicenseAccess(
  adminId?: string, 
  adminEmail?: string, 
  clientId?: string
): Promise<LicenseCheckResult> {
  try {
    await connectDB();

    // Find the admin
    let admin;
    if (adminId) {
      admin = await Admin.findById(adminId);
    } else if (adminEmail) {
      admin = await Admin.findOne({ email: adminEmail });
    } else {
      return {
        hasAccess: false,
        accessStatus: 'expired',
        message: 'Admin ID or email is required'
      };
    }

    if (!admin) {
      return {
        hasAccess: false,
        accessStatus: 'expired',
        message: 'Admin not found'
      };
    }

    // Use admin's clientId if not provided
    const targetClientId = clientId || admin.clientId;

    if (!targetClientId) {
      return {
        hasAccess: false,
        accessStatus: 'expired',
        message: 'No client associated with this admin'
      };
    }

    // Verify admin belongs to the client (if clientId was provided)
    if (clientId && admin.clientId !== clientId) {
      return {
        hasAccess: false,
        accessStatus: 'expired',
        message: 'Admin does not belong to this client'
      };
    }

    // Find the client and check license
    const client = await Client.findById(targetClientId).select('name license isLicenseActive licenseExpiryDate');

    if (!client) {
      return {
        hasAccess: false,
        accessStatus: 'expired',
        message: 'Client not found'
      };
    }

    // Check license status
    const hasAccess = client.license === -1 || (client.license > 0 && client.isLicenseActive);
    
    let accessStatus: 'active' | 'expiring_soon' | 'expired' | 'lifetime';
    let message: string;

    if (client.license === -1) {
      accessStatus = 'lifetime';
      message = 'Lifetime access granted';
    } else if (client.license > 0 && client.isLicenseActive) {
      accessStatus = client.license <= 7 ? 'expiring_soon' : 'active';
      message = client.license <= 7 
        ? `Access granted but expires in ${client.license} days` 
        : `Access granted with ${client.license} days remaining`;
    } else {
      accessStatus = 'expired';
      message = 'Access denied - license expired';
    }

    return {
      hasAccess,
      accessStatus,
      message,
      client: {
        _id: client._id.toString(),
        name: client.name,
        license: client.license,
        isLicenseActive: client.isLicenseActive
      },
      admin: {
        _id: admin._id.toString(),
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        clientId: admin.clientId
      }
    };

  } catch (error) {
    console.error('License check error:', error);
    return {
      hasAccess: false,
      accessStatus: 'expired',
      message: 'Failed to check license access'
    };
  }
}

/**
 * Middleware function to check license access for API routes
 */
export async function withLicenseCheck(
  req: NextRequest,
  handler: (req: NextRequest, licenseInfo: LicenseCheckResult) => Promise<NextResponse>,
  options: {
    adminIdParam?: string;
    adminEmailParam?: string;
    clientIdParam?: string;
    requireAccess?: boolean;
  } = {}
): Promise<NextResponse> {
  const {
    adminIdParam = 'adminId',
    adminEmailParam = 'adminEmail', 
    clientIdParam = 'clientId',
    requireAccess = true
  } = options;

  try {
    // Extract parameters from request
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get(adminIdParam);
    const adminEmail = searchParams.get(adminEmailParam);
    const clientId = searchParams.get(clientIdParam);

    // Also check request body for POST/PUT requests
    let bodyParams = {};
    if (req.method !== 'GET') {
      try {
        bodyParams = await req.json();
      } catch {
        // Ignore JSON parsing errors
      }
    }

    const finalAdminId = adminId || (bodyParams as any)[adminIdParam];
    const finalAdminEmail = adminEmail || (bodyParams as any)[adminEmailParam];
    const finalClientId = clientId || (bodyParams as any)[clientIdParam];

    // Check license access
    const licenseInfo = await checkAdminLicenseAccess(finalAdminId, finalAdminEmail, finalClientId);

    // If access is required and not granted, return error
    if (requireAccess && !licenseInfo.hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          message: licenseInfo.message,
          accessStatus: licenseInfo.accessStatus,
          licenseInfo
        },
        { status: 403 }
      );
    }

    // Call the handler with license info
    return await handler(req, licenseInfo);

  } catch (error) {
    console.error('License middleware error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check license access',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Higher-order function to wrap API route handlers with license checking
 */
export function requireLicense(
  handler: (req: NextRequest, licenseInfo: LicenseCheckResult) => Promise<NextResponse>,
  options?: {
    adminIdParam?: string;
    adminEmailParam?: string;
    clientIdParam?: string;
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    return withLicenseCheck(req, handler, { ...options, requireAccess: true });
  };
}

/**
 * Higher-order function to wrap API route handlers with optional license checking
 */
export function checkLicense(
  handler: (req: NextRequest, licenseInfo: LicenseCheckResult) => Promise<NextResponse>,
  options?: {
    adminIdParam?: string;
    adminEmailParam?: string;
    clientIdParam?: string;
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    return withLicenseCheck(req, handler, { ...options, requireAccess: false });
  };
}