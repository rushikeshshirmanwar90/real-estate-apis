/**
 * Test Profile Direct Calculation
 * 
 * This script tests the direct calculation approach where we sum all material costs
 * from all projects to get the total spent amount.
 */

const axios = require('axios');

const DOMAIN = 'http://localhost:3000';
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testProfileDirectCalculation() {
    console.log('🧪 Testing Profile Direct Calculation...\n');

    try {
        // Mock project data to demonstrate the calculation
        const mockProjects = [
            {
                name: 'House Construction',
                MaterialAvailable: [
                    { name: 'Cement', cost: 500, qnt: 20 },      // 500 × 20 = 10,000
                    { name: 'Steel Rods', cost: 80, qnt: 100 },  // 80 × 100 = 8,000
                    { name: 'Bricks', cost: 8, qnt: 5000 }       // 8 × 5000 = 40,000
                ],
                MaterialUsed: [
                    { name: 'Sand', cost: 50, qnt: 50 },         // 50 × 50 = 2,500
                    { name: 'Gravel', cost: 60, qnt: 30 }        // 60 × 30 = 1,800
                ]
                // Expected project total: 10,000 + 8,000 + 40,000 + 2,500 + 1,800 = 62,300
            },
            {
                name: 'Office Building',
                MaterialAvailable: [
                    { name: 'Tiles', cost: 150, qnt: 200 },      // 150 × 200 = 30,000
                    { name: 'Paint', cost: 300, qnt: 10 }        // 300 × 10 = 3,000
                ],
                MaterialUsed: [
                    { name: 'Cement', cost: 500, qnt: 5 }        // 500 × 5 = 2,500
                ]
                // Expected project total: 30,000 + 3,000 + 2,500 = 35,500
            }
            // Expected grand total: 62,300 + 35,500 = 97,800
        ];

        console.log('📊 Testing direct calculation with mock data:\n');

        let totalSpent = 0;

        mockProjects.forEach((project, index) => {
            console.log(`  Project ${index + 1}: ${project.name}`);
            
            const availableMaterials = project.MaterialAvailable || [];
            const usedMaterials = project.MaterialUsed || [];
            
            console.log(`    - Materials: ${availableMaterials.length} available, ${usedMaterials.length} used`);
            
            // Calculate available materials cost
            const availableValue = availableMaterials.reduce((sum, m) => {
                const cost = (m.cost || 0) * (m.qnt || 0);
                console.log(`      Available: ${m.name} - ${m.qnt} × ₹${m.cost} = ₹${cost.toLocaleString('en-IN')}`);
                return sum + cost;
            }, 0);
            
            // Calculate used materials cost
            const usedValue = usedMaterials.reduce((sum, m) => {
                const cost = (m.cost || 0) * (m.qnt || 0);
                console.log(`      Used: ${m.name} - ${m.qnt} × ₹${m.cost} = ₹${cost.toLocaleString('en-IN')}`);
                return sum + cost;
            }, 0);
            
            const projectSpent = availableValue + usedValue;
            console.log(`    ✅ Project total: ₹${projectSpent.toLocaleString('en-IN')} (available: ₹${availableValue.toLocaleString('en-IN')} + used: ₹${usedValue.toLocaleString('en-IN')})`);
            
            totalSpent += projectSpent;
            console.log(`    📊 Running total: ₹${totalSpent.toLocaleString('en-IN')}\n`);
        });

        console.log(`📊 Final Total Spent: ₹${totalSpent.toLocaleString('en-IN')}`);
        console.log(`📊 Expected: ₹97,800 - ${totalSpent === 97800 ? '✅ CORRECT' : '❌ INCORRECT'}`);
        
        console.log('\n✅ DIRECT CALCULATION BENEFITS:');
        console.log('1. Always shows actual material investment');
        console.log('2. No dependency on project.spent field');
        console.log('3. Transparent calculation from raw material data');
        console.log('4. Shows real value of materials in projects');

        // Test with real API if available
        console.log('\n🌐 Testing with real API data...');
        try {
            const projectResponse = await axios.get(`${DOMAIN}/api/project?clientId=${TEST_CLIENT_ID}`);
            
            if (projectResponse.data.success && projectResponse.data.data) {
                const projects = projectResponse.data.data.projects || [];
                console.log(`✅ Found ${projects.length} real projects`);
                
                if (projects.length === 0) {
                    console.log('⚠️ No projects found - create some projects with materials to test');
                    return;
                }
                
                let realTotalSpent = 0;
                
                projects.forEach((project, index) => {
                    const availableMaterials = project.MaterialAvailable || [];
                    const usedMaterials = project.MaterialUsed || [];
                    
                    const availableValue = availableMaterials.reduce((sum, m) => sum + ((m.cost || 0) * (m.qnt || 0)), 0);
                    const usedValue = usedMaterials.reduce((sum, m) => sum + ((m.cost || 0) * (m.qnt || 0)), 0);
                    const projectSpent = availableValue + usedValue;
                    
                    realTotalSpent += projectSpent;
                    console.log(`  ${project.name || 'Unnamed'}: ₹${projectSpent.toLocaleString('en-IN')} (${availableMaterials.length + usedMaterials.length} materials)`);
                });
                
                console.log(`\n📊 Real Total Spent: ₹${realTotalSpent.toLocaleString('en-IN')}`);
                
                if (realTotalSpent > 0) {
                    console.log('✅ Profile should now show this amount');
                } else {
                    console.log('⚠️ Still 0 - check if projects have materials with cost and quantity');
                }
            }
        } catch (apiError) {
            console.log('⚠️ Could not test with real API (server might not be running)');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testProfileDirectCalculation();