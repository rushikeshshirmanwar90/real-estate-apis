const axios = require('axios');

// Test to verify clientId consistency between batch API and notification page
async function testClientIdConsistency() {
    console.log('\n========================================');
    console.log('🔍 TESTING CLIENTID CONSISTENCY');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    
    try {
        console.log('\n1️⃣ Testing current MaterialActivities in database...');
        
        // Get all activities to see what clientIds exist
        const allActivitiesRes = await axios.get(`${domain}/api/materialActivity?limit=20`);
        console.log('✅ API Status:', allActivitiesRes.status);
        
        let allActivities = [];
        if (Array.isArray(allActivitiesRes.data)) {
            allActivities = allActivitiesRes.data;
        } else if (allActivitiesRes.data.data?.activities) {
            allActivities = allActivitiesRes.data.data.activities;
        } else if (allActivitiesRes.data.activities) {
            allActivities = allActivitiesRes.data.activities;
        }
        
        console.log('✅ Total activities found:', allActivities.length);
        
        if (allActivities.length > 0) {
            console.log('\n📋 ClientIds in existing activities:');
            const clientIdCounts = {};
            
            allActivities.forEach((activity, index) => {
                const clientId = activity.clientId || 'EMPTY';
                if (!clientIdCounts[clientId]) {
                    clientIdCounts[clientId] = 0;
                }
                clientIdCounts[clientId]++;
                
                if (index < 5) { // Show first 5 activities
                    console.log(`   Activity ${index + 1}:`);
                    console.log(`     - ID: ${activity._id}`);
                    console.log(`     - ClientId: "${activity.clientId}" (${activity.clientId ? 'NOT EMPTY' : 'EMPTY'})`);
                    console.log(`     - User: ${activity.user.fullName}`);
                    console.log(`     - Activity: ${activity.activity}`);
                    console.log(`     - Date: ${activity.date || activity.createdAt}`);
                }
            });
            
            console.log('\n📊 ClientId distribution:');
            Object.entries(clientIdCounts).forEach(([clientId, count]) => {
                console.log(`   "${clientId}": ${count} activities`);
            });
        }

        console.log('\n2️⃣ Testing with the fallback clientId from getClientId...');
        
        // Test with the fallback clientId that getClientId() uses
        const fallbackClientId = '6941b27c7fdcea3d37e02ada';
        
        const fallbackRes = await axios.get(`${domain}/api/materialActivity?clientId=${fallbackClientId}&limit=10`);
        console.log('✅ Fallback clientId API Status:', fallbackRes.status);
        
        let fallbackActivities = [];
        if (Array.isArray(fallbackRes.data)) {
            fallbackActivities = fallbackRes.data;
        } else if (fallbackRes.data.data?.activities) {
            fallbackActivities = fallbackRes.data.data.activities;
        } else if (fallbackRes.data.activities) {
            fallbackActivities = fallbackRes.data.activities;
        }
        
        console.log('✅ Activities for fallback clientId:', fallbackActivities.length);
        
        if (fallbackActivities.length > 0) {
            console.log('✅ Found activities with fallback clientId!');
            console.log('   This means the notification page should be able to see them');
        } else {
            console.log('❌ No activities found with fallback clientId');
            console.log('   This suggests activities are being created with a different clientId');
        }

        console.log('\n3️⃣ Creating test activity with fallback clientId...');
        
        const testActivity = {
            clientId: fallbackClientId,
            projectId: 'test-project-consistency',
            materials: [
                {
                    name: 'Consistency Test Material',
                    unit: 'units',
                    specs: { test: 'consistency' },
                    qnt: 1,
                    cost: 100
                }
            ],
            message: 'Test activity for clientId consistency check',
            activity: 'used',
            user: {
                userId: 'consistency-test-user',
                fullName: 'Consistency Test User'
            },
            date: new Date().toISOString()
        };

        const createRes = await axios.post(`${domain}/api/materialActivity`, testActivity);
        console.log('✅ Test activity created:', createRes.status);
        console.log('✅ Created activity ID:', createRes.data.data._id);

        console.log('\n4️⃣ Verifying test activity appears with fallback clientId...');
        
        const verifyRes = await axios.get(`${domain}/api/materialActivity?clientId=${fallbackClientId}&limit=5`);
        console.log('✅ Verify API Status:', verifyRes.status);
        
        let verifyActivities = [];
        if (Array.isArray(verifyRes.data)) {
            verifyActivities = verifyRes.data;
        } else if (verifyRes.data.data?.activities) {
            verifyActivities = verifyRes.data.data.activities;
        } else if (verifyRes.data.activities) {
            verifyActivities = verifyRes.data.activities;
        }
        
        console.log('✅ Activities after creating test:', verifyActivities.length);
        
        const testActivityFound = verifyActivities.find(a => a.message?.includes('clientId consistency check'));
        if (testActivityFound) {
            console.log('✅ Test activity found! ClientId consistency is working.');
        } else {
            console.log('❌ Test activity not found. There might be an issue with clientId handling.');
        }

        console.log('\n5️⃣ Testing date-based pagination with fallback clientId...');
        
        const dateRes = await axios.get(`${domain}/api/materialActivity?clientId=${fallbackClientId}&paginationMode=date&dateLimit=10`);
        console.log('✅ Date pagination API Status:', dateRes.status);
        
        if (dateRes.data.data?.dateGroups && dateRes.data.data.dateGroups.length > 0) {
            console.log('✅ Date groups found:', dateRes.data.data.dateGroups.length);
            console.log('✅ This means the notification page should show activities!');
            
            dateRes.data.data.dateGroups.forEach((group, index) => {
                console.log(`   Date ${index + 1}: ${group.date} - ${group.activities.length} activities`);
            });
        } else {
            console.log('❌ No date groups found');
            console.log('   Response:', JSON.stringify(dateRes.data, null, 2));
        }

        console.log('\n6️⃣ SUMMARY AND RECOMMENDATIONS:');
        
        if (fallbackActivities.length > 0 || testActivityFound) {
            console.log('✅ SUCCESS: Activities exist with the correct clientId');
            console.log('💡 The notification page should be able to display them');
            console.log('💡 If you still don\'t see activities, check:');
            console.log('   - Browser console for JavaScript errors');
            console.log('   - Network tab to see if API calls are being made');
            console.log('   - Make sure you\'re on the correct tab (All/Materials/Used)');
        } else {
            console.log('❌ ISSUE: No activities found with the expected clientId');
            console.log('💡 This suggests:');
            console.log('   - The batch API might be using a different clientId');
            console.log('   - Or activities are not being created at all');
            console.log('   - Check the batch API logs when using the material form');
        }

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
    }

    console.log('\n========================================');
    console.log('🏁 CLIENTID CONSISTENCY TEST COMPLETED');
    console.log('========================================\n');
}

// Run the test
testClientIdConsistency().catch(console.error);