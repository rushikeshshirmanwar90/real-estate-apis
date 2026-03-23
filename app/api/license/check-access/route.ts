import { NextRequest, NextResponse } from "next/server";
import  connectDB  from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { Admin } from "@/lib/models/users/Admin";

// Helper functions
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

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

// POST - Check if admin has access based on client license
export const POST = async (req: NextRequest) => {
  try {
    await connectDB();

    const body = await req.json();
    const { adminId, clientId, adminEmail } = body;

    // Validation - need either adminId or adminEmail, and clientId
    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!adminId && !adminEmail) {
      return errorResponse("Admin ID or Admin Email is required", 400);
    }

    if (adminId && !isValidObjectId(adminId)) {
      return errorResponse("Invalid admin ID format", 400);
    }

    if (clientId && !isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // Find the admin
    let admin;
    if (adminId) {
      admin = await Admin.findById(adminId);
    } else {
      admin = await Admin.findOne({ email: adminEmail });
    }

    if (!admin) {
      return errorResponse("Admin not found", 404);
    }

    // Verify admin belongs to the client
    if (admin.clientId !== clientId) {
      return errorResponse("Admin does not belong to this client", 403);
    }

    // Find the client and check license
    const client = await Client.findById(clientId).select('license isLicenseActive name email licenseExpiryDate');

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    // Check license status
    const hasAccess = client.license === -1 || (client.license > 0 && client.isLicenseActive);
    
    let accessStatus: string;
    let accessMessage: string;

    if (client.license === -1) {
      accessStatus = 'lifetime';
      accessMessage = 'Lifetime access granted';
    } else if (client.license > 0 && client.isLicenseActive) {
      accessStatus = client.license <= 7 ? 'expiring_soon' : 'active';
      accessMessage = client.license <= 7 
        ? `Access granted but expires in ${client.license} days` 
        : `Access granted with ${client.license} days remaining`;
    } else {
      accessStatus = 'expired';
      accessMessage = 'Access denied - license expired';
    }

    return successResponse({
      hasAccess,
      accessStatus,
      accessMessage,
      admin: {
        adminId: admin._id,
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminEmail: admin.email,
        clientId: admin.clientId
      },
      client: {
        clientId: client._id,
        clientName: client.name,
        clientEmail: client.email,
        license: client.license,
        isLicenseActive: client.isLicenseActive,
        licenseExpiryDate: client.licenseExpiryDate
      }
    }, accessMessage, hasAccess ? 200 : 403);

  } catch (error) {
    return errorResponse("Failed to check access", 500, error);
  }
};

// GET - Check access for admin by query params
export const GET = async (req: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId");
    const adminEmail = searchParams.get("adminEmail");
    const clientId = searchParams.get("clientId");

    // Validation
    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!adminId && !adminEmail) {
      return errorResponse("Admin ID or Admin Email is required", 400);
    }

    if (adminId && !isValidObjectId(adminId)) {
      return errorResponse("Invalid admin ID format", 400);
    }

    if (clientId && !isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // Find the admin
    let admin;
    if (adminId) {
      admin = await Admin.findById(adminId);
    } else {
      admin = await Admin.findOne({ email: adminEmail });
    }

    if (!admin) {
      return errorResponse("Admin not found", 404);
    }

    // Verify admin belongs to the client
    if (admin.clientId !== clientId) {
      return errorResponse("Admin does not belong to this client", 403);
    }

    // Find the client and check license
    const client = await Client.findById(clientId).select('license isLicenseActive name email licenseExpiryDate');

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    // Check license status
    const hasAccess = client.license === -1 || (client.license > 0 && client.isLicenseActive);
    
    let accessStatus: string;
    let accessMessage: string;

    if (client.license === -1) {
      accessStatus = 'lifetime';
      accessMessage = 'Lifetime access granted';
    } else if (client.license > 0 && client.isLicenseActive) {
      accessStatus = client.license <= 7 ? 'expiring_soon' : 'active';
      accessMessage = client.license <= 7 
        ? `Access granted but expires in ${client.license} days` 
        : `Access granted with ${client.license} days remaining`;
    } else {
      accessStatus = 'expired';
      accessMessage = 'Access denied - license expired';
    }

    return successResponse({
      hasAccess,
      accessStatus,
      accessMessage,
      admin: {
        adminId: admin._id,
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminEmail: admin.email,
        clientId: admin.clientId
      },
      client: {
        clientId: client._id,
        clientName: client.name,
        clientEmail: client.email,
        license: client.license,
        isLicenseActive: client.isLicenseActive,
        licenseExpiryDate: client.licenseExpiryDate
      }
    }, accessMessage, hasAccess ? 200 : 403);

  } catch (error) {
    return errorResponse("Failed to check access", 500, error);
  }
};