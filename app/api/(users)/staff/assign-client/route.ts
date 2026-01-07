import connect from "@/lib/db";
import { Staff } from "@/lib/models/users/Staff";
import { Client } from "@/lib/models/super-admin/Client";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { requireValidClient } from "@/lib/utils/client-validation";

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

/**
 * POST /api/(users)/staff/assign-client
 * Assign a staff member to one or more clients by adding client objects to their clients array
 * 
 * Request body:
 * {
 *   staffId: string,           // Required: Staff member ID
 *   clientIds: string[]        // Required: Array of client IDs to assign
 * }
 */
export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const data = await req.json();

    // Validate required fields
    if (!data.staffId) {
      return errorResponse("Staff ID is required", 400);
    }

    if (!data.clientIds || !Array.isArray(data.clientIds) || data.clientIds.length === 0) {
      return errorResponse("At least one client ID is required", 400);
    }

    // Validate staff ID format
    if (!isValidObjectId(data.staffId)) {
      return errorResponse("Invalid staff ID format", 400);
    }

    // Validate all client IDs format
    for (const clientId of data.clientIds) {
      if (!isValidObjectId(clientId)) {
        return errorResponse(`Invalid client ID format: ${clientId}`, 400);
      }
    }

    // Find the staff member
    const staff = await Staff.findById(data.staffId);
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    // Get current clients (ensure it's an array)
    const currentClients = staff.clients || [];
    const currentClientIds = currentClients.map((c: { clientId: string }) => c.clientId);
    
    // Filter out clientIds that are already assigned
    const newClientIds = data.clientIds.filter(
      (clientId: string) => !currentClientIds.includes(clientId)
    );

    if (newClientIds.length === 0) {
      return errorResponse(
        "Staff member is already assigned to all specified clients",
        409
      );
    }

    // Fetch client details for new assignments
    const newClientAssignments = [];
    for (const clientId of newClientIds) {
      try {
        // Validate that client exists
        await requireValidClient(clientId);
        
        // Fetch client details
        const client = await Client.findById(clientId);
        if (!client) {
          return errorResponse(`Client not found: ${clientId}`, 404);
        }

        newClientAssignments.push({
          clientId: clientId,
          clientName: client.name || client.companyName || 'Unknown Client',
          assignedAt: new Date()
        });
      } catch (clientError) {
        if (clientError instanceof Error) {
          return errorResponse(clientError.message, 404);
        }
        return errorResponse(`Client validation failed for ID: ${clientId}`, 404);
      }
    }

    // Add new client assignments to the staff member's clients array
    const updatedClients = [...currentClients, ...newClientAssignments];

    // Update the staff member
    const updatedStaff = await Staff.findByIdAndUpdate(
      data.staffId,
      { 
        clients: updatedClients,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return errorResponse("Failed to update staff member", 500);
    }

    return successResponse(
      {
        staffId: data.staffId,
        staffName: `${updatedStaff.firstName} ${updatedStaff.lastName}`,
        clients: updatedClients,
        newlyAssignedClients: newClientAssignments,
        assignedAt: new Date().toISOString()
      },
      `Staff member assigned to ${newClientIds.length} new client(s) successfully`,
      200
    );
  } catch (error: unknown) {
    console.error("POST /staff/assign-client error:", error);
    return errorResponse("Failed to assign staff to clients", 500, error);
  }
};

/**
 * DELETE /api/(users)/staff/assign-client
 * Remove a staff member from one or more clients by removing client objects from their clients array
 * 
 * Query params:
 * - staffId: string (required)
 * - clientIds: string (required, comma-separated list of client IDs)
 */
export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    const clientIdsParam = searchParams.get("clientIds");

    // Validate required fields
    if (!staffId) {
      return errorResponse("Staff ID is required", 400);
    }

    if (!clientIdsParam) {
      return errorResponse("Client IDs are required", 400);
    }

    // Parse comma-separated client IDs
    const clientIds = clientIdsParam.split(",").map(id => id.trim());

    if (clientIds.length === 0) {
      return errorResponse("At least one client ID is required", 400);
    }

    // Validate staff ID format
    if (!isValidObjectId(staffId)) {
      return errorResponse("Invalid staff ID format", 400);
    }

    // Validate all client IDs format
    for (const clientId of clientIds) {
      if (!isValidObjectId(clientId)) {
        return errorResponse(`Invalid client ID format: ${clientId}`, 400);
      }
    }

    // Find the staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    // Get current clients
    const currentClients = staff.clients || [];

    // Filter out the clients to remove
    const updatedClients = currentClients.filter(
      (client: { clientId: string }) => !clientIds.includes(client.clientId)
    );

    // Check if any clients were actually removed
    if (updatedClients.length === currentClients.length) {
      return errorResponse(
        "Staff member is not assigned to any of the specified clients",
        404
      );
    }

    // Update the staff member
    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      { 
        clients: updatedClients,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return errorResponse("Failed to update staff member", 500);
    }

    const removedCount = currentClients.length - updatedClients.length;

    return successResponse(
      {
        staffId: staffId,
        staffName: `${updatedStaff.firstName} ${updatedStaff.lastName}`,
        clients: updatedClients,
        removedClientIds: clientIds,
        removedAt: new Date().toISOString()
      },
      `Staff member removed from ${removedCount} client(s) successfully`,
      200
    );
  } catch (error: unknown) {
    console.error("DELETE /staff/assign-client error:", error);
    return errorResponse("Failed to remove staff from clients", 500, error);
  }
};
