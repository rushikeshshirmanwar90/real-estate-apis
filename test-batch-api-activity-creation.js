const axios = require('axios');

// Test that the batch API creates MaterialActivity records correctly
async function testBatchAPIActivityCreation() {
    console.log('\n🧪 TESTING BATCH API MATERIAL ACTIVITY CREATION');
    console.log('='.repeat(60));
    
    const domain = 'http://localhost:8080';
    const clientId = '6941b27c7fdcea3d37e02ada';
    const projectId = '6941b27c7fdcea3d37e02adb'; // Use a known project ID
    
    try {
        // 1. Get current count of material activities
        console.log('\n1️⃣ GETTING CURRENT MATERIAL ACTIVITY COUNT');
        console.log('-'.repeat(40));
        
        const beforeResponse = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=1000`);
        const beforeCount = beforeResponse.data.data?.activities?.length || 0;
        console.log('✅ Current material activities in DB:', beforeCount);
        
        // 2. Test the batch API with a simple material usage
        console.log('\n2️⃣ TESTING BATCH API CALL');
        console.log('-'.repeat(40));
        
        const testPayload = {
            projectId: projectId,
            sectionId: 'test-section-' + Date.now(),
            miniSectionId: 'test-mini-section-' + Date.now(),
            clientId: clientId,
            user: {
                userId: 'test-user-123',
                fullName: 'Test User for Batch API'
            },
            materialUsages: [
                {
                    materialId: '6941b27c7fdcea3d37e02ae0', // Use a known material ID
                    quantity: 5
                }
            ]
        };
        
        console.log('📤 Sending batch API request...');
        console.log('Payload:', JSON.stringify(testPayload, null, 2));
        
        const batchResponse = await axios.post(`${domain}/api/material-usage-batch`, testPayload);
        
        console.log('✅ Batch API Response Status:', batchResponse.status);
        console.log('✅ Batch API Success:', batchResponse.data.success);
        console.log('✅ Batch API Message:', batchResponse.data.message);
        
        if (batchResponse.data.success) {
            console.log('✅ Materials processed:', batchResponse.data.data?.usedMaterials?.length || 0);
            console.log('✅ Total cost:', batchResponse.data.data?.totalCostOfUsedMaterials || 0);
        }
        
        // 3. Wait a moment for the activity to be saved
        console.log('\n⏳ Waiting 2 seconds for activity to be saved...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 4. Check if new material activity was created
        console.log('\n3️⃣ CHECKING IF MATERIAL ACTIVITY WAS CREATED');
        console.log('-'.repeat(40));
        
        const afterResponse = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=1000`);
        const afterCount = afterResponse.data.data?.activities?.length || 0;
        console.log('✅ Material activities after batch API:', afterCount);
        console.log('✅ New activities created:', afterCount - beforeCount);
        
        if (afterCount > beforeCount) {
            console.log('🎉 SUCCESS! Batch API created new MaterialActivity record(s)');
            
            // Find the newest activity
            const activities = afterResponse.data.data.activities;
            const newestActivity = activities[0]; // Should be sorted by newest first
            
            console.log('\n📋 NEWEST MATERIAL ACTIVITY:');
            console.log('   - ID:', newestActivity._id);
            console.log('   - Activity:', newestActivity.activity);
            console.log('   - User:', newestActivity.user?.fullName || 'Unknown');
            console.log('   - Materials:', newestActivity.materials?.length || 0);
            console.log('   - Message:', newestActivity.message || 'No message');
            console.log('   - Date:', newestActivity.date || newestActivity.createdAt);
            console.log('   - Client ID:', newestActivity.clientId);
            console.log('   - Project ID:', newestActivity.projectId);
            
            if (newestActivity.materials?.length > 0) {
                console.log('   - First Material:');
                const firstMaterial = newestActivity.materials[0];
                console.log('     - Name:', firstMaterial.name);
                console.log('     - Quantity:', firstMaterial.qnt);
                console.log('     - Unit:', firstMaterial.unit);
                console.log('     - Cost:', firstMaterial.cost);
            }
        } else {
            console.log('❌ PROBLEM: Batch API did not create MaterialActivity record!');
            console.log('   Check the batch API logs to see if MaterialActivity.save() failed.');
        }
        
        // 5. Test notification page would show this activity
        console.log('\n4️⃣ TESTING NOTIFICATION PAGE WOULD SHOW THIS ACTIVITY');
        console.log('-'.repeat(40));
        
        const notificationResponse = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&paginationMode=date&dateLimit=1`);
        
        if (notificationResponse.data.success && notificationResponse.data.data?.dateGroups?.length > 0) {
            const todayGroup = notificationResponse.data.data.dateGroups[0];
            const todayUsedActivities = todayGroup.activities.filter(activity => activity.activity === 'used');
            
            console.log('✅ Today\'s date group:', todayGroup.date);
            console.log('✅ Total activities today:', todayGroup.activities.length);
            console.log('✅ "Used" activities today:', todayUsedActivities.length);
            
            if (todayUsedActivities.length > 0) {
                console.log('🎉 SUCCESS! Notification page would show the new "used" activity');
                
                // Check if our test activity is in there
                const ourActivity = todayUsedActivities.find(activity => 
                    activity.user?.fullName === 'Test User for Batch API'
                );
                
                if (ourActivity) {
                    console.log('✅ Found our test activity in today\'s "used" activities!');
                    console.log('   - Message:', ourActivity.message);
                    console.log('   - Materials:', ourActivity.materials?.length || 0);
                } else {
                    console.log('⚠️ Our test activity not found in today\'s activities (might be timing issue)');
                }
            } else {
                console.log('❌ No "used" activities found for today - notification page would be empty');
            }
        } else {
            console.log('❌ Notification API failed or returned no date groups');
        }
        
        console.log('\n✅ BATCH API ACTIVITY CREATION TEST COMPLETED');
        
    } catch (error) {
        console.error('\n❌ BATCH API TEST FAILED:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        console.error('Stack:', error.stack);
    }
}

// Run the test
testBatchAPIActivityCreation();