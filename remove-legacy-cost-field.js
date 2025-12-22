const { MongoClient } = require('mongodb');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';

async function removeLegacyCostField() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('projects');
    
    console.log('🗑️ Removing legacy "cost" field from all materials...');
    
    // Remove cost field from MaterialAvailable arrays
    const availableResult = await projectsCollection.updateMany(
      { 'MaterialAvailable': { $exists: true } },
      { 
        $unset: { 
          'MaterialAvailable.$[].cost': '' 
        } 
      }
    );
    
    console.log(`✅ Updated MaterialAvailable in ${availableResult.modifiedCount} projects`);
    
    // Remove cost field from MaterialUsed arrays
    const usedResult = await projectsCollection.updateMany(
      { 'MaterialUsed': { $exists: true } },
      { 
        $unset: { 
          'MaterialUsed.$[].cost': '' 
        } 
      }
    );
    
    console.log(`✅ Updated MaterialUsed in ${usedResult.modifiedCount} projects`);
    
    // Also remove from MaterialActivity collection if it exists
    const materialActivityCollection = db.collection('materialactivities');
    
    const activityResult = await materialActivityCollection.updateMany(
      { 'materials': { $exists: true } },
      { 
        $unset: { 
          'materials.$[].cost': '' 
        } 
      }
    );
    
    console.log(`✅ Updated MaterialActivity in ${activityResult.modifiedCount} records`);
    
    console.log('\n========================================');
    console.log('LEGACY COST FIELD REMOVAL COMPLETE');
    console.log('========================================');
    console.log('The legacy "cost" field has been removed from all materials.');
    console.log('Only "perUnitCost" and "totalCost" fields remain.');
    console.log('========================================');
    
  } catch (error) {
    console.error('Legacy field removal failed:', error);
  } finally {
    await client.close();
  }
}

// Run the cleanup
removeLegacyCostField().catch(console.error);