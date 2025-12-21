const axios = require('axios');

// Test the complete flow: batch API -> MaterialActivity creation -> notification page display
async function testCompleteMaterialActivityFlow() {
    console.log('\n========================================');
    console.log('🧪 TESTING COMPLETE MATERIAL ACTIVITY FLOW');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    
    // You need to replace these with actual values from your database
    const testData = {
        projectId: '6756b8b4b0b5b4b5b4b5b4b5', // Replace with actual project ID
        sectionId: '6756b8b4b0b5b4b5b4b5b4b6',  // Replace with actual section ID
        miniSectionId: '6756b8b4b0b5b4b5b4b5b4b7', // Replace with actual mini-section ID
        clientId: '6756b8b4b0b5b4b5b4b5b4b8',    // Replace with actual client ID
        user: {
            userId: '6756b8b4b0b5b4b5b4b5b4b9',
            fullName: 'Test User'
        },
        materialUsages: [
            {
                materialId: '6756b8b4b0b5b4b5b4b5b4ba', // Replace with actual material ID
                quantity: 5
            }
        ]
    };

    try {
        console.log('\n1️⃣ STEP 1: Check MaterialActivity API is working...');
        
        // Test the MaterialActivity API directly
        const materialApiTest = await axios.get(`${domain}/api/materialActivity?limit=5`);
        console.log('✅ MaterialActivity API Status:', materialApiTest.status);
        console.log('✅ MaterialActivity API Response Structure:', Object.keys(materialApiTest.data));
        
        // Count existing activities
        let existingCount = 0;
        if (materialApiTest.data.data?.activities) {
            existingCount = materialApiTest.data.data.activities.length;
        } else if (Array.isArray(materialApiTest.data)) {
            existingCount = materialApiTest.data.length;
        }
        console.log('✅ Existing MaterialActivities:', existingCount);

        console.log('\n2️⃣ STEP 2: Call batch material usage API...');
        
        // Call the batch API
        const batchResponse = await axios.post(`${domain}/api/material-usage-batch`, testData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        
        console.log('✅ Batch API Status:', batchResponse.status);
        console.log('✅ Batch API Success:', batchResponse.data.success);
        console.log('✅ Batch API Message:', batchResponse.data.message);

        console.log('\n3️⃣ STEP 3: Check if MaterialActivity was created...');
        
        // Wait a moment for the activity to be saved
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check MaterialActivity API again
        const afterBatchTest = await axios.get(`${domain}/api/materialActivity?limit=10`);
        console.log('✅ After Batch API Status:', afterBatchTest.status);
        
        let newCount = 0;
        let activities = [];
        if (afterBatchTest.data.data?.activities) {
            activities = afterBatchTest.data.data.activities;
            newCount = activities.length;
        } else if (Array.isArray(afterBatchTest.data)) {
            activities = afterBatchTest.data;
            newCount = activities.length;
        }
        
        console.log('✅ MaterialActivities after batch call:', newCount);
        console.log('✅ New activities created:', Math.max(0, newCount - existingCount));
        
        if (activities.length > 0) {
            const latestActivity = activities[0];
            console.log('\n📋 Latest MaterialActivity:');
            console.log('   - ID:', latestActivity._id);
            console.log('   - Activity Type:', latestActivity.activity);
            console.log('   - User:', latestActivity.user.fullName);
            console.log('   - Client ID:', latestActivity.clientId);
            console.log('   - Project ID:', latestActivity.projectId);
            console.log('   - Materials Count:', latestActivity.materials.length);
            console.log('   - Message:', latestActivity.message);
            console.log('   - Date:', latestActivity.date);
            
            // Check if it matches our test data
            if (latestActivity.clientId === testData.clientId && 
                latestActivity.projectId === testData.projectId &&
                latestActivity.activity === 'used') {
                console.log('✅ Activity matches our batch API call!');
            } else {
                console.log('⚠️ Activity does not match our batch API call');
                console.log('   Expected clientId:', testData.clientId);
                console.log('   Expected projectId:', testData.projectId);
                console.log('   Expected activity: used');
            }
        }

        console.log('\n4️⃣ STEP 4: Test notification page API calls...');
        
        // Test the same API calls that notification page makes
        console.log('Testing traditional pagination...');
        const traditionalRes = await axios.get(`${domain}/api/materialActivity?clientId=${testData.clientId}&limit=50`);
        console.log('✅ Traditional pagination status:', traditionalRes.status);
        
        const traditionalActivities = traditionalRes.data.data?.activities || traditionalRes.data || [];
        console.log('✅ Traditional pagination activities:', traditionalActivities.length);
        
        console.log('Testing date-based pagination...');
        const dateRes = await axios.get(`${domain}/api/materialActivity?clientId=${testData.clientId}&paginationMode=date&dateLimit=10`);
        console.log('✅ Date pagination status:', dateRes.status);
        console.log('✅ Date pagination structure:', Object.keys(dateRes.data));
        
        if (dateRes.data.data?.dateGroups) {
            console.log('✅ Date groups found:', dateRes.data.data.dateGroups.length);
            dateRes.data.data.dateGroups.forEach((group, index) => {
                console.log(`   Date ${index + 1}: ${group.date} - ${group.activities.length} activities`);
                group.activities.forEach((activity, actIndex) => {
                    console.log(`     Activity ${actIndex + 1}: ${activity.activity} - ${activity.materials.length} materials`);
                });
            });
        } else {
            console.log('⚠️ No date groups found in response');
            console.log('Response data:', JSON.stringify(dateRes.data, null, 2));
        }

        console.log('\n5️⃣ STEP 5: Summary and recommendations...');
        
        if (newCount > existingCount) {
            console.log('✅ SUCCESS: MaterialActivity was created by batch API');
            
            if (traditionalActivities.length > 0) {
                console.log('✅ SUCCESS: MaterialActivity can be fetched with traditional pagination');
            } else {
                console.log('❌ ISSUE: MaterialActivity not found with traditional pagination');
            }
            
            if (dateRes.data.data?.dateGroups && dateRes.data.data.dateGroups.length > 0) {
                console.log('✅ SUCCESS: MaterialActivity can be fetched with date pagination');
                console.log('🎉 The notification page should be able to display the activity!');
            } else {
                console.log('❌ ISSUE: MaterialActivity not found with date pagination');
                console.log('💡 This might be why the notification page is not showing activities');
            }
        } else {
            console.log('❌ ISSUE: No new MaterialActivity was created by batch API');
            console.log('💡 Check the batch API logs for errors in activity creation');
        }

    } catch (error) {
        console.error('\n❌ ERROR OCCURRED:');
        console.error('Error:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        console.error('URL:', error.config?.url);
        
        if (error.response?.status === 404) {
            console.log('\n💡 TROUBLESHOOTING TIPS:');
            console.log('- Make sure the project, section, and material IDs exist in your database');
            console.log('- Check that the materials have sufficient quantity available');
            console.log('- Verify the clientId is correct');
            console.log('- Make sure the Next.js server is running on localhost:3000');
        }
    }

    console.log('\n========================================');
    console.log('🏁 COMPLETE FLOW TEST FINISHED');
    console.log('========================================\n');
}

// Run the test
testCompleteMaterialActivityFlow().catch(console.error);