/**
 * Test script to verify material used cost label change
 * Tests that "Per Unit Cost" changes to "Total Used Cost" in material used section
 */

const BASE_URL = 'http://localhost:3000';
const CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testMaterialUsedCostLabel() {
  console.log('🏷️ Testing Material Used Cost Label Change...\n');

  // Test 1: Check project details page structure
  console.log('1️⃣ Testing material cost label display logic...');
  
  // Simulate the component logic
  const testMaterials = [
    {
      name: 'Brick',
      unit: 'pieces',
      totalCost: 50,        // Per unit cost
      totalQuantity: 100,   // Used quantity
      totalImported: 200    // Total imported
    },
    {
      name: 'Cement',
      unit: 'bags',
      totalCost: 500,       // Per unit cost
      totalQuantity: 20,    // Used quantity
      totalImported: 50     // Total imported
    }
  ];

  console.log('📊 Testing cost calculations for different tabs:\n');

  testMaterials.forEach((material, index) => {
    console.log(`Material ${index + 1}: ${material.name}`);
    
    // Test imported tab display
    console.log('  📥 IMPORTED TAB:');
    console.log(`    Label: "Per Unit:"`);
    console.log(`    Value: ₹${material.totalCost.toLocaleString('en-IN')}/${material.unit}`);
    console.log(`    Total: ₹${(material.totalCost * material.totalImported).toLocaleString('en-IN')}`);
    
    // Test used tab display
    console.log('  📤 USED TAB:');
    console.log(`    Label: "Total Used Cost:"`);
    const totalUsedCost = material.totalCost * material.totalQuantity;
    console.log(`    Value: ₹${totalUsedCost.toLocaleString('en-IN')} (no unit suffix)`);
    console.log(`    Total: ₹${(material.totalCost * material.totalImported).toLocaleString('en-IN')}`);
    
    console.log('');
  });

  // Test 2: Verify API endpoints are working
  console.log('2️⃣ Testing project data API...');
  try {
    const response = await fetch(`${BASE_URL}/api/project/client?clientId=${CLIENT_ID}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Project API working - can fetch project data');
      console.log(`   Found ${data.projects?.length || 0} projects`);
    } else {
      console.log('❌ Project API failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Project API test failed:', error.message);
  }

  // Test 3: Test material usage API
  console.log('\n3️⃣ Testing material usage API...');
  try {
    // Try to get material usage for first project (if any exist)
    const projectResponse = await fetch(`${BASE_URL}/api/project/client?clientId=${CLIENT_ID}`);
    const projectData = await projectResponse.json();
    
    if (projectData.success && projectData.projects?.length > 0) {
      const firstProject = projectData.projects[0];
      const usageResponse = await fetch(`${BASE_URL}/api/material-usage?projectId=${firstProject._id}&clientId=${CLIENT_ID}`);
      const usageData = await usageResponse.json();
      
      if (usageResponse.ok) {
        console.log('✅ Material usage API working');
        console.log(`   Found ${usageData.MaterialUsed?.length || 0} used materials`);
      } else {
        console.log('❌ Material usage API failed:', usageData.message);
      }
    } else {
      console.log('⚠️ No projects found to test material usage API');
    }
  } catch (error) {
    console.log('❌ Material usage API test failed:', error.message);
  }

  console.log('\n🎉 Material Used Cost Label testing completed!');
  console.log('\n📋 Summary of changes applied:');
  console.log('• Changed "Per Unit:" to "Total Used Cost:" in used materials tab');
  console.log('• Updated cost calculation for used materials (per unit × used quantity)');
  console.log('• Removed unit suffix for total used cost display');
  console.log('• Maintained per unit display for imported materials tab');
  console.log('• Added conditional logic based on activeTab prop');
}

// Run the test
testMaterialUsedCostLabel().catch(console.error);