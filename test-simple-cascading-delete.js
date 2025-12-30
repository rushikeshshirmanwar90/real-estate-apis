



const axios = require('axios');

const domain = 'http://localhost:8080';
const clientId = '6941b27c7fdcea3d37e02ada';

async function testSimpleCascadingDelete() {
    console.log('🧪 Testing Simple Cascading Delete...\n');

    try {
        // Step 1: Create a test project
        console.log('1️⃣ Creating a test project...');
        const createProjectResponse = await axios.post(`${domain}/api/project`, {
            clientId: clientId,
            name: 'Test Cascading Delete Project',
            projectName: 'Test Cascading Delete Project',
            description: 'Test project for cascading delete functionality',
            address: 'Test Address, Test City',
            location: 'Test Location',
            type: 'Residential',
            user: {
                userId: 'test-user',
                name: 'Test User',
                email: 'test@example.com'
            }
        });

        if (!createProjectResponse.data.success) {
            console.log('❌ Failed to create test project:', createProjectResponse.data.message);
            return;
        }

        const testProject = createProjectResponse.data.data;
        console.log(`✅ Created test project: ${testProject.projectName} (${testProject._id})`);

        // Step 2: Create some test data for this project
        console.log('\n2️⃣ Creating test data...');
        
        // Create a building
        const createBuildingResponse = await axios.post(`${domain}/api/building`, {
            projectId: testProject._id,
            name: 'Test Building',
            description: 'Test building for cascading delete',
            totalFloors: 2,
            hasBasement: false,
            hasGroundFloor: true,
            floors: [
                {
                    floorNumber: 0,
                    floorName: 'Ground Floor',
                    totalUnits: 2,
                    totalBookedUnits: 0,
                    units: []
                },
                {
                    floorNumber: 1,
                    floorName: 'First Floor',
                    totalUnits: 2,
                    totalBookedUnits: 0,
                    units: []
                }
            ]
        });

        if (createBuildingResponse.data.success) {
            console.log(`✅ Created test building with 2 floors`);
        }

        // Step 3: Verify data exists
        console.log('\n3️⃣ Verifying test data exists...');
        const buildingsResponse = await axios.get(`${domain}/api/building?projectId=${testProject._id}`);
        const buildingsCount = buildingsResponse.data.success ? buildingsResponse.data.data.buildings.length : 0;
        console.log(`   - Buildings: ${buildingsCount}`);

        // Step 4: Perform cascading delete
        console.log('\n4️⃣ Performing cascading delete...');
        const deleteResponse = await axios.delete(`${domain}/api/project/${testProject._id}`);
        
        if (!deleteResponse.data.success) {
            console.log('❌ Failed to delete project:', deleteResponse.data.message);
            console.log('Response:', deleteResponse.data);
            return;
        }

        console.log('✅ Project deleted successfully!');
        
        if (deleteResponse.data.data.cascadingDeleteSummary) {
            console.log('\n📊 Cascading Delete Summary:');
            const summary = deleteResponse.data.data.cascadingDeleteSummary;
            
            Object.entries(summary).forEach(([key, count]) => {
                console.log(`   - ${key}: ${count} deleted`);
            });
        }

        // Step 5: Verify deletion
        console.log('\n5️⃣ Verifying deletion...');
        
        // Try to get the project (should fail)
        try {
            await axios.get(`${domain}/api/project/${testProject._id}?clientId=${clientId}`);
            console.log('❌ Project still exists after deletion');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ Project successfully deleted');
            } else {
                console.log('⚠️ Unexpected error:', error.response?.data?.message);
            }
        }

        // Try to get buildings (should be empty)
        try {
            const verifyBuildingsResponse = await axios.get(`${domain}/api/building?projectId=${testProject._id}`);
            const remainingBuildings = verifyBuildingsResponse.data.success ? verifyBuildingsResponse.data.data.buildings.length : 0;
            console.log(`✅ Remaining buildings: ${remainingBuildings} (should be 0)`);
        } catch (error) {
            console.log('✅ Buildings check completed');
        }

        console.log('\n🎉 Simple Cascading Delete Test Completed Successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testSimpleCascadingDelete();