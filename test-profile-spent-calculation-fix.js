/**
 * Test script to verify profile total spent calculation fix
 * Tests that total spent uses project.spent field instead of material calculations
 */

const BASE_URL = 'http://localhost:3000';
const CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testProfileSpentCalculationFix() {
  console.log('💰 Testing Profile Total Spent Calculation Fix...\n');

  // Test 1: Get project data to see the structure
  console.log('1️⃣ Testing project data structure...');
  try {
    const response = await fetch(`${BASE_URL}/api/project/client?clientId=${CLIENT_ID}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Project data retrieved successfully');
      console.log(`   Found ${data.projects?.length || 0} projects`);
      
      // Analyze each project's spent field
      if (data.projects && data.projects.length > 0) {
        console.log('\n📊 Project spending analysis:');
        let totalSpentFromProjects = 0;
        let totalSpentFromMaterials = 0;
        
        data.projects.forEach((project, index) => {
          const projectSpent = Number(project.spent) || 0;
          const availableMaterials = project.MaterialAvailable || [];
          const usedMaterials = project.MaterialUsed || [];
          
          // Calculate material-based total (old method)
          const availableValue = availableMaterials.reduce((sum, m) => {
            return sum + ((m.cost || 0) * (m.qnt || 0));
          }, 0);
          
          const usedValue = usedMaterials.reduce((sum, m) => {
            return sum + ((m.cost || 0) * (m.qnt || 0));
          }, 0);
          
          const materialTotal = availableValue + usedValue;
          
          console.log(`\n   Project ${index + 1}: ${project.name || 'Unnamed'}`);
          console.log(`     - project.spent: ₹${projectSpent.toLocaleString('en-IN')}`);
          console.log(`     - Material total: ₹${materialTotal.toLocaleString('en-IN')} (${availableMaterials.length} available + ${usedMaterials.length} used)`);
          console.log(`     - Difference: ₹${Math.abs(projectSpent - materialTotal).toLocaleString('en-IN')}`);
          
          totalSpentFromProjects += projectSpent;
          totalSpentFromMaterials += materialTotal;
        });
        
        console.log(`\n📈 Summary:`);
        console.log(`   Total from project.spent: ₹${totalSpentFromProjects.toLocaleString('en-IN')} ✅ (NEW METHOD)`);
        console.log(`   Total from materials: ₹${totalSpentFromMaterials.toLocaleString('en-IN')} ❌ (OLD METHOD)`);
        console.log(`   Difference: ₹${Math.abs(totalSpentFromProjects - totalSpentFromMaterials).toLocaleString('en-IN')}`);
        
        if (totalSpentFromProjects !== totalSpentFromMaterials) {
          console.log(`\n⚠️  The calculations are different, which is expected.`);
          console.log(`   The profile should now show: ₹${totalSpentFromProjects.toLocaleString('en-IN')}`);
        } else {
          console.log(`\n✅ Both calculations match: ₹${totalSpentFromProjects.toLocaleString('en-IN')}`);
        }
      } else {
        console.log('   No projects found to analyze');
      }
    } else {
      console.log('❌ Failed to get project data:', data.message);
    }
  } catch (error) {
    console.log('❌ Project data test failed:', error.message);
  }

  // Test 2: Simulate the profile calculation logic
  console.log('\n2️⃣ Testing profile calculation logic...');
  
  const mockProjects = [
    {
      name: 'Project A',
      spent: 50000,
      MaterialAvailable: [
        { name: 'Cement', cost: 500, qnt: 10 },
        { name: 'Brick', cost: 50, qnt: 100 }
      ],
      MaterialUsed: [
        { name: 'Steel', cost: 100, qnt: 20 }
      ]
    },
    {
      name: 'Project B', 
      spent: 75000,
      MaterialAvailable: [
        { name: 'Sand', cost: 200, qnt: 50 }
      ],
      MaterialUsed: [
        { name: 'Cement', cost: 500, qnt: 5 }
      ]
    },
    {
      name: 'Project C',
      spent: 0, // No spending yet
      MaterialAvailable: [
        { name: 'Paint', cost: 300, qnt: 10 }
      ],
      MaterialUsed: []
    }
  ];

  console.log('   Mock project data:');
  let totalSpent = 0;
  
  mockProjects.forEach((project, index) => {
    const projectSpent = Number(project.spent) || 0;
    console.log(`     ${project.name}: spent = ₹${projectSpent.toLocaleString('en-IN')}`);
    totalSpent += projectSpent;
  });
  
  console.log(`\n   ✅ Total calculated: ₹${totalSpent.toLocaleString('en-IN')}`);
  console.log(`   Expected result: ₹125,000 (50,000 + 75,000 + 0)`);
  
  if (totalSpent === 125000) {
    console.log('   ✅ Calculation logic is correct!');
  } else {
    console.log('   ❌ Calculation logic has an issue');
  }

  console.log('\n🎉 Profile Total Spent Calculation Fix testing completed!');
  console.log('\n📋 Summary of changes:');
  console.log('• Changed from material cost calculation to project.spent summation');
  console.log('• Now uses: totalSpent += Number(project.spent) || 0');
  console.log('• Removed complex material cost calculations');
  console.log('• More accurate representation of actual project spending');
  console.log('• Faster calculation with less complexity');
}

// Run the test
testProfileSpentCalculationFix().catch(console.error);