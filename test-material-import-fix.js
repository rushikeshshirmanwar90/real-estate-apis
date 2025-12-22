const axios = require('axios');

// Test material import with new cost structure
async function testMaterialImport() {
  console.log('🧪 TESTING MATERIAL IMPORT WITH NEW COST STRUCTURE');
  console.log('==================================================');

  const domain = 'http://localhost:3000'; // Adjust if needed
  
  // Test data - replace with actual project and client IDs
  const testData = {
    projectId: '6751234567890abcdef12345', // Replace with actual project ID
    clientId: '6751234567890abcdef12346',  // Replace with actual client ID
    materials: [
      {
        projectId: '6751234567890abcdef12345',
        materialName: 'Test Cement',
        unit: 'bags',
        specs: { grade: 'OPC 43', brand: 'UltraTech' },
        qnt: 10,
        perUnitCost: 350, // ✅ Using perUnitCost instead of cost
        mergeIfExists: true
      },
      {
        projectId: '6751234567890abcdef12345',
        materialName: 'Test Steel Rod',
        unit: 'kg',
        specs: { diameter: '12mm', grade: 'Fe500' },
        qnt: 100,
        perUnitCost: 65, // ✅ Using perUnitCost instead of cost
        mergeIfExists: true
      }
    ]
  };

  try {
    console.log('\n📤 SENDING MATERIAL IMPORT REQUEST...');
    console.log('Request payload:');
    console.log(JSON.stringify(testData.materials, null, 2));

    const response = await axios.post(`${domain}/api/material`, testData.materials, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('\n✅ RESPONSE RECEIVED:');
    console.log('Status:', response.status);
    console.log('Response data:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n🎉 MATERIAL IMPORT TEST PASSED!');
      
      // Check if materials have correct cost structure
      const results = response.data.results || [];
      let allHaveCorrectCosts = true;
      
      results.forEach((result, index) => {
        if (result.success && result.material) {
          const material = result.material;
          console.log(`\n📦 Material ${index + 1}: ${material.name}`);
          console.log(`  - Per-unit cost: ₹${material.perUnitCost}`);
          console.log(`  - Total cost: ₹${material.totalCost}`);
          console.log(`  - Quantity: ${material.qnt} ${material.unit}`);
          
          if (!material.perUnitCost || !material.totalCost) {
            console.log(`  ❌ Missing cost fields!`);
            allHaveCorrectCosts = false;
          } else {
            const expectedTotal = material.perUnitCost * material.qnt;
            if (Math.abs(material.totalCost - expectedTotal) > 0.01) {
              console.log(`  ❌ Total cost calculation error! Expected: ${expectedTotal}, Got: ${material.totalCost}`);
              allHaveCorrectCosts = false;
            } else {
              console.log(`  ✅ Cost calculation correct`);
            }
          }
        }
      });
      
      if (allHaveCorrectCosts) {
        console.log('\n🎯 ALL COST CALCULATIONS ARE CORRECT!');
      } else {
        console.log('\n❌ SOME COST CALCULATIONS ARE INCORRECT!');
      }
      
    } else {
      console.log('\n❌ MATERIAL IMPORT TEST FAILED!');
      console.log('Error:', response.data.error);
    }

  } catch (error) {
    console.log('\n💥 REQUEST FAILED:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

// Test fetching materials to verify structure
async function testMaterialFetch() {
  console.log('\n🔍 TESTING MATERIAL FETCH...');
  
  const domain = 'http://localhost:3000';
  const projectId = '6751234567890abcdef12345'; // Replace with actual project ID
  const clientId = '6751234567890abcdef12346';  // Replace with actual client ID
  
  try {
    const response = await axios.get(`${domain}/api/material?projectId=${projectId}&clientId=${clientId}`);
    
    console.log('\n✅ FETCH RESPONSE:');
    console.log('Status:', response.status);
    
    if (response.data.success) {
      const materials = response.data.MaterialAvailable || [];
      console.log(`Found ${materials.length} materials`);
      
      materials.forEach((material, index) => {
        console.log(`\n📦 Material ${index + 1}: ${material.name}`);
        console.log(`  - Per-unit cost: ₹${material.perUnitCost || 'MISSING'}`);
        console.log(`  - Total cost: ₹${material.totalCost || 'MISSING'}`);
        console.log(`  - Legacy cost: ₹${material.cost || 'REMOVED'}`);
        console.log(`  - Quantity: ${material.qnt} ${material.unit}`);
      });
    } else {
      console.log('Fetch failed:', response.data.error);
    }
    
  } catch (error) {
    console.log('Fetch error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 STARTING MATERIAL COST STRUCTURE TESTS');
  console.log('==========================================\n');
  
  await testMaterialImport();
  await testMaterialFetch();
  
  console.log('\n🏁 TESTS COMPLETED');
  console.log('==================');
  console.log('If you see "MATERIAL IMPORT TEST PASSED" and correct cost calculations,');
  console.log('then the fix is working properly!');
}

runTests().catch(console.error);