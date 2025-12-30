const axios = require('axios');

const domain = 'http://localhost:8080';

async function testUnitsManagement() {
    console.log('🧪 Testing Complete Units Management Flow...\n');

    try {
        // Step 1: Get a building with floors
        console.log('1️⃣ Fetching buildings...');
        const buildingsResponse = await axios.get(`${domain}/api/building`);
        
        if (!buildingsResponse.data.success || !buildingsResponse.data.data.buildings.length) {
            console.log('❌ No buildings found');
            return;
        }

        const building = buildingsResponse.data.data.buildings[0];
        console.log(`✅ Found building: ${building.name} (${building._id})`);

        // Step 2: Get floors for this building
        console.log('\n2️⃣ Fetching floors...');
        const floorsResponse = await axios.get(`${domain}/api/floors?buildingId=${building._id}`);
        
        if (!floorsResponse.data.success || !floorsResponse.data.data.length) {
            console.log('❌ No floors found, creating a test floor...');
            
            // Create a test floor
            const newFloorResponse = await axios.post(`${domain}/api/floors`, {
                buildingId: building._id,
                floorNumber: 1,
                floorName: 'Ground Floor',
                floorType: 'Residential',
                totalUnits: 0,
                description: 'Test floor for units management'
            });

            if (!newFloorResponse.data.success) {
                console.log('❌ Failed to create test floor');
                return;
            }

            console.log('✅ Created test floor');
        }

        // Get floors again
        const floorsResponse2 = await axios.get(`${domain}/api/floors?buildingId=${building._id}`);
        const floors = floorsResponse2.data.data;
        const testFloor = floors[0];
        
        console.log(`✅ Found ${floors.length} floor(s), using: ${testFloor.floorName} (${testFloor._id})`);

        // Step 3: Add a unit
        console.log('\n3️⃣ Adding a unit...');
        const unitData = {
            buildingId: building._id,
            floorId: testFloor._id,
            unitNumber: 'A101',
            type: '2BHK',
            area: 1200,
            status: 'Available',
            description: 'Spacious 2BHK unit with balcony',
            customerInfo: {
                name: '',
                phone: '',
                email: ''
            }
        };

        const addUnitResponse = await axios.post(`${domain}/api/building/units`, unitData);
        
        if (!addUnitResponse.data.success) {
            console.log('❌ Failed to add unit:', addUnitResponse.data.message);
            return;
        }

        console.log('✅ Unit added successfully:', addUnitResponse.data.data.unit.unitNumber);

        // Step 4: Add another unit with customer info
        console.log('\n4️⃣ Adding a booked unit...');
        const bookedUnitData = {
            buildingId: building._id,
            floorId: testFloor._id,
            unitNumber: 'A102',
            type: '3BHK',
            area: 1500,
            status: 'Booked',
            description: 'Premium 3BHK unit with garden view',
            customerInfo: {
                name: 'John Doe',
                phone: '+1234567890',
                email: 'john.doe@example.com'
            }
        };

        const addBookedUnitResponse = await axios.post(`${domain}/api/building/units`, bookedUnitData);
        
        if (!addBookedUnitResponse.data.success) {
            console.log('❌ Failed to add booked unit:', addBookedUnitResponse.data.message);
            return;
        }

        console.log('✅ Booked unit added successfully:', addBookedUnitResponse.data.data.unit.unitNumber);

        // Step 5: Verify floors data updated correctly
        console.log('\n5️⃣ Verifying floor data...');
        const updatedFloorsResponse = await axios.get(`${domain}/api/floors?buildingId=${building._id}`);
        const updatedFloor = updatedFloorsResponse.data.data.find(f => f._id === testFloor._id);
        
        console.log(`✅ Floor now has ${updatedFloor.totalUnits} total units, ${updatedFloor.totalBookedUnits} booked`);
        console.log(`✅ Units: ${updatedFloor.units.map(u => `${u.unitNumber} (${u.status})`).join(', ')}`);

        // Step 6: Update a unit
        console.log('\n6️⃣ Updating unit status...');
        const unitToUpdate = updatedFloor.units.find(u => u.unitNumber === 'A101');
        
        const updateUnitResponse = await axios.put(
            `${domain}/api/building/units?buildingId=${building._id}&floorId=${testFloor._id}&unitId=${unitToUpdate._id}`,
            {
                status: 'Reserved',
                customerInfo: {
                    name: 'Jane Smith',
                    phone: '+0987654321',
                    email: 'jane.smith@example.com'
                }
            }
        );

        if (!updateUnitResponse.data.success) {
            console.log('❌ Failed to update unit:', updateUnitResponse.data.message);
            return;
        }

        console.log('✅ Unit updated successfully to Reserved status');

        // Step 7: Delete a unit
        console.log('\n7️⃣ Deleting a unit...');
        const unitToDelete = updatedFloor.units.find(u => u.unitNumber === 'A102');
        
        const deleteUnitResponse = await axios.delete(
            `${domain}/api/building/units?buildingId=${building._id}&floorId=${testFloor._id}&unitId=${unitToDelete._id}`
        );

        if (!deleteUnitResponse.data.success) {
            console.log('❌ Failed to delete unit:', deleteUnitResponse.data.message);
            return;
        }

        console.log('✅ Unit deleted successfully');

        // Step 8: Final verification
        console.log('\n8️⃣ Final verification...');
        const finalFloorsResponse = await axios.get(`${domain}/api/floors?buildingId=${building._id}`);
        const finalFloor = finalFloorsResponse.data.data.find(f => f._id === testFloor._id);
        
        console.log(`✅ Final state: ${finalFloor.totalUnits} total units, ${finalFloor.totalBookedUnits} booked`);
        console.log(`✅ Remaining units: ${finalFloor.units.map(u => `${u.unitNumber} (${u.status})`).join(', ')}`);

        console.log('\n🎉 Units Management Test Completed Successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testUnitsManagement();