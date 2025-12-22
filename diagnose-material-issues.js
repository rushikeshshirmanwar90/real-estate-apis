const { MongoClient } = require('mongodb');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';

async function diagnoseMaterialIssues() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('projects');
    
    console.log('🔍 DIAGNOSING MATERIAL ISSUES');
    console.log('=====================================');
    
    // Get all projects
    const projects = await projectsCollection.find({}).toArray();
    console.log(`Found ${projects.length} total projects`);
    
    // Check projects with materials
    const projectsWithMaterials = await projectsCollection.find({
      $or: [
        { 'MaterialAvailable': { $exists: true, $ne: [] } },
        { 'MaterialUsed': { $exists: true, $ne: [] } }
      ]
    }).toArray();
    
    console.log(`Found ${projectsWithMaterials.length} projects with materials`);
    
    let totalAvailableMaterials = 0;
    let totalUsedMaterials = 0;
    let materialsWithIssues = 0;
    let issueDetails = [];
    
    for (const project of projectsWithMaterials) {
      console.log(`\n📁 Project: ${project.name} (ID: ${project._id})`);
      
      // Check MaterialAvailable
      if (project.MaterialAvailable && Array.isArray(project.MaterialAvailable)) {
        totalAvailableMaterials += project.MaterialAvailable.length;
        console.log(`  📦 Available materials: ${project.MaterialAvailable.length}`);
        
        project.MaterialAvailable.forEach((material, index) => {
          const issues = [];
          
          // Check for missing or zero cost fields
          if (!material.perUnitCost || material.perUnitCost === 0) {
            issues.push('perUnitCost is missing or zero');
          }
          if (!material.totalCost || material.totalCost === 0) {
            issues.push('totalCost is missing or zero');
          }
          if (material.cost !== undefined) {
            issues.push('legacy cost field still exists');
          }
          
          // Check cost calculation consistency
          if (material.perUnitCost && material.totalCost && material.qnt) {
            const expectedTotal = material.perUnitCost * material.qnt;
            if (Math.abs(material.totalCost - expectedTotal) > 0.01) {
              issues.push(`cost calculation mismatch (expected: ${expectedTotal}, got: ${material.totalCost})`);
            }
          }
          
          if (issues.length > 0) {
            materialsWithIssues++;
            issueDetails.push({
              project: project.name,
              projectId: project._id,
              materialType: 'Available',
              materialName: material.name,
              materialIndex: index,
              issues: issues
            });
            console.log(`    ❌ ${material.name}: ${issues.join(', ')}`);
          } else {
            console.log(`    ✅ ${material.name}: OK`);
          }
        });
      }
      
      // Check MaterialUsed
      if (project.MaterialUsed && Array.isArray(project.MaterialUsed)) {
        totalUsedMaterials += project.MaterialUsed.length;
        console.log(`  🔄 Used materials: ${project.MaterialUsed.length}`);
        
        project.MaterialUsed.forEach((material, index) => {
          const issues = [];
          
          // Check for missing or zero cost fields
          if (!material.perUnitCost || material.perUnitCost === 0) {
            issues.push('perUnitCost is missing or zero');
          }
          if (!material.totalCost || material.totalCost === 0) {
            issues.push('totalCost is missing or zero');
          }
          if (material.cost !== undefined) {
            issues.push('legacy cost field still exists');
          }
          
          // Check cost calculation consistency
          if (material.perUnitCost && material.totalCost && material.qnt) {
            const expectedTotal = material.perUnitCost * material.qnt;
            if (Math.abs(material.totalCost - expectedTotal) > 0.01) {
              issues.push(`cost calculation mismatch (expected: ${expectedTotal}, got: ${material.totalCost})`);
            }
          }
          
          if (issues.length > 0) {
            materialsWithIssues++;
            issueDetails.push({
              project: project.name,
              projectId: project._id,
              materialType: 'Used',
              materialName: material.name,
              materialIndex: index,
              issues: issues
            });
            console.log(`    ❌ ${material.name}: ${issues.join(', ')}`);
          } else {
            console.log(`    ✅ ${material.name}: OK`);
          }
        });
      }
    }
    
    // Check MaterialActivity collection
    const materialActivityCollection = db.collection('materialactivities');
    const activities = await materialActivityCollection.find({}).toArray();
    console.log(`\n📋 Found ${activities.length} material activities`);
    
    let activityMaterialsWithIssues = 0;
    
    activities.forEach((activity, activityIndex) => {
      if (activity.materials && Array.isArray(activity.materials)) {
        activity.materials.forEach((material, materialIndex) => {
          const issues = [];
          
          if (!material.perUnitCost || material.perUnitCost === 0) {
            issues.push('perUnitCost is missing or zero');
          }
          if (!material.totalCost || material.totalCost === 0) {
            issues.push('totalCost is missing or zero');
          }
          if (material.cost !== undefined) {
            issues.push('legacy cost field still exists');
          }
          
          if (issues.length > 0) {
            activityMaterialsWithIssues++;
            console.log(`  ❌ Activity ${activityIndex + 1}, Material ${materialIndex + 1} (${material.name}): ${issues.join(', ')}`);
          }
        });
      }
    });
    
    console.log('\n========================================');
    console.log('DIAGNOSIS SUMMARY');
    console.log('========================================');
    console.log(`📊 Total projects: ${projects.length}`);
    console.log(`📊 Projects with materials: ${projectsWithMaterials.length}`);
    console.log(`📦 Total available materials: ${totalAvailableMaterials}`);
    console.log(`🔄 Total used materials: ${totalUsedMaterials}`);
    console.log(`❌ Materials with issues: ${materialsWithIssues}`);
    console.log(`📋 Material activities: ${activities.length}`);
    console.log(`❌ Activity materials with issues: ${activityMaterialsWithIssues}`);
    
    if (materialsWithIssues > 0) {
      console.log('\n🔧 DETAILED ISSUE BREAKDOWN:');
      issueDetails.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.project} - ${issue.materialType} - ${issue.materialName}:`);
        issue.issues.forEach(i => console.log(`   • ${i}`));
      });
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('1. Run the fix-material-cost-validation.js script again');
      console.log('2. Check if any new materials were added after the fix');
      console.log('3. Verify that the frontend is sending correct cost data');
      console.log('4. Check API validation logic');
    } else {
      console.log('\n✅ All materials have valid cost structure!');
      console.log('The material addition flow should work properly.');
    }
    
    // Sample a few projects for detailed inspection
    if (projectsWithMaterials.length > 0) {
      console.log('\n🔍 SAMPLE PROJECT DETAILS:');
      const sampleProject = projectsWithMaterials[0];
      console.log(`Project: ${sampleProject.name}`);
      console.log(`ID: ${sampleProject._id}`);
      console.log(`Client ID: ${sampleProject.clientId}`);
      
      if (sampleProject.MaterialAvailable && sampleProject.MaterialAvailable.length > 0) {
        console.log('Sample Available Material:');
        console.log(JSON.stringify(sampleProject.MaterialAvailable[0], null, 2));
      }
      
      if (sampleProject.MaterialUsed && sampleProject.MaterialUsed.length > 0) {
        console.log('Sample Used Material:');
        console.log(JSON.stringify(sampleProject.MaterialUsed[0], null, 2));
      }
      
      console.log('\n💡 You can use these IDs for testing:');
      console.log(`TEST_PROJECT_ID = '${sampleProject._id}'`);
      console.log(`TEST_CLIENT_ID = '${sampleProject.clientId}'`);
    }
    
  } catch (error) {
    console.error('Diagnosis failed:', error);
  } finally {
    await client.close();
  }
}

// Run the diagnosis
diagnoseMaterialIssues().catch(console.error);