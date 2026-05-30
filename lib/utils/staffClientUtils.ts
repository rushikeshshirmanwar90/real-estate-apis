import { Staff } from "@/lib/models/users/Staff";
import { Client } from "@/lib/models/super-admin/Client";
import { Projects } from "@/lib/models/Project";
import { Types } from "mongoose";

/**
 * Utility functions for managing staff-client relationships
 */

/**
 * Removes a staff member from a client organization
 * This function handles the relationship removal without deleting the staff record
 */
export async function removeStaffFromClient(staffId: string, clientId: string) {
  // Validate input parameters
  if (!Types.ObjectId.isValid(staffId)) {
    throw new Error("Invalid staff ID format");
  }
  
  if (!Types.ObjectId.isValid(clientId)) {
    throw new Error("Invalid client ID format");
  }

  // Find the staff member
  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new Error("Staff member not found");
  }

  // Find the client
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error("Client not found");
  }

  // Check if staff is assigned to this client
  const isAssignedToClient = staff.clients?.some(
    (clientAssignment: any) => clientAssignment.clientId.toString() === clientId
  );

  if (!isAssignedToClient) {
    throw new Error("Staff member is not assigned to this client");
  }

  // Check if staff is assigned to any projects for this client
  const assignedProjects = staff.assignedProjects?.filter(
    (project: any) => project.clientId.toString() === clientId
  ) || [];

  if (assignedProjects.length > 0) {
    const projectNames = assignedProjects.map((p: any) => p.projectName).join(', ');
    throw new Error(
      `Cannot remove staff member. They are currently assigned to the following project(s): ${projectNames}. Please unassign them from all projects first.`
    );
  }

  // Perform removal operations sequentially (no transactions needed)
  console.log('🔄 Starting staff removal operations...');

  try {
    // 1. Remove clientId from staff's clients array
    console.log('1️⃣ Removing client from staff clients array...');
    const staffUpdateResult = await Staff.findByIdAndUpdate(
      staffId,
      {
        $pull: {
          clients: { clientId: clientId }
        }
      },
      { new: true }
    );

    if (!staffUpdateResult) {
      throw new Error("Failed to update staff record");
    }

    // 2. Remove staffId from client's staffs array
    console.log('2️⃣ Removing staff from client staffs array...');
    const clientUpdateResult = await Client.findByIdAndUpdate(
      clientId,
      {
        $pull: {
          staffs: staffId
        }
      },
      { new: true }
    );

    if (!clientUpdateResult) {
      throw new Error("Failed to update client record");
    }

    // 3. Remove any project assignments for this client (safety measure)
    console.log('3️⃣ Removing project assignments for this client...');
    await Staff.findByIdAndUpdate(
      staffId,
      {
        $pull: {
          assignedProjects: { clientId: clientId }
        }
      }
    );

    // 4. Remove staff from any projects belonging to this client
    console.log('4️⃣ Removing staff from client projects...');
    const projectUpdateResult = await Projects.updateMany(
      { 
        clientId: clientId,
        "assignedStaff._id": staffId
      },
      {
        $pull: {
          assignedStaff: { _id: staffId }
        }
      }
    );

    console.log(`✅ Updated ${projectUpdateResult.modifiedCount} projects`);
    console.log('✅ All removal operations completed successfully');

    return {
      success: true,
      staffId: staffId,
      clientId: clientId,
      staffName: `${staff.firstName} ${staff.lastName}`,
      clientName: client.name,
      removedAt: new Date().toISOString(),
      message: "Staff member has been removed from client organization successfully"
    };

  } catch (operationError) {
    console.error('❌ Error during removal operations:', operationError);
    throw new Error(`Failed to remove staff member: ${operationError instanceof Error ? operationError.message : String(operationError)}`);
  }
}

/**
 * Assigns a staff member to a client organization
 * This function handles the relationship creation
 */
export async function assignStaffToClient(staffId: string, clientId: string, clientName?: string) {
  // Validate input parameters
  if (!Types.ObjectId.isValid(staffId)) {
    throw new Error("Invalid staff ID format");
  }
  
  if (!Types.ObjectId.isValid(clientId)) {
    throw new Error("Invalid client ID format");
  }

  // Find the staff member
  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new Error("Staff member not found");
  }

  // Find the client
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error("Client not found");
  }

  // Check if staff is already assigned to this client
  const isAlreadyAssigned = staff.clients?.some(
    (clientAssignment: any) => clientAssignment.clientId.toString() === clientId
  );

  if (isAlreadyAssigned) {
    throw new Error("Staff member is already assigned to this client");
  }

  try {
    // 1. Add clientId to staff's clients array
    await Staff.findByIdAndUpdate(
      staffId,
      {
        $push: {
          clients: {
            clientId: clientId,
            clientName: clientName || client.name,
            assignedAt: new Date()
          }
        }
      }
    );

    // 2. Add staffId to client's staffs array (if not already present)
    await Client.findByIdAndUpdate(
      clientId,
      {
        $addToSet: {
          staffs: staffId
        }
      }
    );

    return {
      success: true,
      staffId: staffId,
      clientId: clientId,
      staffName: `${staff.firstName} ${staff.lastName}`,
      clientName: client.name,
      assignedAt: new Date().toISOString(),
      message: "Staff member has been assigned to client organization successfully"
    };

  } catch (error) {
    console.error('❌ Error in assignStaffToClient operations:', error);
    throw error;
  }
}

/**
 * Gets all staff members for a specific client
 */
export async function getStaffForClient(clientId: string) {
  if (!Types.ObjectId.isValid(clientId)) {
    throw new Error("Invalid client ID format");
  }

  const staffMembers = await Staff.find({ 
    'clients.clientId': clientId 
  }).select('firstName lastName email phoneNumber role clients assignedProjects');

  return staffMembers;
}

/**
 * Gets all clients for a specific staff member
 */
export async function getClientsForStaff(staffId: string) {
  if (!Types.ObjectId.isValid(staffId)) {
    throw new Error("Invalid staff ID format");
  }

  const staff = await Staff.findById(staffId)
    .populate({
      path: 'clients.clientId',
      model: 'Client',
      select: 'name email phoneNumber city state address'
    });

  if (!staff) {
    throw new Error("Staff member not found");
  }

  return staff.clients || [];
}