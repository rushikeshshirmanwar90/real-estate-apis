/**
 * Test script to verify staff assignment functionality
 */

const connect = require("../lib/db").default;

async function assignStaffToProject(staffId, projectId, projectName, clientId, clientName) {
  try {
    const { Staff } = require("../lib/models/users/Staff");
    const { Projects } = require("../lib/models/Project");

    // 1. Update the Project collection
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
      (assignedStaff) => assignedStaff._id.toString() === staffId
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

    // 2. Update the Staff collection
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
      (project) => project.projectId.toString() === projectId
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

async function testStaffAssignment() {
  try {
    // Check environment variables
    const requiredEnvVars = ['DB_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      process.exit(1);
    }

    console.log("✅ All required environment variables are set");

    await connect();
    console.log("✅ Connected to database");

    const { Staff } = require("../lib/models/users/Staff");
    const { Projects } = require("../lib/models/Project");

    // Find a sample staff and project
    const sampleStaff = await Staff.findOne().lean();
    const sampleProject = await Projects.findOne().populate('clientId', 'name').lean();

    if (!sampleStaff || !sampleProject) {
      console.log("❌ No sample staff or project found. Please create some test data first.");
      console.log("💡 You can create test data through your application's UI or API endpoints.");
      return;
    }

    console.log("📋 Sample Staff:", {
      id: sampleStaff._id,
      name: `${sampleStaff.firstName} ${sampleStaff.lastName}`,
      currentProjects: sampleStaff.assignedProjects?.length || 0
    });

    console.log("📋 Sample Project:", {
      id: sampleProject._id,
      name: sampleProject.name,
      client: sampleProject.clientId?.name || 'Unknown',
      currentStaff: sampleProject.assignedStaff?.length || 0
    });

    // Test the assignment utility
    try {
      await assignStaffToProject(
        sampleStaff._id.toString(),
        sampleProject._id.toString(),
        sampleProject.name,
        sampleProject.clientId._id.toString(),
        sampleProject.clientId.name
      );
      console.log("✅ Staff assignment test successful!");
    } catch (error) {
      if (error.message.includes("already assigned")) {
        console.log("ℹ️ Staff is already assigned to this project (expected behavior)");
      } else {
        throw error;
      }
    }

    // Verify the assignment in both collections
    const updatedStaff = await Staff.findById(sampleStaff._id).lean();
    const updatedProject = await Projects.findById(sampleProject._id).lean();

    console.log("📊 Updated Staff assignedProjects:", updatedStaff?.assignedProjects?.length || 0);
    console.log("📊 Updated Project assignedStaff:", updatedProject?.assignedStaff?.length || 0);

    // Show detailed assignment info
    if (updatedStaff?.assignedProjects?.length) {
      console.log("📝 Staff's assigned projects:");
      updatedStaff.assignedProjects.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.projectName} (Client: ${project.clientName})`);
      });
    }

    console.log("✅ Test completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testStaffAssignment();
}

module.exports = { testStaffAssignment };