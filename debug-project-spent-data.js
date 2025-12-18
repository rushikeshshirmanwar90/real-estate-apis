/**
 * Debug Project Spent Data
 * 
 * This script checks the actual project data to understand why total spent is 0
 */

const axios = require('axios');

const DOMAIN = 'http://localhost:3000';
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function debugProjectSpentData() {
    console.log('🔍 Debugging Project Spent Data...\n');

    try {
        // 1. Check if server is running
        console.log('🌐 Step 1: Checking server connection');
        try {
            const healthCheck = await axios.get(`${DOMAIN}/api/health`);
            console.log('✅ Server is running');
        } catch (error) {
            console.log('❌ Server might not be running. Trying project API directly...');
        }

        // 2. Fetch project data
        console.log('\n📊 Step 2: Fetching project data');
        const projectResponse = await axios.get(`${DOMAIN}/api/project?clientId=${TEST_CLIENT_ID}`);
        
        console.log('📦 API Response Status:', projectResponse.status);
        console.log('📦 Response Structure:', Object.keys(projectResponse.data));
        
        if (projectResponse.data.success && projectResponse.data.data) {
            const data = projectResponse.data.data;
            const projects = data.projects || [];
            
            console.log(`\n📊 Found ${projects.length} projects for client ${TEST_CLIENT_ID}`);
            
            if (projects.length === 0) {
                console.log('❌ NO PROJECTS FOUND');
                console.log('- This explains why total spent is 0');
                console.log('- Create some projects first');
                return;
            }
            
            // 3. Analyze each project in detail
            console.log('\n📊 Step 3: Analyzing project spending data');
            let totalSpent = 0;
            let projectsWithSpending = 0;
            let projectsWithMaterials = 0;
            
            projects.forEach((project, index) => {
                console.log(`\n  📁 Project ${index + 1}: ${project.name || project.title || 'Unnamed'}`);
                console.log(`     ID: ${project._id}`);
                console.log(`     Client ID: ${project.clientId}`);
                
                // Check spent field
                const spent = project.spent || 0;
                console.log(`     💰 Spent field: ₹${spent}`);
                
                if (spent > 0) {
                    projectsWithSpending++;
                }
                
                // Check materials
                const availableMaterials = project.MaterialAvailable || [];
                const usedMaterials = project.MaterialUsed || [];
                
                console.log(`     📦 Materials: ${availableMaterials.length} available, ${usedMaterials.length} used`);
                
                if (availableMaterials.length > 0 || usedMaterials.length > 0) {
                    projectsWithMaterials++;
                }
                
                // Show material details if any
                if (availableMaterials.length > 0) {
                    console.log('     📋 Available Materials:');
                    availableMaterials.forEach((material, i) => {
                        console.log(`       ${i + 1}. ${material.name || 'Unnamed'}`);
                        console.log(`          - Quantity: ${material.qnt || 0} ${material.unit || ''}`);
                        console.log(`          - Cost per unit: ₹${material.cost || 0}`);
                        console.log(`          - Total cost: ₹${material.totalCost || 0}`);
                        console.log(`          - Specs: ${JSON.stringify(material.specs || {})}`);
                    });
                }
                
                if (usedMaterials.length > 0) {
                    console.log('     🔨 Used Materials:');
                    usedMaterials.forEach((material, i) => {
                        console.log(`       ${i + 1}. ${material.name || 'Unnamed'}`);
                        console.log(`          - Quantity: ${material.qnt || 0} ${material.unit || ''}`);
                        console.log(`          - Cost per unit: ₹${material.cost || 0}`);
                        console.log(`          - Total cost: ₹${material.totalCost || 0}`);
                    });
                }
                
                totalSpent += spent;
                console.log(`     📊 Running total spent: ₹${totalSpent}`);
            });
            
            // 4. Summary
            console.log('\n📊 SUMMARY:');
            console.log(`  - Total projects: ${projects.length}`);
            console.log(`  - Projects with spending: ${projectsWithSpending}`);
            console.log(`  - Projects with materials: ${projectsWithMaterials}`);
            console.log(`  - Total spent across all projects: ₹${totalSpent.toLocaleString('en-IN')}`);
            
            // 5. Diagnosis
            console.log('\n🔍 DIAGNOSIS:');
            if (totalSpent === 0) {
                if (projectsWithMaterials === 0) {
                    console.log('❌ ISSUE: No materials have been imported to any project');
                    console.log('💡 SOLUTION: Import some materials to projects to see spending');
                } else {
                    console.log('❌ ISSUE: Projects have materials but spent field is 0');
                    console.log('💡 POSSIBLE CAUSES:');
                    console.log('   - Materials were added before spent tracking was implemented');
                    console.log('   - Database inconsistency');
                    console.log('   - Material import API not updating spent field correctly');
                }
            } else {
                console.log('✅ Total spent calculation is working correctly');
                console.log('💡 Profile page should show this amount');
            }
            
        } else {
            console.log('❌ Unexpected API response structure');
            console.log('Response:', JSON.stringify(projectResponse.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 SOLUTION: Start the development server first:');
            console.log('   cd real-estate-web');
            console.log('   npm run dev');
        }
    }
}

// Run the debug
debugProjectSpentData();