/**
 * Test Profile Hybrid Calculation
 * 
 * This script tests the hybrid approach for calculating total spent:
 * 1. Use project.spent if available
 * 2. Fallback to material cost calculation if project.spent is 0 but materials exist
 */

const axios = require('axios');

const DOMAIN = 'http://localhost:3000';
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testProfileHybridCalculation() {
    console.log('🧪 Testing Profile Hybrid Calculation...\n');

    try {
        // Mock project data to simulate different scenarios
        const mockProjects = [
            {
                name: 'Project with spent field',
                spent: 50000,
                MaterialAvailable: [
                    { name: 'Cement', cost: 500, qnt: 10 },
                    { name: 'Steel', cost: 1000, qnt: 5 }
                ],
                MaterialUsed: []
            },
            {
                name: 'Project without spent field but with materials',
                spent: 0,
                MaterialAvailable: [
                    { name: 'Bricks', cost: 10, qnt: 1000 },
                    { name: 'Sand', cost: 50, qnt: 100 }
                ],
                MaterialUsed: [
                    { name: 'Cement', cost: 500, qnt: 5 }
                ]
            },
            {
                name: 'Project with no spent and no materials',
                spent: 0,
                MaterialAvailable: [],
                MaterialUsed: []
            }
        ];

        console.log('📊 Testing hybrid calculation logic with mock data:\n');

        let totalSpent = 0;

        mockProjects.forEach((project, index) => {
            console.log(`  Project ${index + 1}: ${project.name}`);
            
            // Apply the hybrid calculation logic
            let projectSpent = project.spent || 0;
            
            const availableMaterials = project.MaterialAvailable || [];
            const usedMaterials = project.MaterialUsed || [];
            
            console.log(`    - Project spent field: ₹${projectSpent}`);
            console.log(`    - Materials: ${availableMaterials.length} available, ${usedMaterials.length} used`);
            
            // Fallback calculation if spent is 0 but materials exist
            if (projectSpent === 0 && (availableMaterials.length > 0 || usedMaterials.length > 0)) {
                const availableValue = availableMaterials.reduce((sum, m) => {
                    const cost = (m.cost || 0) * (m.qnt || 0);
                    return sum + cost;
                }, 0);
                
                const usedValue = usedMaterials.reduce((sum, m) => {
                    const cost = (m.cost || 0) * (m.qnt || 0);
                    return sum + cost;
                }, 0);
                
                projectSpent = availableValue + usedValue;
                console.log(`    ✅ Calculated from materials: ₹${projectSpent} (available: ₹${availableValue}, used: ₹${usedValue})`);
            } else if (projectSpent > 0) {
                console.log(`    ✅ Using project.spent: ₹${projectSpent}`);
            } else {
                console.log(`    ⚪ No spending data: ₹${projectSpent}`);
            }
            
            totalSpent += projectSpent;
            console.log(`    📊 Running total: ₹${totalSpent}\n`);
        });

        console.log(`📊 Final Total Spent: ₹${totalSpent.toLocaleString('en-IN')}`);
        
        console.log('\n✅ HYBRID APPROACH BENEFITS:');
        console.log('1. Uses project.spent when available (most accurate)');
        console.log('2. Falls back to material calculation when needed');
        console.log('3. Handles legacy data where spent field might not be populated');
        console.log('4. Shows 0 only when truly no spending/materials exist');

        // Now try with real API if server is running
        console.log('\n🌐 Testing with real API data...');
        try {
            const projectResponse = await axios.get(`${DOMAIN}/api/project?clientId=${TEST_CLIENT_ID}`);
            
            if (projectResponse.data.success && projectResponse.data.data) {
                const projects = projectResponse.data.data.projects || [];
                console.log(`✅ Found ${projects.length} real projects`);
                
                let realTotalSpent = 0;
                
                projects.forEach((project, index) => {
                    let projectSpent = project.spent || 0;
                    const availableMaterials = project.MaterialAvailable || [];
                    const usedMaterials = project.MaterialUsed || [];
                    
                    if (projectSpent === 0 && (availableMaterials.length > 0 || usedMaterials.length > 0)) {
                        const availableValue = availableMaterials.reduce((sum, m) => sum + ((m.cost || 0) * (m.qnt || 0)), 0);
                        const usedValue = usedMaterials.reduce((sum, m) => sum + ((m.cost || 0) * (m.qnt || 0)), 0);
                        projectSpent = availableValue + usedValue;
                    }
                    
                    realTotalSpent += projectSpent;
                    console.log(`  ${project.name || 'Unnamed'}: ₹${projectSpent}`);
                });
                
                console.log(`\n📊 Real Total Spent: ₹${realTotalSpent.toLocaleString('en-IN')}`);
            }
        } catch (apiError) {
            console.log('⚠️ Could not test with real API (server might not be running)');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testProfileHybridCalculation();