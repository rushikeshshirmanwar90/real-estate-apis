const { MongoClient, ObjectId } = require('mongodb');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';

async function fixProjectSpentCalculation() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('projects');
    
    console.log('🔧 FIXING PROJECT SPENT CALCULATION');
    console.log('=====================================');
    console.log('Business Logic: project.spent should ONLY include cost of imported materials (MaterialAvailable)');
    console.log('Material usage should NOT add to spent amount - it\'s just using existing inventory');
    console.log('=====================================\n');
    
    // Find all projects
    const projects = await projectsCollection.find({}).toArray();
    console.log(`Found ${projects.length} total projects`);
    
    let fixedProjects = 0;
    let projectsWithCorrectSpent = 0;
    let projectsWithIncorrectSpent = 0;
    
    for (const project of projects) {
      // Calculate correct spent amount from MaterialAvailable only
      const materialAvailable = project.MaterialAvailable || [];
      const correctSpent = materialAvailable.reduce((sum, material) => {
        const totalCost = material.totalCost || 0;
        return sum + totalCost;
      }, 0);
      
      const currentSpent = project.spent || 0;
      
      console.log(`\n📁 Project: ${project.name}`);
      console.log(`   ID: ${project._id}`);
      console.log(`   Current spent: ₹${currentSpent.toLocaleString('en-IN')}`);
      console.log(`   Correct spent (from MaterialAvailable): ₹${correctSpent.toLocaleString('en-IN')}`);
      console.log(`   Available materials: ${materialAvailable.length}`);
      console.log(`   Used materials: ${(project.MaterialUsed || []).length}`);
      
      // Check if correction is needed
      if (Math.abs(currentSpent - correctSpent) > 0.01) {
        console.log(`   ❌ INCORRECT - Difference: ₹${(currentSpent - correctSpent).toLocaleString('en-IN')}`);
        projectsWithIncorrectSpent++;
        
        // Show breakdown of MaterialAvailable costs
        if (materialAvailable.length > 0) {
          console.log(`   📦 MaterialAvailable breakdown:`);
          materialAvailable.forEach((material, index) => {
            const totalCost = material.totalCost || 0;
            console.log(`     ${index + 1}. ${material.name}: ${material.qnt} ${material.unit} @ ₹${material.perUnitCost || 0} = ₹${totalCost.toLocaleString('en-IN')}`);
          });
        }
        
        // Update the project with correct spent amount
        try {
          await projectsCollection.updateOne(
            { _id: project._id },
            { $set: { spent: correctSpent } }
          );
          
          console.log(`   ✅ FIXED - Updated spent to ₹${correctSpent.toLocaleString('en-IN')}`);
          fixedProjects++;
        } catch (updateError) {
          console.error(`   ❌ FAILED to update project:`, updateError.message);
        }
      } else {
        console.log(`   ✅ CORRECT - No changes needed`);
        projectsWithCorrectSpent++;
      }
    }
    
    console.log('\n========================================');
    console.log('PROJECT SPENT CALCULATION FIX COMPLETE');
    console.log('========================================');
    console.log(`📊 SUMMARY:`);
    console.log(`  - Total projects: ${projects.length}`);
    console.log(`  - Projects with correct spent: ${projectsWithCorrectSpent}`);
    console.log(`  - Projects with incorrect spent: ${projectsWithIncorrectSpent}`);
    console.log(`  - Projects fixed: ${fixedProjects}`);
    console.log('========================================');
    
    if (fixedProjects > 0) {
      console.log(`✅ Successfully fixed ${fixedProjects} projects`);
      console.log(`💡 The project.spent field now correctly reflects only imported material costs`);
      console.log(`💡 Material usage costs are no longer included in project spending`);
    } else {
      console.log(`✅ All projects already have correct spent calculations`);
    }
    
    // Verification: Check that all projects now have correct spent amounts
    console.log('\n🔍 VERIFICATION - Checking all projects have correct spent amounts...');
    const verificationProjects = await projectsCollection.find({}).toArray();
    let verificationErrors = 0;
    
    for (const project of verificationProjects) {
      const materialAvailable = project.MaterialAvailable || [];
      const correctSpent = materialAvailable.reduce((sum, material) => {
        return sum + (material.totalCost || 0);
      }, 0);
      
      const currentSpent = project.spent || 0;
      
      if (Math.abs(currentSpent - correctSpent) > 0.01) {
        console.error(`❌ VERIFICATION FAILED for project ${project.name}: spent=${currentSpent}, should be=${correctSpent}`);
        verificationErrors++;
      }
    }
    
    if (verificationErrors === 0) {
      console.log(`✅ VERIFICATION PASSED - All ${verificationProjects.length} projects have correct spent amounts`);
    } else {
      console.error(`❌ VERIFICATION FAILED - ${verificationErrors} projects still have incorrect spent amounts`);
    }
    
  } catch (error) {
    console.error('Project spent calculation fix failed:', error);
  } finally {
    await client.close();
  }
}

// Run the fix
fixProjectSpentCalculation().catch(console.error);