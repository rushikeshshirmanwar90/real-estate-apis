/**
 * Migration script to sync existing project assignments from Projects collection to Staff collection
 * Run this once after updating the Staff model to populate the assignedProjects field
 */

const connect = require("../lib/db").default;

async function syncStaffProjectAssignments() {
  try {
    const { Staff } = require("../lib/models/users/Staff");
    const { Projects } = require("../lib/models/Project");

    // Get all projects with assigned staff
    const projects = await Projects.find({ assignedStaff: { $exists: true, $ne: [] } })
      .populate('clientId', 'name')
      .lean();

    console.log(`Found ${projects.length} projects with assigned staff`);

    for (const project of projects) {
      if (!project.assignedStaff || project.assignedStaff.length === 0) continue;

      console.log(`Processing project: ${project.name}`);

      for (const assignedStaff of project.assignedStaff) {
        const staffId = assignedStaff._id;
        
        // Find the staff member
        const staff = await Staff.findById(staffId);
        if (!staff) {
          console.log(`  - Staff ${staffId} not found, skipping`);
          continue;
        }

        // Check if this project is already in staff's assignedProjects
        const existingAssignment = staff.assignedProjects?.find(
          (p) => p.projectId.toString() === project._id.toString()
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

          console.log(`  - Added assignment for ${staff.firstName} ${staff.lastName}`);
        } else {
          console.log(`  - Assignment already exists for ${staff.firstName} ${staff.lastName}`);
        }
      }
    }

    return { success: true, message: "Staff project assignments synced successfully" };
  } catch (error) {
    console.error("Error syncing staff project assignments:", error);
    throw error;
  }
}

async function runSync() {
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
    console.log("🔄 Starting staff project assignments sync...");
    
    await connect();
    console.log("✅ Connected to database");
    
    const result = await syncStaffProjectAssignments();
    
    if (result.success) {
      console.log("✅ Sync completed successfully!");
      console.log(result.message);
    } else {
      console.error("❌ Sync failed");
    }
  } catch (error) {
    console.error("❌ Error during sync:", error);
  } finally {
    process.exit(0);
  }
}

// Run the sync if this file is executed directly
if (require.main === module) {
  runSync();
}

module.exports = { runSync, syncStaffProjectAssignments };