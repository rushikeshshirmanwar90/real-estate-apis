/**
 * Diagnostic script to check the current state of staff assignments
 */

const connect = require("../lib/db").default;
const { Staff } = require("../lib/models/users/Staff");
const { Projects } = require("../lib/models/Project");

async function diagnoseStaffAssignments() {
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

    // Get counts
    const totalStaff = await Staff.countDocuments();
    const totalProjects = await Projects.countDocuments();
    
    console.log(`📊 Database Overview:`);
    console.log(`   - Total Staff: ${totalStaff}`);
    console.log(`   - Total Projects: ${totalProjects}`);

    // Check staff with assignedProjects
    const staffWithProjects = await Staff.countDocuments({
      assignedProjects: { $exists: true, $ne: [] }
    });
    
    console.log(`\n📋 Staff Assignment Status:`);
    console.log(`   - Staff with assignedProjects: ${staffWithProjects}/${totalStaff}`);

    // Check projects with assignedStaff
    const projectsWithStaff = await Projects.countDocuments({
      assignedStaff: { $exists: true, $ne: [] }
    });
    
    console.log(`   - Projects with assignedStaff: ${projectsWithStaff}/${totalProjects}`);

    // Show sample data
    console.log(`\n🔍 Sample Staff Data:`);
    const sampleStaff = await Staff.find()
      .select('firstName lastName assignedProjects')
      .limit(3)
      .lean();

    sampleStaff.forEach((staff: any, index: number) => {
      console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName}:`);
      console.log(`      - assignedProjects: ${staff.assignedProjects?.length || 0} projects`);
      if (staff.assignedProjects?.length > 0) {
        staff.assignedProjects.forEach((project: any, pIndex: number) => {
          console.log(`        ${pIndex + 1}. ${project.projectName} (${project.clientName})`);
        });
      }
    });

    console.log(`\n🔍 Sample Project Data:`);
    const sampleProjects = await Projects.find()
      .select('name assignedStaff')
      .limit(3)
      .lean();

    sampleProjects.forEach((project: any, index: number) => {
      console.log(`   ${index + 1}. ${project.name}:`);
      console.log(`      - assignedStaff: ${project.assignedStaff?.length || 0} staff members`);
      if (project.assignedStaff?.length > 0) {
        project.assignedStaff.forEach((staff: any, sIndex: number) => {
          console.log(`        ${sIndex + 1}. ${staff.fullName}`);
        });
      }
    });

    // Determine if sync is needed
    const syncNeeded = projectsWithStaff > staffWithProjects;
    
    console.log(`\n🎯 Analysis:`);
    if (syncNeeded) {
      console.log(`   ❌ SYNC NEEDED: Projects have staff assignments but Staff documents don't`);
      console.log(`   📝 Solution: Run 'npm run sync-staff' to migrate existing assignments`);
    } else if (staffWithProjects === 0 && projectsWithStaff === 0) {
      console.log(`   ℹ️  NO ASSIGNMENTS: No staff are assigned to any projects yet`);
      console.log(`   📝 Solution: Use the assignment API to assign staff to projects`);
    } else {
      console.log(`   ✅ SYNC COMPLETE: Staff assignments are properly synchronized`);
    }

    console.log(`\n📋 Next Steps:`);
    if (syncNeeded) {
      console.log(`   1. Run: npm run sync-staff`);
      console.log(`   2. Run: npm run test-staff`);
    } else if (staffWithProjects === 0) {
      console.log(`   1. Assign staff to projects using: POST /api/(users)/staff?action=assign`);
      console.log(`   2. Run: npm run test-staff`);
    } else {
      console.log(`   1. Run: npm run test-staff (to verify everything works)`);
    }

  } catch (error) {
    console.error("❌ Diagnosis failed:", error);
  } finally {
    process.exit(0);
  }
}

// Run the diagnosis if this file is executed directly
if (require.main === module) {
  diagnoseStaffAssignments();
}

module.exports = { diagnoseStaffAssignments };