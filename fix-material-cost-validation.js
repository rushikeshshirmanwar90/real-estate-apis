const { MongoClient } = require('mongodb');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';

async function fixMaterialCostValidation() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('projects');
    
    console.log('🔧 Fixing material cost validation issues...');
    
    // Find all projects with materials
    const projects = await projectsCollection.find({
      $or: [
        { 'MaterialAvailable': { $exists: true, $ne: [] } },
        { 'MaterialUsed': { $exists: true, $ne: [] } }
      ]
    }).toArray();
    
    console.log(`Found ${projects.length} projects with materials`);
    
    let fixedProjects = 0;
    let fixedAvailableMaterials = 0;
    let fixedUsedMaterials = 0;
    
    for (const project of projects) {
      let projectUpdated = false;
      
      // Fix MaterialAvailable
      if (project.MaterialAvailable && Array.isArray(project.MaterialAvailable)) {
        for (let i = 0; i < project.MaterialAvailable.length; i++) {
          const material = project.MaterialAvailable[i];
          let materialUpdated = false;
          
          // Check if perUnitCost is missing or zero
          if (!material.perUnitCost || material.perUnitCost === 0) {
            // Try to calculate from legacy cost field or set default
            if (material.cost && material.cost > 0) {
              material.perUnitCost = material.cost;
              materialUpdated = true;
              console.log(`  📦 Fixed perUnitCost for ${material.name}: ${material.cost}`);
            } else {
              // Set a default value of 1 to prevent validation errors
              material.perUnitCost = 1;
              materialUpdated = true;
              console.log(`  📦 Set default perUnitCost for ${material.name}: 1`);
            }
          }
          
          // Check if totalCost is missing or zero
          if (!material.totalCost || material.totalCost === 0) {
            // Calculate totalCost from perUnitCost and quantity
            const quantity = material.qnt || 1;
            const perUnitCost = material.perUnitCost || 1;
            material.totalCost = perUnitCost * quantity;
            materialUpdated = true;
            console.log(`  📦 Calculated totalCost for ${material.name}: ${material.totalCost} (${perUnitCost} × ${quantity})`);
          }
          
          // Remove legacy cost field if it exists
          if (material.cost !== undefined) {
            delete material.cost;
            materialUpdated = true;
            console.log(`  📦 Removed legacy cost field from ${material.name}`);
          }
          
          if (materialUpdated) {
            fixedAvailableMaterials++;
            projectUpdated = true;
          }
        }
      }
      
      // Fix MaterialUsed
      if (project.MaterialUsed && Array.isArray(project.MaterialUsed)) {
        for (let i = 0; i < project.MaterialUsed.length; i++) {
          const material = project.MaterialUsed[i];
          let materialUpdated = false;
          
          // Check if perUnitCost is missing or zero
          if (!material.perUnitCost || material.perUnitCost === 0) {
            // Try to calculate from legacy cost field or set default
            if (material.cost && material.cost > 0) {
              material.perUnitCost = material.cost;
              materialUpdated = true;
              console.log(`  🔄 Fixed perUnitCost for used ${material.name}: ${material.cost}`);
            } else {
              // Set a default value of 1 to prevent validation errors
              material.perUnitCost = 1;
              materialUpdated = true;
              console.log(`  🔄 Set default perUnitCost for used ${material.name}: 1`);
            }
          }
          
          // Check if totalCost is missing or zero
          if (!material.totalCost || material.totalCost === 0) {
            // Calculate totalCost from perUnitCost and quantity
            const quantity = material.qnt || 1;
            const perUnitCost = material.perUnitCost || 1;
            material.totalCost = perUnitCost * quantity;
            materialUpdated = true;
            console.log(`  🔄 Calculated totalCost for used ${material.name}: ${material.totalCost} (${perUnitCost} × ${quantity})`);
          }
          
          // Remove legacy cost field if it exists
          if (material.cost !== undefined) {
            delete material.cost;
            materialUpdated = true;
            console.log(`  🔄 Removed legacy cost field from used ${material.name}`);
          }
          
          if (materialUpdated) {
            fixedUsedMaterials++;
            projectUpdated = true;
          }
        }
      }
      
      // Update the project if any materials were fixed
      if (projectUpdated) {
        await projectsCollection.updateOne(
          { _id: project._id },
          { 
            $set: { 
              MaterialAvailable: project.MaterialAvailable || [],
              MaterialUsed: project.MaterialUsed || []
            }
          }
        );
        fixedProjects++;
        console.log(`✅ Updated project: ${project.name}`);
      }
    }
    
    // Also fix MaterialActivity collection
    const materialActivityCollection = db.collection('materialactivities');
    const activities = await materialActivityCollection.find({
      'materials': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`\nFound ${activities.length} material activities to check`);
    
    let fixedActivities = 0;
    let fixedActivityMaterials = 0;
    
    for (const activity of activities) {
      let activityUpdated = false;
      
      if (activity.materials && Array.isArray(activity.materials)) {
        for (let i = 0; i < activity.materials.length; i++) {
          const material = activity.materials[i];
          let materialUpdated = false;
          
          // Check if perUnitCost is missing or zero
          if (!material.perUnitCost || material.perUnitCost === 0) {
            if (material.cost && material.cost > 0) {
              material.perUnitCost = material.cost;
              materialUpdated = true;
            } else {
              material.perUnitCost = 1;
              materialUpdated = true;
            }
          }
          
          // Check if totalCost is missing or zero
          if (!material.totalCost || material.totalCost === 0) {
            const quantity = material.qnt || 1;
            const perUnitCost = material.perUnitCost || 1;
            material.totalCost = perUnitCost * quantity;
            materialUpdated = true;
          }
          
          // Remove legacy cost field
          if (material.cost !== undefined) {
            delete material.cost;
            materialUpdated = true;
          }
          
          if (materialUpdated) {
            fixedActivityMaterials++;
            activityUpdated = true;
          }
        }
      }
      
      if (activityUpdated) {
        await materialActivityCollection.updateOne(
          { _id: activity._id },
          { $set: { materials: activity.materials } }
        );
        fixedActivities++;
      }
    }
    
    console.log('\n========================================');
    console.log('MATERIAL COST VALIDATION FIX COMPLETE');
    console.log('========================================');
    console.log(`✅ Fixed ${fixedProjects} projects`);
    console.log(`✅ Fixed ${fixedAvailableMaterials} available materials`);
    console.log(`✅ Fixed ${fixedUsedMaterials} used materials`);
    console.log(`✅ Fixed ${fixedActivities} material activities`);
    console.log(`✅ Fixed ${fixedActivityMaterials} activity materials`);
    console.log('========================================');
    console.log('All materials now have valid perUnitCost and totalCost values.');
    console.log('The material addition flow should work properly now.');
    console.log('========================================');
    
  } catch (error) {
    console.error('Material cost validation fix failed:', error);
  } finally {
    await client.close();
  }
}

// Run the fix
fixMaterialCostValidation().catch(console.error);