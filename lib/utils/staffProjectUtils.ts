import { Staff } from "../models/users/Staff";
import { Projects } from "../models/Project";

/**
 * Assigns a staff member to a project and updates both collections
 */
export async function assignStaffToProject(
  staffId: string,
  projectId: string,
  projectName: string,
  clientId: string,
  clientName: string
) {
  try {
    // 1. Update the Project collection (existing logic)
    const project = await Projects.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      throw new Error("Staff not found");
    }

    // Check if staff is already assigned to this project
    const isAlreadyAssignedToProject = project.assignedStaff?.some(
      (assignedStaff: any) => assignedStaff._id.toString() === staffId
    );

    if (isAlreadyAssignedToProject) {
      throw new Error("Staff is already assigned to this project");
    }

    // Add staff to project's assignedStaff array
    const staffToAssign = {
      _id: staff._id,
      fullName: `${staff.firstName} ${staff.lastName}`,
    };

    const updatedAssignedStaff = [...(project.assignedStaff || []), staffToAssign];

    // Update the project
    await Projects.findByIdAndUpdate(
      projectId,
      { assignedStaff: updatedAssignedStaff },
      { new: true }
    );

    // 2. Update the Staff collection (NEW LOGIC)
    const projectAssignment = {
      projectId: projectId,
      projectName: projectName,
      clientId: clientId,
      clientName: clientName,
      assignedAt: new Date(),
      status: "active",
    };

    // Check if project is already in staff's assignedProjects
    const isAlreadyInStaffProjects = staff.assignedProjects?.some(
      (project: any) => project.projectId.toString() === projectId
    );

    if (!isAlreadyInStaffProjects) {
      await Staff.findByIdAndUpdate(
        staffId,
        { $push: { assignedProjects: projectAssignment } },
        { new: true }
      );
    }

    return { success: true, message: "Staff assigned to project successfully" };
  } catch (error) {
    console.error("Error assigning staff to project:", error);
    throw error;
  }
}

/**
 * Adds a project to staff member's assignedProjects (Staff model only)
 * Use this when the Project model has already been updated
 */
export async function addProjectToStaff(
  staffId: string,
  projectId: string,
  projectName: string,
  clientId: string,
  clientName: string
) {
  try {
    const staff = await Staff.findById(staffId);
    if (!staff) {
      throw new Error("Staff not found");
    }

    // Check if project is already in staff's assignedProjects
    const isAlreadyInStaffProjects = staff.assignedProjects?.some(
      (project: any) => project.projectId.toString() === projectId
    );

    if (!isAlreadyInStaffProjects) {
      const projectAssignment = {
        projectId: projectId,
        projectName: projectName,
        clientId: clientId,
        clientName: clientName,
        assignedAt: new Date(),
        status: "active",
      };

      await Staff.findByIdAndUpdate(
        staffId,
        { $push: { assignedProjects: projectAssignment } },
        { new: true }
      );

      console.log(`✅ Added project ${projectName} to staff ${staffId}'s assignedProjects`);
    } else {
      console.log(`⚠️ Project ${projectName} already exists in staff ${staffId}'s assignedProjects`);
    }

    return { success: true, message: "Project added to staff successfully" };
  } catch (error) {
    console.error("Error adding project to staff:", error);
    throw error;
  }
}

/**
 * Removes a staff member from a project and updates both collections
 */
export async function removeStaffFromProject(staffId: string, projectId: string) {
  try {
    // 1. Update the Project collection (existing logic)
    const project = await Projects.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Remove staff from project's assignedStaff array
    const originalAssignedStaff = project.assignedStaff || [];
    const updatedAssignedStaff = originalAssignedStaff.filter(
      (assignedStaff: any) => assignedStaff._id.toString() !== staffId
    );

    await Projects.findByIdAndUpdate(
      projectId,
      { assignedStaff: updatedAssignedStaff },
      { new: true }
    );

    // 2. Update the Staff collection (NEW LOGIC)
    await Staff.findByIdAndUpdate(
      staffId,
      { $pull: { assignedProjects: { projectId: projectId } } },
      { new: true }
    );

    return { success: true, message: "Staff removed from project successfully" };
  } catch (error) {
    console.error("Error removing staff from project:", error);
    throw error;
  }
}

/**
 * Removes a project from staff member's assignedProjects (Staff model only)
 * Use this when the Project model has already been updated
 */
export async function removeProjectFromStaff(staffId: string, projectId: string) {
  try {
    await Staff.findByIdAndUpdate(
      staffId,
      { $pull: { assignedProjects: { projectId: projectId } } },
      { new: true }
    );

    console.log(`✅ Removed project ${projectId} from staff ${staffId}'s assignedProjects`);
    return { success: true, message: "Project removed from staff successfully" };
  } catch (error) {
    console.error("Error removing project from staff:", error);
    throw error;
  }
}

/**
 * Updates project status for a staff member (e.g., when project is completed)
 */
export async function updateStaffProjectStatus(
  staffId: string,
  projectId: string,
  status: "active" | "completed" | "paused"
) {
  try {
    await Staff.findOneAndUpdate(
      { _id: staffId, "assignedProjects.projectId": projectId },
      { $set: { "assignedProjects.$.status": status } },
      { new: true }
    );

    return { success: true, message: "Project status updated successfully" };
  } catch (error) {
    console.error("Error updating project status:", error);
    throw error;
  }
}

/**
 * Sync staff assignments from Projects collection to Staff collection
 * Use this for data migration or fixing inconsistencies
 */
export async function syncStaffProjectAssignments() {
  try {
    // Get all projects with assigned staff
    const projects = await Projects.find({ assignedStaff: { $exists: true, $ne: [] } })
      .populate('clientId', 'name')
      .lean();

    for (const project of projects) {
      if (!project.assignedStaff || project.assignedStaff.length === 0) continue;

      for (const assignedStaff of project.assignedStaff) {
        const staffId = assignedStaff._id;
        
        // Find the staff member
        const staff = await Staff.findById(staffId);
        if (!staff) continue;

        // Check if this project is already in staff's assignedProjects
        const existingAssignment = staff.assignedProjects?.find(
          (p: any) => p.projectId.toString() === (project._id as any).toString()
        );

        if (!existingAssignment) {
          // Add the project assignment
          const projectAssignment = {
            projectId: project._id,
            projectName: project.name,
            clientId: project.clientId._id || project.clientId,
            clientName: project.clientId.name || 'Unknown Client',
            assignedAt: new Date(),
            status: "active",
          };

          await Staff.findByIdAndUpdate(
            staffId,
            { $push: { assignedProjects: projectAssignment } },
            { new: true }
          );
        }
      }
    }

    return { success: true, message: "Staff project assignments synced successfully" };
  } catch (error) {
    console.error("Error syncing staff project assignments:", error);
    throw error;
  }
}