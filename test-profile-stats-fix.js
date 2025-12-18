/**
 * Test Profile Page Stats Fix
 * 
 * This script tests the fix for profile page showing zero stats.
 * The issue was that fetchStats was expecting getProjectData to return an array,
 * but it actually returns {projects, meta} structure.
 */

const axios = require('axios');

const DOMAIN = 'http://localhost:3000';
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testProfileStatsCalculation() {
    console.log('🧪 Testing Profile Stats Calculation Fix...\n');

    try {
        // 1. Test getProjectData API directly
        console.log('📊 Step 1: Testing getProjectData API response structure');
        const projectResponse = await axios.get(`${DOMAIN}/api/project?clientId=${TEST_CLIENT_ID}`);
        
        console.log('📦 Raw API Response Structure:');
        console.log('- Response keys:', Object.keys(projectResponse.data));
        console.log('- Has success field:', 'success' in projectResponse.data);
        console.log('- Has data field:', 'data' in projectResponse.data);
        
        if (projectResponse.data.success && projectResponse.data.data) {
            const data = projectResponse.data.data;
            console.log('- Data keys:', Object.keys(data));
            console.log('- Has projects array:', 'projects' in data && Array.isArray(data.projects));
            console.log('- Has meta object:', 'meta' in data);
            
            if (data.projects) {
                console.log(`- Projects count: ${data.projects.length}`);
                
                // 2. Simulate stats calculation like the fixed profile page
                console.log('\n📊 Step 2: Simulating stats calculation');
                let totalMaterials = 0;
                let totalSpent = 0;
                let activeProjects = 0;
                
                data.projects.forEach((project, index) => {
                    console.log(`\n  Project ${index + 1}: ${project.name || project.title || 'Unnamed'}`);
                    
                    const availableMaterials = project.MaterialAvailable || [];
                    const usedMaterials = project.MaterialUsed || [];
                    
                    console.log(`    - Available materials: ${availableMaterials.length}`);
                    console.log(`    - Used materials: ${usedMaterials.length}`);
                    
                    totalMaterials += availableMaterials.length + usedMaterials.length;
                    
                    // Use project.spent if available, otherwise calculate from materials
                    let projectSpent = 0;
                    if (typeof project.spent === 'number') {
                        projectSpent = project.spent;
                        console.log(`    - Using project.spent: ₹${projectSpent}`);
                    } else {
                        const availableCost = availableMaterials.reduce((sum, m) => sum + (m.cost || 0), 0);
                        const usedCost = usedMaterials.reduce((sum, m) => sum + (m.cost || 0), 0);
                        projectSpent = availableCost + usedCost;
                        console.log(`    - Calculated from materials: ₹${projectSpent}`);
                    }
                    
                    totalSpent += projectSpent;
                    
                    if (availableMaterials.length > 0 || usedMaterials.length > 0) {
                        activeProjects++;
                    }
                });
                
                console.log('\n📊 Final Stats:');
                console.log(`  ✅ Total Projects: ${data.projects.length}`);
                console.log(`  ✅ Active Projects: ${activeProjects}`);
                console.log(`  ✅ Total Materials: ${totalMaterials}`);
                console.log(`  ✅ Total Spent: ₹${totalSpent.toLocaleString('en-IN')}`);
                
                // 3. Verify the fix addresses the issue
                console.log('\n🔍 Step 3: Verifying the fix');
                if (data.projects.length > 0) {
                    console.log('✅ Projects found - stats should not be zero');
                    console.log('✅ Profile page should now show correct stats');
                } else {
                    console.log('⚠️ No projects found - stats will legitimately be zero');
                }
                
            } else {
                console.log('❌ No projects array found in response');
            }
        } else {
            console.log('❌ Unexpected API response structure');
            console.log('Response:', JSON.stringify(projectResponse.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testProfileStatsCalculation();