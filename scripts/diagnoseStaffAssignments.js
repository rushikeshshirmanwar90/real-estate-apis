/**
 * Diagnostic script to check the current state of staff assignments
 */

require('dotenv').config();
const mongoose = require("mongoose");

// Database connection
const connect = async () => {
  const DB_URL = process.env.DB_URL;
  
  if (mongoose.connection.readyState === 1) {
    console.log("Already connected to database");
    return;
  }

  if (mongoose.connection.readyState === 2) {
    console.log("Connecting to database...");
    return;
  }

  try {
    await mongoose.connect(DB_URL, {
      dbName: "realEstate",
      bufferCommands: true,
    });
    console.log("✅ Connected to database");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

// Staff Schema
const ClientAssignmentSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  clientName: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
}, { _id: false });

const ProjectAssignmentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Projects", required: true },
  projectName: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  clientName: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "completed", "paused"], default: "active" },
}, { _id: false });

const StaffSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: false },
  clients: { type: [ClientAssignmentSchema], required: false, default: [] },
  role: { type: String, enum: ["site-engineer", "supervisor", "manager"], required: true },
  assignedProjects: { type: [ProjectAssignmentSchema], required: false, default: [] },
  emailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date, required: false },
});

// Project Schema (simplified)
const StaffSchemaForProject = new mongoose.Schema({
  _id: { type: String, required: true },
  fullName: { type: String, required: true },
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  description: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  assignedStaff: { type: [StaffSchemaForProject], required: false },
}, { timestamps: true });

const Staff = mongoose.models.Staff || mongoose.model("Staff", StaffSchema);
const Projects = mongoose.models.Projects || mongoose.model("Projects", ProjectSchema);

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

    sampleStaff.forEach((staff, index) => {
      console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName}:`);
      console.log(`      - assignedProjects: ${staff.assignedProjects?.length || 0} projects`);
      if (staff.assignedProjects?.length > 0) {
        staff.assignedProjects.forEach((project, pIndex) => {
          console.log(`        ${pIndex + 1}. ${project.projectName} (${project.clientName})`);
        });
      }
    });

    console.log(`\n🔍 Sample Project Data:`);
    const sampleProjects = await Projects.find()
      .select('name assignedStaff')
      .limit(3)
      .lean();

    sampleProjects.forEach((project, index) => {
      console.log(`   ${index + 1}. ${project.name}:`);
      console.log(`      - assignedStaff: ${project.assignedStaff?.length || 0} staff members`);
      if (project.assignedStaff?.length > 0) {
        project.assignedStaff.forEach((staff, sIndex) => {
          console.log(`        ${sIndex + 1}. ${staff.fullName}`);
        });
      }
    });

    // Determine if sync is needed - check if any project has staff that aren't in staff assignments
    let syncNeeded = false;
    let missingAssignments = 0;
    
    const projectsWithAssignedStaff = await Projects.find({ assignedStaff: { $exists: true, $ne: [] } }).lean();
    
    for (const project of projectsWithAssignedStaff) {
      for (const assignedStaff of project.assignedStaff) {
        const staff = await Staff.findById(assignedStaff._id).lean();
        if (staff) {
          const hasAssignment = staff.assignedProjects?.some(
            (p) => p.projectId.toString() === project._id.toString()
          );
          if (!hasAssignment) {
            syncNeeded = true;
            missingAssignments++;
          }
        }
      }
    }
    
    console.log(`\n🎯 Analysis:`);
    if (syncNeeded) {
      console.log(`   ❌ SYNC NEEDED: Found ${missingAssignments} missing assignments in Staff documents`);
      console.log(`   📝 Solution: Run 'npm run sync-staff' to migrate existing assignments`);
    } else {
      console.log(`   ✅ SYNC COMPLETE: All staff assignments are properly synchronized`);
      console.log(`   📊 Total assignments: ${staffWithProjects} staff have projects, ${projectsWithAssignedStaff.length} projects have staff`);
    }

    console.log(`\n📋 Next Steps:`);
    if (syncNeeded) {
      console.log(`   1. Run: npm run sync-staff`);
      console.log(`   2. Run: npm run test-staff`);
    } else if (staffWithProjects === 0) {
      console.log(`   1. Assign staff to projects using: POST /api/(users)/staff?action=assign`);
      console.log(`   2. Run: npm run test-staff`);
    } else {
      console.log(`   1. System is working correctly! ✅`);
      console.log(`   2. You can now assign/remove staff using the API endpoints`);
      console.log(`   3. All new assignments will populate both collections automatically`);
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