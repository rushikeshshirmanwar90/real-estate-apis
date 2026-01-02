import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { Staff } from "@/lib/models/users/Staff";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { errorResponse, successResponse } from "@/lib/models/utils/API";

/**
 * GET /api/clients/staff
 * Get all staff members for a specific client using the client's staffs array
 * 
 * Query params:
 * - clientId: string (required) - The client ID to fetch staff for
 */
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    // Validate required fields
    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    // Validate client ID format
    if (!Types.ObjectId.isValid(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    // Get staff IDs from client's staffs array
    const staffIds = client.staffs || [];

    console.log(`📋 Client ${clientId} has ${staffIds.length} staff members`);

    // If no staff, return empty array
    if (staffIds.length === 0) {
      return successResponse(
        [],
        "No staff members found for this client"
      );
    }

    // Fetch all staff members by their IDs
    const staffMembers = await Staff.find({
      _id: { $in: staffIds }
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${staffMembers.length} staff members`);

    // Convert to plain objects and add assigned projects
    const staffWithDetails = staffMembers.map(staff => {
      const staffObj = staff.toObject();
      // You can add additional fields here if needed
      return staffObj;
    });

    return successResponse(
      staffWithDetails,
      `Retrieved ${staffWithDetails.length} staff member(s) successfully`
    );
  } catch (error: unknown) {
    console.error("GET /clients/staff error:", error);
    return errorResponse("Failed to fetch staff members", 500, error);
  }
};
