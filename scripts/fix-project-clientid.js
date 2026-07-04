/**
 * Fix project clientId - Update from user ID to client ID
 * Run with: node scripts/fix-project-clientid.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

const clientSchema = new mongoose.Schema({
  email: String,
  name: String
});

const projectSchema = new mongoose.Schema({
  clientId: mongoose.Schema.Types.ObjectId,
  name: String,
  projectName: String
});

const loginUserSchema = new mongoose.Schema({
  email: String,
  userType: String
});

const Client = mongoose.model('Client', clientSchema);
const Project = mongoose.model('Project', projectSchema, 'projects');
const LoginUser = mongoose.model('LoginUser', loginUserSchema, 'loginusers');

async function fixProjectClientId() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const adminEmail = 'rushikeshshrimanwar@gmail.com';

    // Step 1: Get user ID
    console.log('🔍 Step 1: Finding admin user...');
    const user = await LoginUser.findOne({ email: adminEmail });
    if (!user) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }
    console.log(`✅ User ID: ${user._id}`);

    // Step 2: Get client ID
    console.log('\n🔍 Step 2: Finding Client record...');
    const client = await Client.findOne({ email: adminEmail });
    if (!client) {
      console.error('❌ Client record not found');
      console.log('\n💡 Run this first: node scripts/check-and-create-client.js');
      process.exit(1);
    }
    console.log(`✅ Client ID: ${client._id}`);

    // Step 3: Find projects with user ID
    console.log('\n🔍 Step 3: Finding projects with user ID as clientId...');
    const projectsWithUserId = await Project.find({ clientId: user._id });
    console.log(`Found ${projectsWithUserId.length} project(s) with user ID`);

    if (projectsWithUserId.length === 0) {
      console.log('\n✅ No projects need updating');
      
      // Check if projects already have correct clientId
      const projectsWithClientId = await Project.find({ clientId: client._id });
      console.log(`\n📊 Projects with correct client ID: ${projectsWithClientId.length}`);
      
      if (projectsWithClientId.length > 0) {
        console.log('✅ Projects already have the correct clientId!');
      } else {
        console.log('⚠️  No projects found for either user ID or client ID');
        console.log('💡 You may need to create a new project');
      }
      
      process.exit(0);
    }

    // Step 4: Update projects
    console.log('\n🔧 Step 4: Updating projects...');
    const result = await Project.updateMany(
      { clientId: user._id },
      { $set: { clientId: client._id } }
    );

    console.log(`✅ Updated ${result.modifiedCount} project(s)`);

    // Step 5: Verify
    console.log('\n✅ Step 5: Verifying...');
    const updatedProjects = await Project.find({ clientId: client._id });
    console.log(`Found ${updatedProjects.length} project(s) with correct client ID:`);
    updatedProjects.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name || p.projectName} (${p._id})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS!');
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log(`   User ID (old): ${user._id}`);
    console.log(`   Client ID (new): ${client._id}`);
    console.log(`   Projects updated: ${result.modifiedCount}`);
    console.log(`   Total projects for client: ${updatedProjects.length}`);
    console.log('\n✅ Projects should now load in the app!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart backend: npm run dev');
    console.log('   2. Restart frontend: npm start -- --clear');
    console.log('   3. Login and check AdminDashboard');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixProjectClientId();
