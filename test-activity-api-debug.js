const axios = require('axios');

const domain = 'http://localhost:3000';
const clientId = '6941b27c7fdcea3d37e02ada';

async function debugActivityAPI() {
    console.log('🔍 Debugging Activity API - Staff Removal Issue');
    console.log('===============================================\n');

    try {
        // 1. Test basic activity API functionality
        console.log('1️⃣ Testing basic activity API...');
        
        const basicActivity = {
            user: {
                userId: 'test-user-123',
                fullName: 'Test User',
                email: 'test@example.com'
            },
            clientId: clientId,
            projectId: 'test-project-123',
            projectName: 'Test Project',
            activityType: 'test_activity',
            category: 'test',
            action: 'test',
            description: 'Test activity for debugging',
            message: 'This is a test activity',
            date: new Date().toISOString(),
            metadata: {
                test: true
            }
        };

        console.log('📝 Basic activity payload:');
        console.log(JSON.stringify(basicActivity, null, 2));

        try {
            const basicResponse = await axios.post(`${domain}/api/activity`, basicActivity);
            console.log(`✅ Basic activity created successfully: ${basicResponse.status}`);
        } catch (error) {
            console.error('❌ Basic activity failed:', error.response?.status, error.response?.data);
            console.error('❌ Full error:', error.message);
        }

        // 2. Test client validation
        console.log('\n2️⃣ Testing client validation...');
        
        try {
            const clientResponse = await axios.get(`${domain}/api/clients`);
            console.log(`✅ Clients API accessible: ${clientResponse.status}`);
            
            const clients = clientResponse.data?.data || clientResponse.data || [];
            console.log(`📊 Found ${clients.length} clients`);
            
            const testClient = clients.find(c => c._id === clientId);
            if (testClient) {
                console.log(`✅ Test client found: ${testClient.name || testClient.firstName || 'Unknown'}`);
            } else {
                console.log(`❌ Test client NOT found with ID: ${clientId}`);
                console.log('Available client IDs:');
                clients.slice(0, 5).forEach(c => {
                    console.log(`   - ${c._id}: ${c.name || c.firstName || 'Unknown'}`);
                });
            }
        } catch (error) {
            console.error('❌ Client validation failed:', error.response?.status, error.response?.data);
        }

        // 3. Test staff removal activity specifically
        console.log('\n3️⃣ Testing staff removal activity...');
        
        const staffRemovalActivity = {
            user: {
                userId: 'admin-user-123',
                fullName: 'Admin User',
                email: 'admin@example.com'
            },
            clientId: clientId,
            projectId: 'project-123',
            projectName: 'Sample Project',
            activityType: 'staff_unassigned',
            category: 'staff',
            action: 'unassign',
            description: 'Removed John Doe from project "Sample Project"',
            message: 'Removed during project update',
            date: new Date().toISOString(),
            metadata: {
                staffName: 'John Doe'
            }
        };

        console.log('📝 Staff removal activity payload:');
        console.log(JSON.stringify(staffRemovalActivity, null, 2));

        try {
            const staffResponse = await axios.post(`${domain}/api/activity`, staffRemovalActivity);
            console.log(`✅ Staff removal activity created successfully: ${staffResponse.status}`);
            console.log(`✅ Activity ID: ${staffResponse.data.data._id}`);
        } catch (error) {
            console.error('❌ Staff removal activity failed:', error.response?.status);
            console.error('❌ Error data:', JSON.stringify(error.response?.data, null, 2));
            console.error('❌ Full error message:', error.message);
            
            // Additional debugging
            if (error.response?.status === 500) {
                console.error('🔍 500 Error Analysis:');
                console.error('   - This is a server error, not a client error');
                console.error('   - Check server logs for more details');
                console.error('   - Possible causes:');
                console.error('     * Database connection issues');
                console.error('     * Model validation errors');
                console.error('     * Missing required fields in Activity model');
                console.error('     * Client validation failing unexpectedly');
            }
        }

        // 4. Test with minimal payload
        console.log('\n4️⃣ Testing with minimal payload...');
        
        const minimalActivity = {
            user: {
                userId: 'test',
                fullName: 'Test User'
            },
            clientId: clientId,
            activityType: 'staff_unassigned',
            category: 'staff',
            action: 'unassign',
            description: 'Test removal message'
        };

        console.log('📝 Minimal activity payload:');
        console.log(JSON.stringify(minimalActivity, null, 2));

        try {
            const minimalResponse = await axios.post(`${domain}/api/activity`, minimalActivity);
            console.log(`✅ Minimal activity created successfully: ${minimalResponse.status}`);
        } catch (error) {
            console.error('❌ Minimal activity failed:', error.response?.status, error.response?.data);
        }

        // 5. Test activity retrieval
        console.log('\n5️⃣ Testing activity retrieval...');
        
        try {
            const getResponse = await axios.get(`${domain}/api/activity?clientId=${clientId}&category=staff&limit=5`);
            console.log(`✅ Activity retrieval successful: ${getResponse.status}`);
            
            const activities = getResponse.data?.data?.activities || getResponse.data?.activities || getResponse.data || [];
            console.log(`📊 Found ${activities.length} staff activities`);
            
            activities.forEach((activity, index) => {
                console.log(`   ${index + 1}. ${activity.activityType}: ${activity.description}`);
            });
        } catch (error) {
            console.error('❌ Activity retrieval failed:', error.response?.status, error.response?.data);
        }

        // 6. Test database connection
        console.log('\n6️⃣ Testing database connection...');
        
        try {
            // Test any simple API that uses database
            const dbTestResponse = await axios.get(`${domain}/api/staff?limit=1`);
            console.log(`✅ Database connection working: ${dbTestResponse.status}`);
        } catch (error) {
            console.error('❌ Database connection issue:', error.response?.status, error.response?.data);
        }

        console.log('\n🎯 DEBUGGING SUMMARY:');
        console.log('====================');
        console.log('1. Check the console output above for specific error details');
        console.log('2. If client validation fails, verify the clientId exists');
        console.log('3. If 500 errors persist, check server logs for database/model issues');
        console.log('4. Ensure all required fields are present in the activity payload');
        console.log('5. Verify the Activity model schema matches the payload structure');

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the debug test
debugActivityAPI();