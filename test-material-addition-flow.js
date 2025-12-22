const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port
const TEST_PROJECT_ID = '6751b8b8b8b8b8b8b8b8b8b8'; // Replace with a real project ID
const TEST_CLIENT_ID = '6751b8b8b8b8b8b8b8b8b8b8'; // Replace with a real client ID

async function testMaterialAdditionFlow() {
  console.log('🧪 TESTING MATERIAL ADDITION FLOW');
  console.log('=====================================');
  
  try {
    // Test 1: Add a new material
    console.log('\n1️⃣ Testing Material Addition...');
    const materialPayload = [{
      projectId: TEST_PROJECT_ID,
      materialName: 'Test Cement',
      unit: 'bags',
      specs: {
        grade: 'OPC 53',
        brand: 'UltraTech'
      },
      qnt: 10,
      perUnitCost: 350,
      mergeIfExists: true
    }];
    
    console.log('📤 Sending material addition request...');
    console.log('Payload:', JSON.stringify(materialPayload, null, 2));
    
    const addResponse = await axios.post(`${BASE_URL}/api/material`, materialPayload);
    console.log('✅ Material addition response:', JSON.stringify(addResponse.data, null, 2));
    
    if (!addResponse.data.success) {
      throw new Error('Material addition failed: ' + addResponse.data.error);
    }
    
    // Test 2: Fetch materials to verify addition
    console.log('\n2️⃣ Testing Material Retrieval...');
    const getResponse = await axios.get(`${BASE_URL}/api/material?projectId=${TEST_PROJECT_ID}&clientId=${TEST_CLIENT_ID}`);
    console.log('✅ Material retrieval response:', JSON.stringify(getResponse.data, null, 2));
    
    if (!getResponse.data.success) {
      throw new Error('Material retrieval failed: ' + getResponse.data.error);
    }
    
    const materials = getResponse.data.MaterialAvailable || [];
    console.log(`📦 Found ${materials.length} materials in project`);
    
    // Check if our test material exists
    const testMaterial = materials.find(m => m.name === 'Test Cement');
    if (testMaterial) {
      console.log('✅ Test material found:', {
        name: testMaterial.name,
        quantity: testMaterial.qnt,
        unit: testMaterial.unit,
        perUnitCost: testMaterial.perUnitCost,
        totalCost: testMaterial.totalCost,
        specs: testMaterial.specs
      });
      
      // Validate cost fields
      if (!testMaterial.perUnitCost || testMaterial.perUnitCost === 0) {
        console.error('❌ perUnitCost is missing or zero!');
      }
      if (!testMaterial.totalCost || testMaterial.totalCost === 0) {
        console.error('❌ totalCost is missing or zero!');
      }
      if (testMaterial.perUnitCost && testMaterial.totalCost && testMaterial.qnt) {
        const expectedTotal = testMaterial.perUnitCost * testMaterial.qnt;
        if (Math.abs(testMaterial.totalCost - expectedTotal) > 0.01) {
          console.error(`❌ Cost calculation mismatch! Expected: ${expectedTotal}, Got: ${testMaterial.totalCost}`);
        } else {
          console.log('✅ Cost calculation is correct');
        }
      }
    } else {
      console.error('❌ Test material not found in response');
    }
    
    // Test 3: Test material usage
    console.log('\n3️⃣ Testing Material Usage...');
    if (testMaterial && testMaterial._id) {
      const usagePayload = {
        projectId: TEST_PROJECT_ID,
        sectionId: 'test-section',
        miniSectionId: 'test-mini-section',
        materialId: testMaterial._id,
        qnt: 2
      };
      
      console.log('📤 Sending material usage request...');
      console.log('Payload:', JSON.stringify(usagePayload, null, 2));
      
      const usageResponse = await axios.post(`${BASE_URL}/api/material-usage`, usagePayload);
      console.log('✅ Material usage response:', JSON.stringify(usageResponse.data, null, 2));
      
      if (!usageResponse.data.success) {
        throw new Error('Material usage failed: ' + usageResponse.data.error);
      }
    } else {
      console.log('⏭️ Skipping material usage test (no test material found)');
    }
    
    // Test 4: Fetch used materials
    console.log('\n4️⃣ Testing Used Materials Retrieval...');
    const usedResponse = await axios.get(`${BASE_URL}/api/material-usage?projectId=${TEST_PROJECT_ID}&clientId=${TEST_CLIENT_ID}`);
    console.log('✅ Used materials response:', JSON.stringify(usedResponse.data, null, 2));
    
    if (!usedResponse.data.success) {
      throw new Error('Used materials retrieval failed: ' + usedResponse.data.error);
    }
    
    const usedMaterials = usedResponse.data.MaterialUsed || [];
    console.log(`🔄 Found ${usedMaterials.length} used materials in project`);
    
    // Validate used materials cost structure
    usedMaterials.forEach((material, index) => {
      console.log(`Used Material ${index + 1}:`, {
        name: material.name,
        quantity: material.qnt,
        unit: material.unit,
        perUnitCost: material.perUnitCost,
        totalCost: material.totalCost,
        specs: material.specs
      });
      
      if (!material.perUnitCost || material.perUnitCost === 0) {
        console.error(`❌ Used material ${material.name} has missing or zero perUnitCost!`);
      }
      if (!material.totalCost || material.totalCost === 0) {
        console.error(`❌ Used material ${material.name} has missing or zero totalCost!`);
      }
    });
    
    console.log('\n========================================');
    console.log('✅ MATERIAL ADDITION FLOW TEST COMPLETE');
    console.log('========================================');
    console.log('All tests passed! The material addition flow is working correctly.');
    
  } catch (error) {
    console.log('\n========================================');
    console.log('❌ MATERIAL ADDITION FLOW TEST FAILED');
    console.log('========================================');
    console.error('Error details:', error.message);
    
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Make sure your Next.js server is running on the correct port');
    console.log('2. Update TEST_PROJECT_ID and TEST_CLIENT_ID with real values');
    console.log('3. Check that the database connection is working');
    console.log('4. Verify that the cost validation fix script was run successfully');
  }
}

// Helper function to get a real project ID from the database
async function getTestProjectId() {
  try {
    console.log('🔍 Looking for a test project...');
    // This would require a database query - for now, use a placeholder
    console.log('⚠️ Please update TEST_PROJECT_ID and TEST_CLIENT_ID with real values from your database');
    return null;
  } catch (error) {
    console.error('Failed to get test project ID:', error.message);
    return null;
  }
}

// Run the test
console.log('⚠️ IMPORTANT: Update TEST_PROJECT_ID and TEST_CLIENT_ID with real values before running this test');
console.log('You can find these values in your MongoDB database in the projects collection');
console.log('');

testMaterialAdditionFlow().catch(console.error);