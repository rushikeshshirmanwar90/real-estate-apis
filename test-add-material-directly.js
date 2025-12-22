const { MongoClient, ObjectId } = require('mongodb');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';

// Test data
const TEST_PROJECT_ID = '6947c47b70721934e82fff34';
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testAddMaterialDirectly() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('projects');
    
    console.log('🧪 TESTING DIRECT MATERIAL ADDITION');
    console.log('===================================');
    
    // First, check the current state of the project
    const project = await projectsCollection.findOne({ _id: new ObjectId(TEST_PROJECT_ID) });
    if (!project) {
      console.error('❌ Project not found!');
      return;
    }
    
    console.log(`📁 Project: ${project.name}`);
    console.log(`📦 Current available materials: ${project.MaterialAvailable?.length || 0}`);
    console.log(`🔄 Current used materials: ${project.MaterialUsed?.length || 0}`);
    
    // Add a test material directly to the database
    const testMaterial = {
      _id: new ObjectId(),
      name: 'Test Direct Cement',
      unit: 'bags',
      specs: {
        grade: 'OPC 53',
        brand: 'Direct Test'
      },
      qnt: 5,
      perUnitCost: 400,
      totalCost: 2000, // 400 * 5
      addedAt: new Date()
    };
    
    console.log('\n📤 Adding test material directly to database...');
    console.log('Material:', JSON.stringify(testMaterial, null, 2));
    
    const updateResult = await projectsCollection.updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      {
        $push: {
          MaterialAvailable: testMaterial
        },
        $inc: {
          spent: testMaterial.totalCost
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Material added successfully to database');
      
      // Verify the addition
      const updatedProject = await projectsCollection.findOne({ _id: new ObjectId(TEST_PROJECT_ID) });
      console.log(`📦 Updated available materials: ${updatedProject.MaterialAvailable?.length || 0}`);
      console.log(`💰 Updated spent amount: ${updatedProject.spent || 0}`);
      
      // Show the added material
      const addedMaterial = updatedProject.MaterialAvailable?.find(m => m.name === 'Test Direct Cement');
      if (addedMaterial) {
        console.log('✅ Added material found:', {
          name: addedMaterial.name,
          quantity: addedMaterial.qnt,
          unit: addedMaterial.unit,
          perUnitCost: addedMaterial.perUnitCost,
          totalCost: addedMaterial.totalCost,
          specs: addedMaterial.specs
        });
      }
      
    } else {
      console.error('❌ Failed to add material to database');
    }
    
    console.log('\n========================================');
    console.log('DIRECT MATERIAL ADDITION TEST COMPLETE');
    console.log('========================================');
    
    console.log('\n💡 Next steps:');
    console.log('1. Check if the material appears in the frontend');
    console.log('2. Try adding a material through the frontend form');
    console.log('3. Compare the API request with this direct addition');
    
  } catch (error) {
    console.error('Direct material addition test failed:', error);
  } finally {
    await client.close();
  }
}

// Run the test
testAddMaterialDirectly().catch(console.error);