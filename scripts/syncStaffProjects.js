/**
 * Migration script to sync existing project assignments from Projects collection to Staff collection
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

// Client Schema
const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  city: { type: String, required: true },
  state: { type: String, required: true },
  address: { type: String, required: true },
  staffs: { type: [String], required: false },
  logo: { type: String, required: false },
}, { timestamps: true });

const Staff = mongoose.models.Staff || mongoose.model("Staff", StaffSchema);
const Projects = mongoose.models.Projects || mongoose.model("Projects", ProjectSchema);
const Client = mongoose.models.Client || mongoose.model("Client", ClientSchema);

async function syncStaffProjectAssignments() {
  try {
    // Get all projects with assigned staff
    const projects = await Projects.find({ assignedStaff: { $exists: true, $ne: [] } }).lean();

    console.log(`Found ${projects.length} projects with assigned staff`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const project of projects) {
      if (!project.assignedStaff || project.assignedStaff.length === 0) continue;

      console.log(`Processing project: ${project.name}`);

      // Get client info separately
      const client = await Client.findById(project.clientId).lean();
      const clientName = client ? client.name : 'Unknown Client';

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
            clientId: project.clientId,
            clientName: clientName,
            assignedAt: new Date(),
            status: "active",
          };

          await Staff.findByIdAndUpdate(
            staffId,
            { $push: { assignedProjects: projectAssignment } },
            { new: true }
          );

          console.log(`  - ✅ Added assignment for ${staff.firstName} ${staff.lastName}`);
          syncedCount++;
        } else {
          console.log(`  - ⏭️  Assignment already exists for ${staff.firstName} ${staff.lastName}`);
          skippedCount++;
        }
      }
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`   - New assignments created: ${syncedCount}`);
    console.log(`   - Assignments already existed: ${skippedCount}`);
    console.log(`   - Total processed: ${syncedCount + skippedCount}`);

    return { success: true, message: "Staff project assignments synced successfully", syncedCount, skippedCount };
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
    
    const result = await syncStaffProjectAssignments();
    
    if (result.success) {
      console.log("✅ Sync completed successfully!");
      console.log(result.message);
      
      if (result.syncedCount > 0) {
        console.log(`\n🎉 Successfully synced ${result.syncedCount} new assignments!`);
        console.log("💡 Run 'npm run diagnose-staff' to verify the results");
      } else {
        console.log("\n💡 No new assignments were needed - everything was already in sync!");
      }
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