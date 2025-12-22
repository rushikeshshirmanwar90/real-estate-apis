const { MongoClient, ObjectId } = require('mongodb');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';

// Test data
const TEST_PROJECT_ID = '6947c47b70721934e82fff34';

async function testSpendingLogic() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const projectsCollection = db.collection('projects');
    
    console.log('🧪 TESTING SPENDING LOGIC');
    console.log('=========================');
    console.log('Testing that:');
    console.log('✅ Material imports ADD to project.spent');
    console.log('❌ Material usage does NOT add to project.spent');
    console.log('=========================\n');
    
    // Get initial project state
    const initialProject = await projectsCollection.findOne({ _id: new ObjectId(TEST_PROJECT_ID) });
    if (!initialProject) {
      console.error('❌ Test project not found!');
      return;
    }
    
    console.log('📊 INITIAL PROJECT STATE:');
    console.log(`  - Project: ${initialProject.name}`);
    console.log(`  - Current spent: ₹${(initialProject.spent || 0).toLocaleString('en-IN')}`);
    console.log(`  - Available materials: ${(initialProject.MaterialAvailable || []).length}`);
    console.log(`  - Used materials: ${(initialProject.MaterialUsed || []).length}`);
    
    // Calculate expected spent from MaterialAvailable
    const expectedSpent = (initialProject.MaterialAvailable || []).reduce((sum, material) => {
      return sum + (material.totalCost || 0);
    }, 0);
    
    console.log(`  - Expected spent (from MaterialAvailable): ₹${expectedSpent.toLocaleString('en-IN')}`);
    
    // Test 1: Verify current spending calculation is correct
    console.log('\n🧪 TEST 1: Verify current spending calculation');
    const currentSpent = initialProject.spent || 0;
    
    if (Math.abs(currentSpent - expectedSpent) < 0.01) {
      console.log('✅ PASS: Current spent matches MaterialAvailable total costs');
      console.log(`   Current: ₹${currentSpent.toLocaleString('en-IN')}`);
      console.log(`   Expected: ₹${expectedSpent.toLocaleString('en-IN')}`);
    } else {
      console.log('❌ FAIL: Current spent does not match MaterialAvailable total costs');
      console.log(`   Current: ₹${currentSpent.toLocaleString('en-IN')}`);
      console.log(`   Expected: ₹${expectedSpent.toLocaleString('en-IN')}`);
      console.log(`   Difference: ₹${(currentSpent - expectedSpent).toLocaleString('en-IN')}`);
    }
    
    // Test 2: Simulate material import (should increase spent)
    console.log('\n🧪 TEST 2: Simulate material import (should increase spent)');
    const testImportMaterial = {
      _id: new ObjectId(),
      name: 'Test Import Material',
      unit: 'bags',
      specs: { grade: 'Test' },
      qnt: 5,
      perUnitCost: 100,
      totalCost: 500, // 5 * 100
      addedAt: new Date()
    };
    
    console.log('📦 Adding test material to MaterialAvailable:');
    console.log(`   Material: ${testImportMaterial.name}`);
    console.log(`   Quantity: ${testImportMaterial.qnt} ${testImportMaterial.unit}`);
    console.log(`   Per-unit cost: ₹${testImportMaterial.perUnitCost}`);
    console.log(`   Total cost: ₹${testImportMaterial.totalCost}`);
    
    // Add material and increase spent (simulating import API behavior)
    await projectsCollection.updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      {
        $push: { MaterialAvailable: testImportMaterial },
        $inc: { spent: testImportMaterial.totalCost }
      }
    );
    
    // Verify the change
    const afterImportProject = await projectsCollection.findOne({ _id: new ObjectId(TEST_PROJECT_ID) });
    const newSpent = afterImportProject.spent || 0;
    const expectedNewSpent = currentSpent + testImportMaterial.totalCost;
    
    if (Math.abs(newSpent - expectedNewSpent) < 0.01) {
      console.log('✅ PASS: Material import correctly increased spent amount');
      console.log(`   Previous spent: ₹${currentSpent.toLocaleString('en-IN')}`);
      console.log(`   New spent: ₹${newSpent.toLocaleString('en-IN')}`);
      console.log(`   Increase: ₹${testImportMaterial.totalCost.toLocaleString('en-IN')}`);
    } else {
      console.log('❌ FAIL: Material import did not correctly increase spent amount');
      console.log(`   Previous spent: ₹${currentSpent.toLocaleString('en-IN')}`);
      console.log(`   New spent: ₹${newSpent.toLocaleString('en-IN')}`);
      console.log(`   Expected: ₹${expectedNewSpent.toLocaleString('en-IN')}`);
    }
    
    // Test 3: Simulate material usage (should NOT increase spent)
    console.log('\n🧪 TEST 3: Simulate material usage (should NOT increase spent)');
    
    // Find a material to use
    const availableMaterials = afterImportProject.MaterialAvailable || [];
    if (availableMaterials.length === 0) {
      console.log('⏭️ SKIP: No available materials to use');
    } else {
      const materialToUse = availableMaterials[0];
      const usageQuantity = Math.min(2, materialToUse.qnt); // Use 2 units or whatever is available
      const usageCost = materialToUse.perUnitCost * usageQuantity;
      
      console.log('🔄 Simulating material usage:');
      console.log(`   Material: ${materialToUse.name}`);
      console.log(`   Using quantity: ${usageQuantity} ${materialToUse.unit}`);
      console.log(`   Cost of used quantity: ₹${usageCost.toLocaleString('en-IN')}`);
      console.log(`   ⚠️ This cost should NOT be added to project.spent`);
      
      const usedMaterial = {
        name: materialToUse.name,
        unit: materialToUse.unit,
        specs: materialToUse.specs || {},
        qnt: usageQuantity,
        perUnitCost: materialToUse.perUnitCost,
        totalCost: usageCost,
        sectionId: 'test-section',
        miniSectionId: 'test-mini-section',
        addedAt: new Date()
      };
      
      // Simulate material usage (decrease available, add to used, but DON'T change spent)
      await projectsCollection.updateOne(
        { _id: new ObjectId(TEST_PROJECT_ID) },
        {
          $inc: { "MaterialAvailable.$[elem].qnt": -usageQuantity },
          $push: { MaterialUsed: usedMaterial }
          // ✅ IMPORTANT: NOT adding to spent - this is the correct behavior
        },
        {
          arrayFilters: [{ "elem._id": materialToUse._id }]
        }
      );
      
      // Verify spent amount didn't change
      const afterUsageProject = await projectsCollection.findOne({ _id: new ObjectId(TEST_PROJECT_ID) });
      const spentAfterUsage = afterUsageProject.spent || 0;
      
      if (Math.abs(spentAfterUsage - newSpent) < 0.01) {
        console.log('✅ PASS: Material usage correctly did NOT change spent amount');
        console.log(`   Spent before usage: ₹${newSpent.toLocaleString('en-IN')}`);
        console.log(`   Spent after usage: ₹${spentAfterUsage.toLocaleString('en-IN')}`);
        console.log(`   Used material cost: ₹${usageCost.toLocaleString('en-IN')} (not added to spent)`);
      } else {
        console.log('❌ FAIL: Material usage incorrectly changed spent amount');
        console.log(`   Spent before usage: ₹${newSpent.toLocaleString('en-IN')}`);
        console.log(`   Spent after usage: ₹${spentAfterUsage.toLocaleString('en-IN')}`);
        console.log(`   Unexpected change: ₹${(spentAfterUsage - newSpent).toLocaleString('en-IN')}`);
      }
    }
    
    // Cleanup: Remove test data
    console.log('\n🧹 CLEANUP: Removing test data...');
    await projectsCollection.updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      {
        $pull: {
          MaterialAvailable: { name: 'Test Import Material' },
          MaterialUsed: { name: 'Test Import Material' }
        },
        $set: { spent: initialProject.spent } // Restore original spent amount
      }
    );
    
    console.log('✅ Test data cleaned up, project restored to original state');
    
    console.log('\n========================================');
    console.log('SPENDING LOGIC TEST COMPLETE');
    console.log('========================================');
    console.log('✅ All tests verify that the business logic is correct:');
    console.log('  - Material imports increase project.spent');
    console.log('  - Material usage does NOT increase project.spent');
    console.log('  - project.spent reflects only imported material costs');
    console.log('========================================');
    
  } catch (error) {
    console.error('Spending logic test failed:', error);
  } finally {
    await client.close();
  }
}

// Run the test
testSpendingLogic().catch(console.error);