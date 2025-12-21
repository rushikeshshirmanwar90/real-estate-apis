const axios = require('axios');

// Test if the batch material usage API is actually creating MaterialActivity records
async function testBatchApiMaterialActivityCreation() {
    console.log('\n========================================');
    console.log('🧪 TESTING BATCH API MATERIAL ACTIVITY CREATION');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    const clientId = '6941b27c7fdcea3d37e02ada'; // Fallback clientId
    
    try {
        console.log('\n1️⃣ Step 1: Check current MaterialActivity count...');
        
        const initialRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=100`);
        console.log('✅ Initial API Status:', initialRes.status);
        
        let initialActivities = [];
        if (Array.isArray(initialRes.data)) {
            initialActivities = initialRes.data;
        } else if (initialRes.data.data?.activities) {
            initialActivities = initialRes.data.data.activities;
        } else if (initialRes.data.activities) {
            initialActivities = initialRes.data.activities;
        }
        
        console.log('✅ Initial MaterialActivity count:', initialActivities.length);

        console.log('\n2️⃣ Step 2: Test batch material usage API directly...');
        
        // Test the batch API with minimal data
        const batchTestData = {
            projectId: 'test-project-batch-123',
            sectionId: 'test-section-123',
            miniSectionId: 'test-mini-section-123',
            clientId: clientId,
            user: {
                userId: 'test-user-123',
                fullName: 'Test User'
            },
            materialUsages: [
                {
                    materialId: 'test-material-123',
                    quantity: 5
                }
            ]
        };

        console.log('📤 Calling batch API with test data...');
        console.log('Payload:', JSON.stringify(batchTestData, null, 2));

        try {
            const batchRes = await axios.post(`${domain}/api/material-usage-batch`, batchTestData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });
            
            console.log('✅ Batch API Status:', batchRes.status);
            console.log('✅ Batch API Success:', batchRes.data.success);
            console.log('✅ Batch API Message:', batchRes.data.message);
            
            if (batchRes.data.success) {
                console.log('✅ Batch API completed successfully');
            } else {
                console.log('❌ Batch API failed:', batchRes.data.error);
            }
            
        } catch (batchError) {
            console.error('❌ Batch API Error:', batchError.response?.data || batchError.message);
            console.error('❌ Batch API Status:', batchError.response?.status);
            
            if (batchError.response?.status === 404) {
                console.log('💡 This suggests the test materials/project don\'t exist');
                console.log('💡 The batch API needs real project and material IDs to work');
                console.log('💡 But we can still check if MaterialActivity logging code is present...');
            }
        }

        console.log('\n3️⃣ Step 3: Check if MaterialActivity count increased...');
        
        // Wait a moment for any async operations
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const afterRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=100`);
        console.log('✅ After API Status:', afterRes.status);
        
        let afterActivities = [];
        if (Array.isArray(afterRes.data)) {
            afterActivities = afterRes.data;
        } else if (afterRes.data.data?.activities) {
            afterActivities = afterRes.data.data.activities;
        } else if (afterRes.data.activities) {
            afterActivities = afterRes.data.activities;
        }
        
        console.log('✅ After MaterialActivity count:', afterActivities.length);
        console.log('✅ New activities created:', Math.max(0, afterActivities.length - initialActivities.length));

        if (afterActivities.length > initialActivities.length) {
            console.log('🎉 SUCCESS: MaterialActivity was created by batch API!');
            
            // Find the new activity
            const newActivities = afterActivities.slice(0, afterActivities.length - initialActivities.length);
            newActivities.forEach((activity, index) => {
                console.log(`\n📋 New Activity ${index + 1}:`);
                console.log('   - ID:', activity._id);
                console.log('   - Activity:', activity.activity);
                console.log('   - User:', activity.user.fullName);
                console.log('   - ClientId:', activity.clientId);
                console.log('   - Materials:', activity.materials.length);
                console.log('   - Message:', activity.message);
                console.log('   - Date:', activity.date);
            });
        } else {
            console.log('❌ NO NEW MATERIALACTIVITY CREATED');
            console.log('💡 This suggests the batch API is not creating MaterialActivity records');
            console.log('💡 Possible reasons:');
            console.log('   1. The batch API failed due to missing project/materials');
            console.log('   2. The MaterialActivity logging code has an error');
            console.log('   3. The MaterialActivity logging code is not being executed');
        }

        console.log('\n4️⃣ Step 4: Create MaterialActivity directly to test API...');
        
        // Create a MaterialActivity directly to verify the API works
        const directTestActivity = {
            clientId: clientId,
            projectId: 'direct-test-project',
            materials: [
                {
                    name: 'Direct Test Material',
                    unit: 'units',
                    specs: { test: 'direct' },
                    qnt: 1,
                    cost: 50
                }
            ],
            message: 'Direct test MaterialActivity creation',
            activity: 'used',
            user: {
                userId: 'direct-test-user',
                fullName: 'Direct Test User'
            },
            date: new Date().toISOString()
        };

        const directRes = await axios.post(`${domain}/api/materialActivity`, directTestActivity);
        console.log('✅ Direct MaterialActivity Created:', directRes.status);
        console.log('✅ Direct Activity ID:', directRes.data.data._id);

        console.log('\n5️⃣ Step 5: Verify direct creation worked...');
        
        const verifyRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=5`);
        const verifyActivities = verifyRes.data.data?.activities || verifyRes.data || [];
        
        const directActivityFound = verifyActivities.find(a => a.message?.includes('Direct test MaterialActivity'));
        if (directActivityFound) {
            console.log('✅ Direct MaterialActivity found in API!');
            console.log('   This confirms the MaterialActivity API is working correctly');
        } else {
            console.log('❌ Direct MaterialActivity not found');
            console.log('   This suggests an issue with MaterialActivity API');
        }

        console.log('\n6️⃣ Step 6: Final analysis and recommendations...');
        
        if (afterActivities.length > initialActivities.length) {
            console.log('\n🎉 BATCH API IS CREATING MATERIALACTIVITIES');
            console.log('✅ The batch material usage API is working correctly');
            console.log('✅ MaterialActivity records are being created');
            console.log('💡 If the notification page is still empty, the issue is likely:');
            console.log('   - ClientId mismatch between creation and retrieval');
            console.log('   - UI rendering issue in the notification page');
            console.log('   - JavaScript errors in the browser console');
        } else {
            console.log('\n❌ BATCH API IS NOT CREATING MATERIALACTIVITIES');
            console.log('💡 The batch material usage API is not creating MaterialActivity records');
            console.log('💡 This could be because:');
            console.log('   1. The test failed due to missing project/material data');
            console.log('   2. The MaterialActivity logging code has an error');
            console.log('   3. The MaterialActivity logging code is not being reached');
            console.log('💡 Check the batch API logs when using the real material usage form');
        }

        if (directActivityFound) {
            console.log('\n✅ MATERIALACTIVITY API IS WORKING');
            console.log('💡 The MaterialActivity API can create and retrieve records correctly');
        } else {
            console.log('\n❌ MATERIALACTIVITY API HAS ISSUES');
            console.log('💡 There might be a problem with the MaterialActivity API itself');
        }

    } catch (error) {
        console.error('\n❌ TEST ERROR:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        console.error('URL:', error.config?.url);
    }

    console.log('\n========================================');
    console.log('🏁 BATCH API MATERIAL ACTIVITY CREATION TEST COMPLETED');
    console.log('========================================\n');
}

// Run the test
testBatchApiMaterialActivityCreation().catch(console.error);