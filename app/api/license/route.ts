import { NextRequest, NextResponse } from "next/server";
import connectDB  from "@/lib/db";
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

// Convert months/years to days
const convertToDays = (value: number, unit: 'days' | 'months' | 'years' | 'lifetime'): number => {
  switch (unit) {
    case 'days':
      return value;
    case 'months':
      return value * 31; // 1 month = 31 days
    case 'years':
      return value * 365; // 1 year = 365 days
    case 'lifetime':
      return -1; // Special value for lifetime access
    default:
      return value;
  }
};

// GET - Get license information for a client
export const GET = async (req: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    const client = await Client.findById(clientId).select('license isLicenseActive name email');

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    return successResponse({
      clientId: client._id,
      clientName: client.name,
      clientEmail: client.email,
      license: client.license,
      isLicenseActive: client.isLicenseActive,
      licenseStatus: client.license === -1 ? 'lifetime' : 
                   client.license === 0 ? 'expired' : 
                   client.license <= 7 ? 'expiring_soon' : 'active'
    }, "License information retrieved successfully");

  } catch (error) {
    return errorResponse("Failed to retrieve license information", 500, error);
  }
};

// POST - Update license for a client
export const POST = async (req: NextRequest) => {
  try {
    await connectDB();

    const body = await req.json();
    const { clientId, licenseValue, licenseUnit } = body;

    // Validation
    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    if (licenseValue === undefined || licenseValue === null) {
      return errorResponse("License value is required", 400);
    }

    if (!licenseUnit || !['days', 'months', 'years', 'lifetime'].includes(licenseUnit)) {
      return errorResponse("Valid license unit is required (days, months, years, lifetime)", 400);
    }

    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    // Convert to days
    const daysToAdd = convertToDays(licenseValue, licenseUnit);
    
    let newLicenseValue: number;
    let licenseExpiryDate: Date | undefined;

    if (licenseUnit === 'lifetime') {
      newLicenseValue = -1; // Lifetime access
      licenseExpiryDate = undefined;
    } else {
      // Add days to current license (if positive) or set new license
      if (client.license > 0) {
        newLicenseValue = client.license + daysToAdd;
      } else {
        newLicenseValue = daysToAdd;
      }
      
      // Calculate expiry date
      licenseExpiryDate = new Date();
      licenseExpiryDate.setDate(licenseExpiryDate.getDate() + newLicenseValue);
    }

    // Update client license
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      {
        license: newLicenseValue,
        isLicenseActive: newLicenseValue !== 0,
        licenseExpiryDate: licenseExpiryDate
      },
      { new: true }
    ).select('license isLicenseActive licenseExpiryDate name email');

    return successResponse({
      clientId: updatedClient._id,
      clientName: updatedClient.name,
      clientEmail: updatedClient.email,
      license: updatedClient.license,
      isLicenseActive: updatedClient.isLicenseActive,
      licenseExpiryDate: updatedClient.licenseExpiryDate,
      licenseStatus: updatedClient.license === -1 ? 'lifetime' : 
                   updatedClient.license === 0 ? 'expired' : 
                   updatedClient.license <= 7 ? 'expiring_soon' : 'active',
      addedDays: daysToAdd,
      unit: licenseUnit
    }, `License updated successfully. Added ${licenseValue} ${licenseUnit} (${daysToAdd === -1 ? 'lifetime' : daysToAdd + ' days'})`);

  } catch (error) {
    return errorResponse("Failed to update license", 500, error);
  }
};

// PUT - Set specific license value (replace current license)
export const PUT = async (req: NextRequest) => {
  try {
    await connectDB();

    const body = await req.json();
    const { clientId, licenseValue, licenseUnit } = body;

    // Validation
    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    if (licenseValue === undefined || licenseValue === null) {
      return errorResponse("License value is required", 400);
    }

    if (!licenseUnit || !['days', 'months', 'years', 'lifetime'].includes(licenseUnit)) {
      return errorResponse("Valid license unit is required (days, months, years, lifetime)", 400);
    }

    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    // Convert to days
    const newLicenseValue = convertToDays(licenseValue, licenseUnit);
    
    let licenseExpiryDate: Date | undefined;

    if (licenseUnit === 'lifetime') {
      licenseExpiryDate = undefined;
    } else {
      // Calculate expiry date from today
      licenseExpiryDate = new Date();
      licenseExpiryDate.setDate(licenseExpiryDate.getDate() + newLicenseValue);
    }

    // Update client license (replace current value)
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      {
        license: newLicenseValue,
        isLicenseActive: newLicenseValue !== 0,
        licenseExpiryDate: licenseExpiryDate
      },
      { new: true }
    ).select('license isLicenseActive licenseExpiryDate name email');

    return successResponse({
      clientId: updatedClient._id,
      clientName: updatedClient.name,
      clientEmail: updatedClient.email,
      license: updatedClient.license,
      isLicenseActive: updatedClient.isLicenseActive,
      licenseExpiryDate: updatedClient.licenseExpiryDate,
      licenseStatus: updatedClient.license === -1 ? 'lifetime' : 
                   updatedClient.license === 0 ? 'expired' : 
                   updatedClient.license <= 7 ? 'expiring_soon' : 'active',
      setDays: newLicenseValue,
      unit: licenseUnit
    }, `License set successfully. Set to ${licenseValue} ${licenseUnit} (${newLicenseValue === -1 ? 'lifetime' : newLicenseValue + ' days'})`);

  } catch (error) {
    return errorResponse("Failed to set license", 500, error);
  }
};

// DELETE - Revoke license (set to 0)
export const DELETE = async (req: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    // Revoke license
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      {
        license: 0,
        isLicenseActive: false,
        licenseExpiryDate: new Date() // Set to current date to indicate expired
      },
      { new: true }
    ).select('license isLicenseActive licenseExpiryDate name email');

    return successResponse({
      clientId: updatedClient._id,
      clientName: updatedClient.name,
      clientEmail: updatedClient.email,
      license: updatedClient.license,
      isLicenseActive: updatedClient.isLicenseActive,
      licenseExpiryDate: updatedClient.licenseExpiryDate,
      licenseStatus: 'expired'
    }, "License revoked successfully");

  } catch (error) {
    return errorResponse("Failed to revoke license", 500, error);
  }
};