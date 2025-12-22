const { MongoClient } = require('mongodb');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';

async function fixZeroCostFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('projects');
    
    // Find all projects with materials
    const projects = await projectsCollection.find({
      $or: [
        { 'MaterialAvailable': { $exists: true, $ne: [] } },
        { 'MaterialUsed': { $exists: true, $ne: [] } }
      ]
    }).toArray();
    
    console.log(`Found ${projects.length} projects with materials`);
    
    let updatedProjects = 0;
    let updatedMaterials = 0;
    
    for (const project of projects) {
      let projectUpdated = false;
      const updates = {};
      
      // Fix MaterialAvailable
      if (project.MaterialAvailable && project.MaterialAvailable.length > 0) {
        const fixedAvailable = project.MaterialAvailable.map(material => {
          // Only fix materials that are missing the new cost fields
          if ((!material.perUnitCost || material.perUnitCost === 0) && 
              (!material.totalCost || material.totalCost === 0)) {
            
            console.log(`Fixing MaterialAvailable: ${material.name}`);
            console.log(`  - Quantity: ${material.qnt}`);
            
            // If we have no cost information, we can't fix it
            if (!material.cost && !material.perUnitCost && !material.totalCost) {
              console.log(`  - ⚠️ No cost information available, skipping`);
              return material;
            }
            
            // Use legacy cost field if available, otherwise try to calculate
            const perUnitCost = material.cost || (material.totalCost / material.qnt) || 0;
            const totalCost = material.totalCost || (material.cost * material.qnt) || 0;
            
            console.log(`  - Setting perUnitCost: ${perUnitCost}`);
            console.log(`  - Setting totalCost: ${totalCost}`);
            
            updatedMaterials++;
            projectUpdated = true;
            
            return {
              ...material,
              perUnitCost: perUnitCost,
              totalCost: totalCost
            };
          }
          return material;
        });
        
        if (projectUpdated) {
          updates.MaterialAvailable = fixedAvailable;
        }
      }
      
      // Fix MaterialUsed
      if (project.MaterialUsed && project.MaterialUsed.length > 0) {
        const fixedUsed = project.MaterialUsed.map(material => {
          // Only fix materials that are missing the new cost fields
          if ((!material.perUnitCost || material.perUnitCost === 0) && 
              (!material.totalCost || material.totalCost === 0)) {
            
            console.log(`Fixing MaterialUsed: ${material.name}`);
            console.log(`  - Quantity: ${material.qnt}`);
            
            // If we have no cost information, we can't fix it
            if (!material.cost && !material.perUnitCost && !material.totalCost) {
              console.log(`  - ⚠️ No cost information available, skipping`);
              return material;
            }
            
            // Use legacy cost field if available, otherwise try to calculate
            const perUnitCost = material.cost || (material.totalCost / material.qnt) || 0;
            const totalCost = material.totalCost || (material.cost * material.qnt) || 0;
            
            console.log(`  - Setting perUnitCost: ${perUnitCost}`);
            console.log(`  - Setting totalCost: ${totalCost}`);
            
            updatedMaterials++;
            projectUpdated = true;
            
            return {
              ...material,
              perUnitCost: perUnitCost,
              totalCost: totalCost
            };
          }
          return material;
        });
        
        if (projectUpdated) {
          updates.MaterialUsed = fixedUsed;
        }
      }
      
      // Update the project if any materials were fixed
      if (projectUpdated) {
        await projectsCollection.updateOne(
          { _id: project._id },
          { $set: updates }
        );
        updatedProjects++;
        console.log(`✅ Updated project: ${project.name}`);
      }
    }
    
    console.log('\n========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`Projects updated: ${updatedProjects}`);
    console.log(`Materials fixed: ${updatedMaterials}`);
    console.log('========================================');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run the migration
fixZeroCostFields().catch(console.error);