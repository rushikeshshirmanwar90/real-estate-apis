const { MongoClient } = require('mongodb');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';

async function checkMaterialActivities() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('projects');
    const materialActivityCollection = db.collection('materialactivities');
    
    console.log('🔍 CHECKING MATERIAL ACTIVITIES AND PROJECTS');
    console.log('=============================================');
    
    // Get all projects
    const projects = await projectsCollection.find({}).toArray();
    console.log(`\n📁 PROJECTS (${projects.length}):`);
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name}`);
      console.log(`   ID: ${project._id}`);
      console.log(`   Client ID: ${project.clientId}`);
      console.log(`   Available Materials: ${project.MaterialAvailable?.length || 0}`);
      console.log(`   Used Materials: ${project.MaterialUsed?.length || 0}`);
      console.log('');
    });
    
    // Get all material activities
    const activities = await materialActivityCollection.find({}).toArray();
    console.log(`📋 MATERIAL ACTIVITIES (${activities.length}):`);
    activities.forEach((activity, index) => {
      console.log(`${index + 1}. Activity ID: ${activity._id}`);
      console.log(`   Project ID: ${activity.projectId}`);
      console.log(`   Client ID: ${activity.clientId}`);
      console.log(`   Activity Type: ${activity.activity}`);
      console.log(`   Materials Count: ${activity.materials?.length || 0}`);
      console.log(`   Date: ${activity.date}`);
      console.log(`   Message: ${activity.message || 'No message'}`);
      
      if (activity.materials && activity.materials.length > 0) {
        console.log('   Materials:');
        activity.materials.forEach((material, mIndex) => {
          console.log(`     ${mIndex + 1}. ${material.name} (${material.qnt} ${material.unit})`);
          console.log(`        Per Unit Cost: ${material.perUnitCost || 'N/A'}`);
          console.log(`        Total Cost: ${material.totalCost || 'N/A'}`);
          console.log(`        Legacy Cost: ${material.cost || 'N/A'}`);
        });
      }
      console.log('');
    });
    
    // Check if project IDs in activities match existing projects
    console.log('🔗 PROJECT ID MATCHING:');
    const projectIds = projects.map(p => p._id.toString());
    
    activities.forEach((activity, index) => {
      const activityProjectId = activity.projectId.toString();
      const matchingProject = projects.find(p => p._id.toString() === activityProjectId);
      
      if (matchingProject) {
        console.log(`✅ Activity ${index + 1} matches project: ${matchingProject.name}`);
      } else {
        console.log(`❌ Activity ${index + 1} has orphaned project ID: ${activityProjectId}`);
      }
    });
    
    // Suggest test data
    if (projects.length > 0) {
      const testProject = projects[0];
      console.log('\n💡 SUGGESTED TEST CONFIGURATION:');
      console.log(`TEST_PROJECT_ID = '${testProject._id}'`);
      console.log(`TEST_CLIENT_ID = '${testProject.clientId}'`);
      console.log(`PROJECT_NAME = '${testProject.name}'`);
      
      console.log('\n🧪 You can now test the material addition flow with these IDs');
    }
    
    console.log('\n========================================');
    console.log('MATERIAL ACTIVITIES CHECK COMPLETE');
    console.log('========================================');
    
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await client.close();
  }
}

// Run the check
checkMaterialActivities().catch(console.error);