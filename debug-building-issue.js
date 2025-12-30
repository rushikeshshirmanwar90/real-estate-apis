const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust based on your server
const BUILDING_ID = '69462b94a87a0ef600e5e7df'; // The problematic building ID

async function debugBuildingIssue() {
    console.log('🔍 Debugging Building Issue');
    console.log('==========================');
    console.log('Building ID:', BUILDING_ID);
    console.log('Base URL:', BASE_URL);

    try {
        // Test 1: Check if building exists
        console.log('\n1. Checking if building exists...');
        try {
            const buildingResponse = await axios.get(`${BASE_URL}/api/building?id=${BUILDING_ID}`);
            console.log('✅ Building found:', buildingResponse.data);
        } catch (error) {
            console.log('❌ Building not found:', error.response?.status, error.response?.data);
            
            if (error.response?.status === 404) {
                console.log('🔍 Building does not exist in database');
            }
        }

        // Test 2: List all buildings to see what's available
        console.log('\n2. Listing all buildings...');
        try {
            const allBuildingsResponse = await axios.get(`${BASE_URL}/api/building`);
            const buildings = allBuildingsResponse.data.data?.buildings || allBuildingsResponse.data;
            
            console.log(`✅ Found ${buildings.length} buildings:`);
            buildings.forEach((building, index) => {
                console.log(`   ${index + 1}. ID: ${building._id}, Name: ${building.name}, Project: ${building.projectId}`);
            });
        } catch (error) {
            console.log('❌ Error listing buildings:', error.response?.data);
        }

        // Test 3: Check if it's a project section issue
        console.log('\n3. Checking project sections...');
        try {
            // You'll need to replace this with an actual project ID
            const projectResponse = await axios.get(`${BASE_URL}/api/project`);
            const projects = projectResponse.data;
            
            console.log('✅ Found projects, checking for building sections...');
            
            if (Array.isArray(projects)) {
                projects.forEach((project, index) => {
                    console.log(`   Project ${index + 1}: ${project.name || project.projectName} (${project._id})`);
                    if (project.section && project.section.length > 0) {
                        project.section.forEach((section, sIndex) => {
                            if (section.type === 'Buildings') {
                                console.log(`     Building Section ${sIndex + 1}: ${section.name} (${section.sectionId})`);
                                if (section.sectionId === BUILDING_ID) {
                                    console.log('     🎯 FOUND MATCHING SECTION!');
                                }
                            }
                        });
                    }
                });
            }
        } catch (error) {
            console.log('❌ Error checking projects:', error.response?.data);
        }

        // Test 4: Test building creation to see if API works
        console.log('\n4. Testing building creation...');
        try {
            const testBuilding = {
                projectId: '507f1f77bcf86cd799439011', // Dummy project ID
                name: 'Debug Test Building',
                totalFloors: 1,
                hasBasement: false,
                hasGroundFloor: true,
                description: 'Test building for debugging'
            };

            const createResponse = await axios.post(`${BASE_URL}/api/building`, testBuilding);
            console.log('✅ Building creation works:', createResponse.data._id || createResponse.data.data?._id);
            
            // Clean up - delete the test building
            const testBuildingId = createResponse.data._id || createResponse.data.data?._id;
            if (testBuildingId) {
                try {
                    await axios.delete(`${BASE_URL}/api/building?projectId=${testBuilding.projectId}&sectionId=${testBuildingId}`);
                    console.log('✅ Test building cleaned up');
                } catch (cleanupError) {
                    console.log('⚠️ Could not clean up test building');
                }
            }
        } catch (error) {
            console.log('❌ Building creation failed:', error.response?.data);
        }

    } catch (error) {
        console.error('💥 Unexpected error:', error.message);
    }
}

// Run the debug
if (require.main === module) {
    debugBuildingIssue()
        .then(() => {
            console.log('\n🔍 Debug completed!');
            console.log('\n💡 Recommendations:');
            console.log('1. Check if the building ID is correct');
            console.log('2. Verify the building exists in the database');
            console.log('3. Make sure you\'re using the right project and section IDs');
            console.log('4. Try creating a new building section if the old one is corrupted');
        })
        .catch(error => {
            console.error('\n💥 Debug failed:', error);
        });
}

module.exports = debugBuildingIssue;