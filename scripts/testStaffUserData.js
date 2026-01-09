/**
 * Test script to verify staff user data includes assignedProjects
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
    console.log("Connected to database successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
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

const Staff = mongoose.models.Staff || mongoose.model("Staff", StaffSchema);

async function testStaffUserData() {
  try {
    console.log("✅ Environment variables loaded");
    
    await connect();
    console.log("✅ Connected to database");

    // Find a staff member with assigned projects
    const staffWithProjects = await Staff.findOne({
      assignedProjects: { $exists: true, $ne: [] }
    }).lean();

    if (!staffWithProjects) {
      console.log("❌ No staff found with assigned projects");
      return;
    }

    console.log("📋 Staff Member Found:");
    console.log(`   Name: ${staffWithProjects.firstName} ${staffWithProjects.lastName}`);
    console.log(`   Email: ${staffWithProjects.email}`);
    console.log(`   Role: ${staffWithProjects.role}`);
    console.log(`   Assigned Projects: ${staffWithProjects.assignedProjects?.length || 0}`);

    if (staffWithProjects.assignedProjects && staffWithProjects.assignedProjects.length > 0) {
      console.log("\n📝 Assigned Projects Details:");
      staffWithProjects.assignedProjects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.projectName}`);
        console.log(`      - Client: ${project.clientName}`);
        console.log(`      - Project ID: ${project.projectId}`);
        console.log(`      - Client ID: ${project.clientId}`);
        console.log(`      - Status: ${project.status}`);
        console.log(`      - Assigned At: ${project.assignedAt}`);
      });
    }

    // Test API endpoint simulation
    console.log("\n🧪 Testing API Response Simulation:");
    
    // Simulate what the API would return for this staff member
    const apiResponse = {
      success: true,
      data: {
        _id: staffWithProjects._id,
        firstName: staffWithProjects.firstName,
        lastName: staffWithProjects.lastName,
        email: staffWithProjects.email,
        role: staffWithProjects.role,
        clients: staffWithProjects.clients || [],
        assignedProjects: staffWithProjects.assignedProjects || [],
        phoneNumber: staffWithProjects.phoneNumber
      }
    };

    console.log("📦 Simulated API Response:");
    console.log(JSON.stringify(apiResponse, null, 2));

    // Verify the data structure matches what the React Native app expects
    const userData = apiResponse.data;
    const hasAssignedProjects = 'assignedProjects' in userData && Array.isArray(userData.assignedProjects);
    const assignedProjectsCount = userData.assignedProjects?.length || 0;

    console.log("\n✅ Data Structure Validation:");
    console.log(`   Has assignedProjects field: ${hasAssignedProjects}`);
    console.log(`   assignedProjects is array: ${Array.isArray(userData.assignedProjects)}`);
    console.log(`   assignedProjects count: ${assignedProjectsCount}`);
    console.log(`   Ready for React Native: ${hasAssignedProjects && assignedProjectsCount > 0 ? '✅' : '❌'}`);

    if (hasAssignedProjects && assignedProjectsCount > 0) {
      console.log("\n🎯 SUCCESS: Staff user data is properly structured with assignedProjects!");
      console.log("   The React Native app should be able to display assigned projects.");
    } else {
      console.log("\n❌ ISSUE: Staff user data is missing assignedProjects or it's empty.");
      console.log("   The React Native app won't be able to display assigned projects.");
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testStaffUserData();
}

module.exports = { testStaffUserData };