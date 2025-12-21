const axios = require('axios');

// Debug why material activities are not showing in notification page
async function debugNotificationIssue() {
    console.log('\n========================================');
    console.log('🔍 DEBUGGING NOTIFICATION PAGE ISSUE');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    
    try {
        // Step 1: Test if we can get a clientId (this is what notification page does)
        console.log('\n1️⃣ Testing clientId retrieval...');
        
        // We can't directly test getClientId() from here, so let's use a test clientId
        const testClientId = 'test-client-123'; // Replace with actual clientId from your app
        console.log('Using test clientId:', testClientId);

        // Step 2: Test the exact API calls that notification page makes
        console.log('\n2️⃣ Testing notification page API calls...');
        
        // Test date-based pagination (primary method)
        console.log('Testing date-based pagination...');
        const materialParams = new URLSearchParams({
            clientId: testClientId,
            paginationMode: 'date',
            dateLimit: '10'
        });
        
        const dateBasedRes = await axios.get(`${domain}/api/materialActivity?${materialParams.toString()}`);
        console.log('✅ Date-based API Status:', dateBasedRes.status);
        console.log('✅ Date-based Response Structure:', Object.keys(dateBasedRes.data));
        
        if (dateBasedRes.data.data?.dateGroups) {
            console.log('✅ Date groups found:', dateBasedRes.data.data.dateGroups.length);
            dateBasedRes.data.data.dateGroups.forEach((group, index) => {
                console.log(`   Date ${index + 1}: ${group.date} - ${group.activities.length} activities`);
            });
        } else {
            console.log('⚠️ No date groups found');
            console.log('Response data:', JSON.stringify(dateBasedRes.data, null, 2));
        }

        // Test traditional pagination (fallback method)
        console.log('\nTesting traditional pagination fallback...');
        const traditionalRes = await axios.get(`${domain}/api/materialActivity?clientId=${testClientId}&limit=50`);
        console.log('✅ Traditional API Status:', traditionalRes.status);
        console.log('✅ Traditional Response Structure:', Object.keys(traditionalRes.data));
        
        let traditionalActivities = [];
        if (Array.isArray(traditionalRes.data)) {
            traditionalActivities = traditionalRes.data;
        } else if (traditionalRes.data.data?.activities) {
            traditionalActivities = traditionalRes.data.data.activities;
        } else if (traditionalRes.data.activities) {
            traditionalActivities = traditionalRes.data.activities;
        }
        
        console.log('✅ Traditional activities found:', traditionalActivities.length);
        
        if (traditionalActivities.length > 0) {
            console.log('\n📋 Sample activities:');
            traditionalActivities.slice(0, 3).forEach((activity, index) => {
                console.log(`   ${index + 1}. Activity: ${activity.activity}`);
                console.log(`      User: ${activity.user.fullName}`);
                console.log(`      Materials: ${activity.materials.length}`);
                console.log(`      Client ID: ${activity.clientId}`);
                console.log(`      Date: ${activity.date || activity.createdAt}`);
            });
        }

        // Step 3: Test without clientId filter (to see all activities)
        console.log('\n3️⃣ Testing without clientId filter...');
        
        const allActivitiesRes = await axios.get(`${domain}/api/materialActivity?limit=10`);
        console.log('✅ All activities API Status:', allActivitiesRes.status);
        
        let allActivities = [];
        if (Array.isArray(allActivitiesRes.data)) {
            allActivities = allActivitiesRes.data;
        } else if (allActivitiesRes.data.data?.activities) {
            allActivities = allActivitiesRes.data.data.activities;
        } else if (allActivitiesRes.data.activities) {
            allActivities = allActivitiesRes.data.activities;
        }
        
        console.log('✅ Total activities in database:', allActivities.length);
        
        if (allActivities.length > 0) {
            console.log('\n📋 All activities by clientId:');
            const clientGroups = {};
            allActivities.forEach(activity => {
                const clientId = activity.clientId || 'no-client';
                if (!clientGroups[clientId]) {
                    clientGroups[clientId] = 0;
                }
                clientGroups[clientId]++;
            });
            
            Object.entries(clientGroups).forEach(([clientId, count]) => {
                console.log(`   Client ${clientId}: ${count} activities`);
            });
        }

        // Step 4: Create a test activity with the correct clientId
        console.log('\n4️⃣ Creating test activity with correct clientId...');
        
        const testActivity = {
            clientId: testClientId,
            projectId: 'test-project-456',
            materials: [
                {
                    name: 'Debug Test Material',
                    unit: 'pieces',
                    specs: { type: 'test' },
                    qnt: 1,
                    cost: 50
                }
            ],
            message: 'Debug test activity for notification page',
            activity: 'used',
            user: {
                userId: 'debug-user-123',
                fullName: 'Debug User'
            },
            date: new Date().toISOString()
        };

        const createRes = await axios.post(`${domain}/api/materialActivity`, testActivity);
        console.log('✅ Test activity created:', createRes.status);
        console.log('✅ Created activity ID:', createRes.data.data._id);

        // Step 5: Verify the test activity appears in filtered results
        console.log('\n5️⃣ Verifying test activity appears in filtered results...');
        
        const verifyRes = await axios.get(`${domain}/api/materialActivity?clientId=${testClientId}&limit=5`);
        console.log('✅ Verify API Status:', verifyRes.status);
        
        let verifyActivities = [];
        if (Array.isArray(verifyRes.data)) {
            verifyActivities = verifyRes.data;
        } else if (verifyRes.data.data?.activities) {
            verifyActivities = verifyRes.data.data.activities;
        } else if (verifyRes.data.activities) {
            verifyActivities = verifyRes.data.activities;
        }
        
        console.log('✅ Activities for test clientId:', verifyActivities.length);
        
        const testActivityFound = verifyActivities.find(a => a.message?.includes('Debug test activity'));
        if (testActivityFound) {
            console.log('✅ Test activity found in filtered results!');
            console.log('   This means the API filtering is working correctly.');
        } else {
            console.log('❌ Test activity not found in filtered results');
            console.log('   This suggests an issue with the API filtering');
        }

        // Step 6: Recommendations
        console.log('\n6️⃣ RECOMMENDATIONS:');
        
        if (allActivities.length === 0) {
            console.log('❌ No MaterialActivities found in database');
            console.log('💡 The batch API might not be creating activities correctly');
            console.log('💡 Check the batch API logs when you use the material usage form');
        } else if (traditionalActivities.length === 0) {
            console.log('❌ No activities found for the test clientId');
            console.log('💡 Make sure you are using the correct clientId in the notification page');
            console.log('💡 Check what clientId your app is actually using');
        } else {
            console.log('✅ Activities found for clientId');
            console.log('💡 The issue might be in the notification page UI rendering');
            console.log('💡 Check the browser console for JavaScript errors');
            console.log('💡 Make sure the notification page is calling fetchActivities() correctly');
        }

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        console.error('URL:', error.config?.url);
    }

    console.log('\n========================================');
    console.log('🏁 DEBUG COMPLETED');
    console.log('========================================\n');
}

// Run the debug
debugNotificationIssue().catch(console.error);