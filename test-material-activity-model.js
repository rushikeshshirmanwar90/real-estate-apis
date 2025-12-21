const axios = require('axios');

// Test MaterialActivity model directly
async function testMaterialActivityModel() {
    console.log('\n========================================');
    console.log('🧪 TESTING MATERIALACTIVITY MODEL');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    
    try {
        console.log('\n1️⃣ Testing MaterialActivity API GET...');
        
        const getResponse = await axios.get(`${domain}/api/materialActivity?limit=5`);
        console.log('✅ GET Status:', getResponse.status);
        console.log('✅ GET Response Structure:', Object.keys(getResponse.data));
        console.log('✅ GET Response:', JSON.stringify(getResponse.data, null, 2));

        console.log('\n2️⃣ Testing MaterialActivity API POST...');
        
        const testActivity = {
            clientId: 'test-client-123',
            projectId: 'test-project-123',
            materials: [
                {
                    name: 'Test Material',
                    unit: 'kg',
                    specs: { grade: 'A' },
                    qnt: 10,
                    cost: 100
                }
            ],
            message: 'Test activity from model test',
            activity: 'used',
            user: {
                userId: 'test-user-123',
                fullName: 'Test User'
            },
            date: new Date().toISOString()
        };

        const postResponse = await axios.post(`${domain}/api/materialActivity`, testActivity);
        console.log('✅ POST Status:', postResponse.status);
        console.log('✅ POST Response:', JSON.stringify(postResponse.data, null, 2));

        console.log('\n3️⃣ Verifying the created activity...');
        
        const verifyResponse = await axios.get(`${domain}/api/materialActivity?limit=1`);
        console.log('✅ Verify Status:', verifyResponse.status);
        
        const activities = verifyResponse.data.data?.activities || verifyResponse.data || [];
        if (activities.length > 0) {
            const latestActivity = activities[0];
            console.log('✅ Latest Activity:');
            console.log('   - ID:', latestActivity._id);
            console.log('   - Activity:', latestActivity.activity);
            console.log('   - User:', latestActivity.user.fullName);
            console.log('   - Materials:', latestActivity.materials.length);
            console.log('   - Message:', latestActivity.message);
        } else {
            console.log('❌ No activities found');
        }

        console.log('\n4️⃣ Testing with clientId filter...');
        
        const filterResponse = await axios.get(`${domain}/api/materialActivity?clientId=test-client-123&limit=5`);
        console.log('✅ Filter Status:', filterResponse.status);
        
        const filteredActivities = filterResponse.data.data?.activities || filterResponse.data || [];
        console.log('✅ Filtered Activities Count:', filteredActivities.length);

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        
        if (error.response?.status === 404) {
            console.log('\n💡 The MaterialActivity API endpoint might not be accessible');
            console.log('   Check if the server is running and the route exists');
        }
    }

    console.log('\n========================================');
    console.log('🏁 MODEL TEST COMPLETED');
    console.log('========================================\n');
}

// Run the test
testMaterialActivityModel().catch(console.error);