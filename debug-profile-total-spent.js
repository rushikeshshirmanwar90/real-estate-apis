/**
 * Debug Profile Total Spent Issue
 * 
 * This script helps debug why total spent is showing 0 in the profile page
 */

const axios = require('axios');

const DOMAIN = 'http://localhost:3000';
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function debugTotalSpentCalculation() {
    console.log('🔍 Debugging Total Spent Calculation...\n');

    try {
        // 1. Fetch projects data
        console.log('📊 Step 1: Fetching project data');
        const projectResponse = await axios.get(`${DOMAIN}/api/project?clientId=${TEST_CLIENT_ID}`);
        
        console.log('📦 Raw API Response Structure:');
        console.log('- Response keys:', Object.keys(projectResponse.data));
        
        if (projectResponse.data.success && projectResponse.data.data) {
            const data = projectResponse.data.data;
            const projects = data.projects || [];
            
            console.log(`\n📊 Found ${projects.length} projects`);
            
            if (projects.length === 0) {
                console.log('❌ No projects found - this explains why total spent is 0');
                return;
            }
            
            // 2. Analyze each project's spending data
            console.log('\n📊 Step 2: Analyzing project spending data');
            let totalSpent = 0;
            
            projects.forEach((project, index) => {
                console.log(`\n  Project ${index + 1}: ${project.name || project.title || 'Unnamed'}`);
                console.log(`    - Project ID: ${project._id}`);
                console.log(`    - Has 'spent' field: ${typeof project.spent}`);
                console.log(`    - project.spent value: ${project.spent}`);
                
                // Check material data
                const availableMaterials = project.MaterialAvailable || [];
                const usedMaterials = project.MaterialUsed || [];
                
                console.log(`    - Available materials: ${availableMaterials.length}`);
                console.log(`    - Used materials: ${usedMaterials.length}`);
                
                // Analyze material costs
                if (availableMaterials.length > 0) {
                    console.log('    - Available materials details:');
                    availableMaterials.forEach((material, i) => {
                        console.log(`      ${i + 1}. ${material.name || 'Unnamed'} - Cost: ${material.cost || 0} - Total Cost: ${material.totalCost || 0}`);
                    });
                }
                
                if (usedMaterials.length > 0) {
                    console.log('    - Used materials details:');
                    usedMaterials.forEach((material, i) => {
                        console.log(`      ${i + 1}. ${material.name || 'Unnamed'} - Cost: ${material.cost || 0} - Total Cost: ${material.totalCost || 0}`);
                    });
                }
                
                // Calculate spending like the profile page does
                let projectSpent = 0;
                if (typeof project.spent === 'number') {
                    projectSpent = project.spent;
                    console.log(`    ✅ Using project.spent: ₹${projectSpent}`);
                } else {
                    // Fallback: calculate from material costs
                    const availableCost = availableMaterials.reduce((sum, m) => sum + (m.cost || 0), 0);
                    const usedCost = usedMaterials.reduce((sum, m) => sum + (m.cost || 0), 0);
                    projectSpent = availableCost + usedCost;
                    console.log(`    ⚠️ Calculated from materials: ₹${projectSpent} (available: ₹${availableCost}, used: ₹${usedCost})`);
                    
                    // Also try totalCost field
                    const availableTotalCost = availableMaterials.reduce((sum, m) => sum + (m.totalCost || 0), 0);
                    const usedTotalCost = usedMaterials.reduce((sum, m) => sum + (m.totalCost || 0), 0);
                    console.log(`    💡 Alternative with totalCost: ₹${availableTotalCost + usedTotalCost} (available: ₹${availableTotalCost}, used: ₹${usedTotalCost})`);
                }
                
                totalSpent += projectSpent;
                console.log(`    📊 Running total: ₹${totalSpent}`);
            });
            
            console.log(`\n📊 Final Total Spent: ₹${totalSpent}`);
            
            if (totalSpent === 0) {
                console.log('\n❌ ISSUE IDENTIFIED:');
                console.log('- Total spent is 0 because:');
                console.log('  1. No projects have a "spent" field with a number value');
                console.log('  2. Material "cost" fields are all 0 or missing');
                console.log('\n💡 POSSIBLE SOLUTIONS:');
                console.log('- Check if materials should use "totalCost" instead of "cost"');
                console.log('- Verify if projects should have a "spent" field populated');
                console.log('- Check if the cost calculation logic needs adjustment');
            } else {
                console.log('\n✅ Total spent calculation is working correctly');
            }
            
        } else {
            console.log('❌ Unexpected API response structure');
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the debug
debugTotalSpentCalculation();