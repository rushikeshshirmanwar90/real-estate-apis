/**
 * Script to check if Client exists and create one if needed
 * Run with: node scripts/check-and-create-client.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Client Schema (simplified)
const clientSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  company: String,
  phone: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// LoginUser Schema (simplified)
const loginUserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: String,
  userType: String,
  fullName: String
});

// Project Schema (simplified)
const projectSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: String,
  projectName: String,
  location: String,
  type: String
});

const Client = mongoose.model('Client', clientSchema);
const LoginUser = mongoose.model('LoginUser', loginUserSchema, 'loginusers');
const Project = mongoose.model('Project', projectSchema, 'projects');

async function checkAndCreateClient() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find the admin user
    const adminEmail = 'rushikeshshrimanwar@gmail.com';
    console.log(`🔍 Looking for admin user: ${adminEmail}`);
    
    const adminUser = await LoginUser.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.error(`❌ Admin user not found: ${adminEmail}`);
      console.log('\n💡 Please create an admin user first in the LoginUser collection');
      process.exit(1);
    }
    
    console.log('✅ Admin user found:');
    console.log('   ID:', adminUser._id.toString());
    console.log('   Email:', adminUser.email);
    console.log('   Type:', adminUser.userType);
    console.log('   Name:', adminUser.fullName || 'N/A');
    console.log('');

    // Step 2: Check if Client exists
    console.log('🔍 Checking if Client record exists...');
    let client = await Client.findOne({ email: adminEmail });
    
    if (client) {
      console.log('✅ Client record already exists:');
      console.log('   ID:', client._id.toString());
      console.log('   Email:', client.email);
      console.log('   Name:', client.name);
      console.log('   Company:', client.company || 'N/A');
      console.log('');
    } else {
      console.log('❌ No Client record found');
      console.log('');
      console.log('📝 Creating Client record...');
      
      client = new Client({
        email: adminEmail,
        name: adminUser.fullName || 'Rushikesh Shrimanwar',
        company: 'Real Estate Company',
        phone: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await client.save();
      
      console.log('✅ Client record created:');
      console.log('   ID:', client._id.toString());
      console.log('   Email:', client.email);
      console.log('   Name:', client.name);
      console.log('');
    }

    // Step 3: Check for projects
    console.log('🔍 Checking for projects...');
    const projectCount = await Project.countDocuments({ clientId: client._id });
    
    if (projectCount > 0) {
      console.log(`✅ Found ${projectCount} project(s) for this client`);
      
      const projects = await Project.find({ clientId: client._id }).limit(5);
      console.log('\n📋 Sample projects:');
      projects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name || project.projectName || 'Unnamed'} (${project._id})`);
      });
    } else {
      console.log('⚠️  No projects found for this client');
      console.log('');
      console.log('💡 Creating a test project...');
      
      const testProject = new Project({
        clientId: client._id,
        name: 'Test Project',
        projectName: 'Test Project',
        location: 'Test Location',
        type: 'residential',
        section: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await testProject.save();
      
      console.log('✅ Test project created:');
      console.log('   ID:', testProject._id.toString());
      console.log('   Name:', testProject.name);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📝 Summary:');
    console.log(`   Client ID: ${client._id.toString()}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Projects: ${projectCount > 0 ? projectCount : 1} (including test project)`);
    console.log('');
    console.log('✅ You can now login and see projects in the app!');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
checkAndCreateClient();
