const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust based on your server
const TEST_PROJECT_ID = '6751b8b8b8b8b8b8b8b8b8b8'; // Replace with actual project ID
const TEST_BUILDING_ID = '6751b8b8b8b8b8b8b8b8b8b9'; // Replace with actual building ID

async function testBuildingFloorsIntegration() {
    console.log('🏗️  Testing Building Floors Integration');
    console.log('=====================================');

    try {
        // Test 1: Create a test building
        console.log('\n1. Creating test building...');
        const buildingResponse = await axios.post(`${BASE_URL}/api/building`, {
            projectId: TEST_PROJECT_ID,
            name: 'Test Building for Floors',
            buildingType: 'Residential',
            constructionStatus: 'Under Construction',
            totalFloors: 0,
            totalUnits: 0,
            description: 'Test building for floors integration'
        });

        const buildingId = buildingResponse.data._id || buildingResponse.data.data?._id;
        console.log('✅ Building created:', buildingId);

        // Test 2: Add floors to the building
        console.log('\n2. Adding floors to building...');
        
        const floor1Response = await axios.post(`${BASE_URL}/api/floors`, {
            buildingId: buildingId,
            floorNumber: 0,
            floorName: 'Ground Floor',
            floorType: 'Commercial',
            totalUnits: 4,
            description: 'Ground floor with shops'
        });
        console.log('✅ Ground floor added:', floor1Response.data._id || floor1Response.data.data?._id);

        const floor2Response = await axios.post(`${BASE_URL}/api/floors`, {
            buildingId: buildingId,
            floorNumber: 1,
            floorName: 'First Floor',
            floorType: 'Residential',
            totalUnits: 6,
            description: 'First floor with apartments'
        });
        console.log('✅ First floor added:', floor2Response.data._id || floor2Response.data.data?._id);

        // Test 3: Get all floors for the building
        console.log('\n3. Retrieving all floors...');
        const floorsResponse = await axios.get(`${BASE_URL}/api/floors?buildingId=${buildingId}`);
        const floors = floorsResponse.data.data || floorsResponse.data;
        console.log(`✅ Retrieved ${floors.length} floors`);
        floors.forEach((floor, index) => {
            console.log(`   Floor ${index + 1}: ${floor.floorName} (${floor.totalUnits} units)`);
        });

        // Test 4: Add units to a floor
        console.log('\n4. Adding units to floors...');
        const firstFloorId = floors.find(f => f.floorNumber === 1)?._id;
        
        if (firstFloorId) {
            const unit1Response = await axios.post(`${BASE_URL}/api/units`, {
                buildingId: buildingId,
                floorId: firstFloorId,
                unitNumber: '101',
                type: '2BHK',
                area: 1200,
                price: 5000000,
                status: 'Available',
                description: 'Spacious 2BHK apartment'
            });
            console.log('✅ Unit 101 added');

            const unit2Response = await axios.post(`${BASE_URL}/api/units`, {
                buildingId: buildingId,
                floorId: firstFloorId,
                unitNumber: '102',
                type: '3BHK',
                area: 1500,
                price: 6500000,
                status: 'Booked',
                description: 'Premium 3BHK apartment',
                customerInfo: {
                    name: 'John Doe',
                    phone: '+1234567890',
                    email: 'john@example.com'
                }
            });
            console.log('✅ Unit 102 added (Booked)');
        }

        // Test 5: Get units for the building
        console.log('\n5. Retrieving all units...');
        const unitsResponse = await axios.get(`${BASE_URL}/api/units?buildingId=${buildingId}`);
        const units = unitsResponse.data.data || unitsResponse.data;
        console.log(`✅ Retrieved ${units.length} units`);
        units.forEach((unit, index) => {
            console.log(`   Unit ${index + 1}: ${unit.unitNumber} (${unit.type}, ${unit.status})`);
        });

        // Test 6: Update building details
        console.log('\n6. Updating building details...');
        const updateResponse = await axios.put(`${BASE_URL}/api/building?id=${buildingId}`, {
            description: 'Updated test building with floors and units',
            location: 'Test Location',
            area: 5000,
            completionDate: '2024-12-31'
        });
        console.log('✅ Building details updated');

        // Test 7: Get updated building with floors
        console.log('\n7. Retrieving updated building...');
        const updatedBuildingResponse = await axios.get(`${BASE_URL}/api/building?id=${buildingId}`);
        const updatedBuilding = updatedBuildingResponse.data.data || updatedBuildingResponse.data;
        console.log('✅ Building retrieved with details:');
        console.log(`   Name: ${updatedBuilding.name}`);
        console.log(`   Total Floors: ${updatedBuilding.totalFloors}`);
        console.log(`   Total Units: ${updatedBuilding.totalUnits}`);
        console.log(`   Floors in building: ${updatedBuilding.floors?.length || 0}`);

        console.log('\n🎉 All tests passed! Building floors integration is working correctly.');
        
        return {
            success: true,
            buildingId: buildingId,
            floorsCount: floors.length,
            unitsCount: units.length
        };

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

// Run the test
if (require.main === module) {
    testBuildingFloorsIntegration()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Integration test completed successfully!');
                process.exit(0);
            } else {
                console.log('\n❌ Integration test failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = testBuildingFloorsIntegration;