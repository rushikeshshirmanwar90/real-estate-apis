const axios = require('axios');

// Test if MaterialActivity API is accessible
async function testMaterialActivityApiAccess() {
    console.log('\n========================================');
    console.log('🔍 TESTING MATERIALACTIVITY API ACCESS');
    console.log('========================================');

    const domain = 'http://localhost:8080';
    
    try {
        console.log('\n1️⃣ Testing MaterialActivity API GET endpoint...');
        
        // Test the API endpoint
        const testUrl = `${domain}/api/materialActivity?clientId=6941b27c7fdcea3d37e02ada&limit=5`;
        console.log('Testing URL:', testUrl);
        
        const response = await axios.get(testUrl);
        
        console.log('✅ API Response Status:', response.status);
        console.log('✅ API Response Headers:', Object.keys(response.headers));
        console.log('✅ API Response Data Structure:', Object.keys(response.data));
        console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
        
        console.log('\n2️⃣ Testing MaterialActivity API POST endpoint...');
        
        const testData = {
            clientId: '6941b27c7fdcea3d37e02ada',
            projectId: 'test-project-123',
            materials: [{
                name: 'Test Material',
                unit: 'kg',
                specs: { grade: 'A' },
                qnt: 10,
                cost: 100
            }],
            message: 'Test material activity',
            activity: 'used',
            user: {
                userId: 'test-user-123',
                fullName: 'Test User'
            },
            date: new Date().toISOString()
        };
        
        const postResponse = await axios.post(`${domain}/api/materialActivity`, testData);
        
        console.log('✅ POST Response Status:', postResponse.status);
        console.log('✅ POST Response Data:', JSON.stringify(postResponse.data, null, 2));
        
        console.log('\n3️⃣ Verifying the created activity...');
        
        const verifyResponse = await axios.get(`${domain}/api/materialActivity?clientId=6941b27c7fdcea3d37e02ada&limit=5`);
        console.log('✅ Verify Response Status:', verifyResponse.status);
        
        const activities = verifyResponse.data.data?.activities || verifyResponse.data || [];
        console.log('✅ Total activities found:', activities.length);
        
        if (activities.length > 0) {
            const latestActivity = activities[0];
            console.log('✅ Latest activity:');
            console.log('   - ID:', latestActivity._id);
            console.log('   - Activity:', latestActivity.activity);
            console.log('   - User:', latestActivity.user.fullName);
            console.log('   - Materials:', latestActivity.materials.length);
            console.log('   - Message:', latestActivity.message);
            console.log('   - ClientId:', latestActivity.clientId);
            console.log('   - Date:', latestActivity.date);
        }
        
        console.log('\n✅ MATERIALACTIVITY API IS WORKING CORRECTLY!');
        
    } catch (error) {
        console.error('\n❌ MATERIALACTIVITY API ERROR:');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        console.error('URL:', error.config?.url);
        
        if (error.response?.status === 404) {
            console.log('\n💡 API ENDPOINT NOT FOUND');
            console.log('This suggests the MaterialActivity API route is not accessible');
            console.log('Possible causes:');
            console.log('1. Next.js server is not running');
            console.log('2. Route file is in wrong location');
            console.log('3. Route file has syntax errors');
            console.log('4. (Xsite) folder routing issue');
        } else if (error.response?.status === 500) {
            console.log('\n💡 SERVER ERROR');
            console.log('This suggests the API route exists but has internal errors');
            console.log('Check server logs for detailed error information');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 CONNECTION REFUSED');
            console.log('The Next.js server is not running on localhost:3000');
            console.log('Start the server with: npm run dev');
        }
    }

    console.log('\n========================================');
    console.log('🏁 MATERIALACTIVITY API ACCESS TEST COMPLETED');
    console.log('========================================\n');
}

// Run the test
testMaterialActivityApiAccess().catch(console.error);