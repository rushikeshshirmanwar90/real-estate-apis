const axios = require('axios');

const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';

async function testStaffClientFiltering() {
    console.log('🧪 Testing Staff Client Filtering Fix');
    console.log('=====================================');

    try {
        // Test 1: Try to fetch staff without clientId (should fail)
        console.log('\n1️⃣ Testing staff API without clientId (should fail)...');
        try {
            const response = await axios.get(`${domain}/api/staff`);
            console.log('❌ ERROR: API should have rejected request without clientId');
            console.log('Response:', response.data);
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.message?.includes('Client ID is required')) {
                console.log('✅ PASS: API correctly rejected request without clientId');
                console.log('Error message:', error.response.data.message);
            } else {
                console.log('❌ FAIL: Unexpected error response');
                console.log('Status:', error.response?.status);
                console.log('Message:', error.response?.data?.message);
            }
        }

        // Test 2: Try with invalid clientId format
        console.log('\n2️⃣ Testing staff API with invalid clientId format...');
        try {
            const response = await axios.get(`${domain}/api/staff?clientId=invalid-id`);
            console.log('❌ ERROR: API should have rejected invalid clientId format');
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.message?.includes('Invalid client ID format')) {
                console.log('✅ PASS: API correctly rejected invalid clientId format');
                console.log('Error message:', error.response.data.message);
            } else {
                console.log('❌ FAIL: Unexpected error response');
                console.log('Status:', error.response?.status);
                console.log('Message:', error.response?.data?.message);
            }
        }

        // Test 3: Try with non-existent clientId
        console.log('\n3️⃣ Testing staff API with non-existent clientId...');
        const fakeClientId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist
        try {
            const response = await axios.get(`${domain}/api/staff?clientId=${fakeClientId}`);
            console.log('❌ ERROR: API should have rejected non-existent clientId');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ PASS: API correctly rejected non-existent clientId');
                console.log('Error message:', error.response.data.message);
            } else {
                console.log('❌ FAIL: Unexpected error response');
                console.log('Status:', error.response?.status);
                console.log('Message:', error.response?.data?.message);
            }
        }

        // Test 4: Get list of existing clients to test with valid clientId
        console.log('\n4️⃣ Finding existing clients to test with...');
        let validClientId = null;
        try {
            // Try to get projects to find a valid clientId
            const projectsResponse = await axios.get(`${domain}/api/project`);
            if (projectsResponse.data && projectsResponse.data.length > 0) {
                validClientId = projectsResponse.data[0].clientId;
                console.log('✅ Found valid clientId from projects:', validClientId);
            }
        } catch (error) {
            console.log('⚠️  Could not get projects to find valid clientId');
        }

        // Test 5: Test with valid clientId
        if (validClientId) {
            console.log('\n5️⃣ Testing staff API with valid clientId...');
            try {
                const response = await axios.get(`${domain}/api/staff?clientId=${validClientId}`);
                console.log('✅ PASS: API accepted valid clientId');
                console.log('Staff count:', response.data.data?.length || 0);
                console.log('Message:', response.data.message);
                
                // Check if all returned staff have the correct clientId
                const staffData = response.data.data || [];
                const allHaveCorrectClientId = staffData.every(staff => staff.clientId === validClientId);
                
                if (allHaveCorrectClientId) {
                    console.log('✅ PASS: All returned staff belong to the correct client');
                } else {
                    console.log('❌ FAIL: Some staff belong to different clients!');
                    staffData.forEach((staff, index) => {
                        if (staff.clientId !== validClientId) {
                            console.log(`  Staff ${index + 1}: ${staff.firstName} ${staff.lastName} belongs to client ${staff.clientId} instead of ${validClientId}`);
                        }
                    });
                }
            } catch (error) {
                console.log('❌ FAIL: API rejected valid clientId');
                console.log('Status:', error.response?.status);
                console.log('Message:', error.response?.data?.message);
            }
        } else {
            console.log('⚠️  Skipping valid clientId test - no valid clientId found');
        }

        // Test 6: Test staff creation with clientId validation
        console.log('\n6️⃣ Testing staff creation without clientId (should fail)...');
        try {
            const newStaff = {
                firstName: 'Test',
                lastName: 'Staff',
                email: 'test.staff@example.com',
                phoneNumber: '1234567890',
                role: 'site-engineer'
                // Missing clientId
            };
            
            const response = await axios.post(`${domain}/api/staff`, newStaff);
            console.log('❌ ERROR: Staff creation should have failed without clientId');
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.message?.includes('Client ID is required')) {
                console.log('✅ PASS: Staff creation correctly rejected without clientId');
                console.log('Error message:', error.response.data.message);
            } else {
                console.log('❌ FAIL: Unexpected error response');
                console.log('Status:', error.response?.status);
                console.log('Message:', error.response?.data?.message);
            }
        }

        console.log('\n🎉 Staff Client Filtering Test Complete!');
        console.log('=====================================');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testStaffClientFiltering();