/**
 * Debug script to test project API directly
 * Run with: node scripts/debug-project-api.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URL;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Client Schema
const clientSchema = new mongoose.Schema({
  email: String,
  name: String,
  company: String
});

// Project Schema
const projectSchema = new mongoose.Schema({
  clientId: mongoose.Schema.Types.ObjectId,
  name: String,
  projectName: String,
  location: String,
  type: String,
  section: Array
});

const Client = mongoose.model('Client', clientSchema);
const Project = mongoose.model('Project', projectSchema, 'projects');

async function debugProjectAPI() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find admin user's Client record
    const adminEmail = 'rushikeshshrimanwar@gmail.com';
    console.log(`🔍 Looking for Client with email: ${adminEmail}`);
    
    const client = await Client.findOne({ email: adminEmail });
    
    if (!client) {
      console.error(`❌ No Client found with email: ${adminEmail}`);
      console.log('\n💡 This is why you see "No projects found"');
      console.log('The Client record created by the script might have a different email or structure.');
      
      // Check all clients
      console.log('\n📋 All Clients in database:');
      const allClients = await Client.find({}).limit(10);
      allClients.forEach((c, i) => {
        console.log(`   ${i + 1}. ID: ${c._id}, Email: ${c.email}, Name: ${c.name}`);
      });
      
      process.exit(1);
    }
    
    console.log('✅ Client found:');
    console.log('   ID:', client._id.toString());
    console.log('   Email:', client.email);
    console.log('   Name:', client.name);
    console.log('');

    // Step 2: Check for projects with this clientId
    console.log(`🔍 Looking for projects with clientId: ${client._id}`);
    
    const projects = await Project.find({ clientId: client._id });
    
    if (projects.length === 0) {
      console.log('❌ No projects found for this client');
      console.log('\n💡 This is why AdminDashboard shows "No projects found"');
      
      // Check if there are ANY projects in the database
      const totalProjects = await Project.countDocuments();
      console.log(`\n📊 Total projects in database: ${totalProjects}`);
      
      if (totalProjects > 0) {
        console.log('\n📋 Sample projects (showing clientId):');
        const sampleProjects = await Project.find({}).limit(5);
        sampleProjects.forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.name || p.projectName} - clientId: ${p.clientId}`);
        });
        
        console.log('\n💡 The projects exist but have different clientIds');
        console.log('   You need to either:');
        console.log('   1. Create a new project with the correct clientId');
        console.log('   2. Update existing projects to use the correct clientId');
      }
      
      process.exit(1);
    }
    
    console.log(`✅ Found ${projects.length} project(s):`);
    projects.forEach((project, index) => {
      console.log(`\n   Project ${index + 1}:`);
      console.log(`   - ID: ${project._id}`);
      console.log(`   - Name: ${project.name || project.projectName}`);
      console.log(`   - Location: ${project.location || 'N/A'}`);
      console.log(`   - Type: ${project.type || 'N/A'}`);
      console.log(`   - Sections: ${project.section ? project.section.length : 0}`);
    });

    // Step 3: Simulate API call
    console.log('\n' + '='.repeat(60));
    console.log('🧪 SIMULATING API CALL');
    console.log('='.repeat(60));
    console.log(`\nGET /api/project?clientId=${client._id}`);
    console.log(`Authorization: Bearer ${API_BEARER_TOKEN}`);
    console.log('\nExpected Response:');
    console.log(JSON.stringify({
      success: true,
      message: `Retrieved ${projects.length} project(s) successfully`,
      data: projects.map(p => ({
        _id: p._id,
        name: p.name || p.projectName,
        clientId: p.clientId,
        location: p.location,
        type: p.type,
        section: p.section
      }))
    }, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('✅ DEBUG COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log(`   Client ID: ${client._id}`);
    console.log(`   Client Email: ${client.email}`);
    console.log(`   Projects Found: ${projects.length}`);
    console.log('');
    
    if (projects.length > 0) {
      console.log('✅ Everything looks good! Projects should load in the app.');
      console.log('\n💡 If projects still don\'t load in the app:');
      console.log('   1. Check that login returns this clientId: ' + client._id);
      console.log('   2. Check frontend logs for the actual clientId being used');
      console.log('   3. Make sure API_BEARER_TOKEN matches in frontend and backend');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
debugProjectAPI();
