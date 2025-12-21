const axios = require('axios');

// Test to understand the difference between Activity and MaterialActivity APIs
async function testActivityVsMaterialActivity() {
    console.log('\n========================================');
    console.log('🔍 TESTING ACTIVITY VS MATERIAL ACTIVITY');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    const clientId = '6941b27c7fdcea3d37e02ada'; // Fallback clientId
    
    try {
        console.log('\n1️⃣ Testing Activity API (regular activities)...');
        
        const activityRes = await axios.get(`${domain}/api/activity?clientId=${clientId}&limit=10`);
        console.log('✅ Activity API Status:', activityRes.status);
        console.log('✅ Activity API Response Structure:', Object.keys(activityRes.data));
        
        let activities = [];
        if (activityRes.data.data?.activities) {
            activities = activityRes.data.data.activities;
        } else if (activityRes.data.activities) {
            activities = activityRes.data.activities;
        }
        
        console.log('✅ Regular Activities Found:', activities.length);
        
        if (activities.length > 0) {
            console.log('\n📋 Sample Regular Activities:');
            activities.slice(0, 3).forEach((activity, index) => {
                console.log(`   ${index + 1}. ${activity.activityType} - ${activity.category}`);
                console.log(`      Description: ${activity.description}`);
                console.log(`      User: ${activity.user.fullName}`);
                console.log(`      Date: ${activity.date || activity.createdAt}`);
            });
        }

        console.log('\n2️⃣ Testing MaterialActivity API (material activities)...');
        
        const materialRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=10`);
        console.log('✅ MaterialActivity API Status:', materialRes.status);
        console.log('✅ MaterialActivity API Response Structure:', Object.keys(materialRes.data));
        
        let materialActivities = [];
        if (Array.isArray(materialRes.data)) {
            materialActivities = materialRes.data;
        } else if (materialRes.data.data?.activities) {
            materialActivities = materialRes.data.data.activities;
        } else if (materialRes.data.activities) {
            materialActivities = materialRes.data.activities;
        }
        
        console.log('✅ Material Activities Found:', materialActivities.length);
        
        if (materialActivities.length > 0) {
            console.log('\n📋 Sample Material Activities:');
            materialActivities.slice(0, 3).forEach((activity, index) => {
                console.log(`   ${index + 1}. ${activity.activity} - ${activity.materials.length} materials`);
                console.log(`      Message: ${activity.message}`);
                console.log(`      User: ${activity.user.fullName}`);
                console.log(`      Date: ${activity.date || activity.createdAt}`);
            });
        }

        console.log('\n3️⃣ Testing Date-based Pagination for both APIs...');
        
        // Test Activity API with date pagination
        console.log('\nTesting Activity API with date pagination...');
        const activityDateRes = await axios.get(`${domain}/api/activity?clientId=${clientId}&paginationMode=date&dateLimit=5`);
        console.log('✅ Activity Date API Status:', activityDateRes.status);
        
        const activityDateGroups = activityDateRes.data.data?.dateGroups || activityDateRes.data.dateGroups || [];
        console.log('✅ Activity Date Groups:', activityDateGroups.length);
        
        // Test MaterialActivity API with date pagination
        console.log('\nTesting MaterialActivity API with date pagination...');
        const materialDateRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&paginationMode=date&dateLimit=5`);
        console.log('✅ MaterialActivity Date API Status:', materialDateRes.status);
        
        const materialDateGroups = materialDateRes.data.data?.dateGroups || materialDateRes.data.dateGroups || [];
        console.log('✅ MaterialActivity Date Groups:', materialDateGroups.length);

        console.log('\n4️⃣ Analyzing the notification page behavior...');
        
        console.log('\n📊 ANALYSIS:');
        console.log('   - Regular Activities (Activity API):', activities.length);
        console.log('   - Material Activities (MaterialActivity API):', materialActivities.length);
        console.log('   - Activity Date Groups:', activityDateGroups.length);
        console.log('   - Material Date Groups:', materialDateGroups.length);
        
        console.log('\n🔍 NOTIFICATION PAGE BEHAVIOR:');
        console.log('   The notification page calls BOTH APIs:');
        console.log('   1. /api/activity - for project/section/staff activities');
        console.log('   2. /api/materialActivity - for material import/usage activities');
        console.log('   Then it merges them together for display.');
        
        if (activities.length === 0 && materialActivities.length === 0) {
            console.log('\n❌ ISSUE: No activities found in either API');
            console.log('💡 This means:');
            console.log('   - No regular activities (project/section/staff) have been logged');
            console.log('   - No material activities (import/usage) have been logged');
            console.log('   - The batch material usage API might not be creating MaterialActivity records');
        } else if (activities.length > 0 && materialActivities.length === 0) {
            console.log('\n⚠️ PARTIAL ISSUE: Regular activities found, but no material activities');
            console.log('💡 This suggests:');
            console.log('   - Regular activity logging is working');
            console.log('   - Material activity logging is not working');
            console.log('   - The batch material usage API is not creating MaterialActivity records');
        } else if (activities.length === 0 && materialActivities.length > 0) {
            console.log('\n⚠️ PARTIAL ISSUE: Material activities found, but no regular activities');
            console.log('💡 This suggests:');
            console.log('   - Material activity logging is working');
            console.log('   - Regular activity logging might not be implemented or working');
        } else {
            console.log('\n✅ SUCCESS: Both types of activities found');
            console.log('💡 The notification page should be showing activities');
            console.log('💡 If you still don\'t see them, check:');
            console.log('   - Browser console for JavaScript errors');
            console.log('   - Network tab to see if API calls are being made');
            console.log('   - Make sure you\'re on the correct tab in the notification page');
        }

        console.log('\n5️⃣ Testing specific material activity creation...');
        
        // Create a test material activity to verify the API works
        const testMaterialActivity = {
            clientId: clientId,
            projectId: 'test-project-debug',
            materials: [
                {
                    name: 'Debug Test Material',
                    unit: 'units',
                    specs: { test: 'debug' },
                    qnt: 1,
                    cost: 100
                }
            ],
            message: 'Debug test material activity',
            activity: 'used',
            user: {
                userId: 'debug-user',
                fullName: 'Debug User'
            },
            date: new Date().toISOString()
        };

        const createMaterialRes = await axios.post(`${domain}/api/materialActivity`, testMaterialActivity);
        console.log('✅ Test Material Activity Created:', createMaterialRes.status);
        console.log('✅ Created Activity ID:', createMaterialRes.data.data._id);

        // Verify it appears in the API
        const verifyMaterialRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=5`);
        const verifyMaterials = verifyMaterialRes.data.data?.activities || verifyMaterialRes.data || [];
        
        const testActivityFound = verifyMaterials.find(a => a.message?.includes('Debug test material activity'));
        if (testActivityFound) {
            console.log('✅ Test material activity found in API!');
            console.log('   This confirms MaterialActivity API is working');
        } else {
            console.log('❌ Test material activity not found in API');
            console.log('   This suggests an issue with MaterialActivity creation or retrieval');
        }

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        console.error('URL:', error.config?.url);
    }

    console.log('\n========================================');
    console.log('🏁 ACTIVITY VS MATERIAL ACTIVITY TEST COMPLETED');
    console.log('========================================\n');
}

// Run the test
testActivityVsMaterialActivity().catch(console.error);