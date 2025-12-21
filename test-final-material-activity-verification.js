const axios = require('axios');

// Final comprehensive test to verify material activity logging works end-to-end
async function testFinalMaterialActivityVerification() {
    console.log('\n========================================');
    console.log('🎯 FINAL MATERIAL ACTIVITY VERIFICATION');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    
    // Use the same fallback clientId that both functions should now use
    const clientId = '6941b27c7fdcea3d37e02ada';
    
    try {
        console.log('\n1️⃣ STEP 1: Clean slate - Check current state...');
        
        const initialRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=10`);
        console.log('✅ Initial API Status:', initialRes.status);
        
        let initialActivities = [];
        if (Array.isArray(initialRes.data)) {
            initialActivities = initialRes.data;
        } else if (initialRes.data.data?.activities) {
            initialActivities = initialRes.data.data.activities;
        } else if (initialRes.data.activities) {
            initialActivities = initialRes.data.activities;
        }
        
        console.log('✅ Initial activities for clientId:', initialActivities.length);

        console.log('\n2️⃣ STEP 2: Simulate batch material usage API call...');
        
        // Create a test activity that simulates what the batch API should create
        const batchSimulationActivity = {
            clientId: clientId,
            projectId: 'test-project-batch-simulation',
            materials: [
                {
                    name: 'Batch Test Cement',
                    unit: 'bags',
                    specs: { grade: 'OPC 43' },
                    qnt: 5,
                    cost: 250
                },
                {
                    name: 'Batch Test Bricks',
                    unit: 'pieces',
                    specs: { type: 'red' },
                    qnt: 100,
                    cost: 500
                }
            ],
            message: 'Used 2 materials in mini-section (₹750)',
            activity: 'used',
            user: {
                userId: 'batch-test-user-123',
                fullName: 'Batch Test User'
            },
            date: new Date().toISOString()
        };

        const createRes = await axios.post(`${domain}/api/materialActivity`, batchSimulationActivity);
        console.log('✅ Batch simulation activity created:', createRes.status);
        console.log('✅ Created activity ID:', createRes.data.data._id);

        console.log('\n3️⃣ STEP 3: Verify activity appears in traditional pagination...');
        
        const traditionalRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=10`);
        console.log('✅ Traditional pagination status:', traditionalRes.status);
        
        let traditionalActivities = [];
        if (Array.isArray(traditionalRes.data)) {
            traditionalActivities = traditionalRes.data;
        } else if (traditionalRes.data.data?.activities) {
            traditionalActivities = traditionalRes.data.data.activities;
        } else if (traditionalRes.data.activities) {
            traditionalActivities = traditionalRes.data.activities;
        }
        
        console.log('✅ Traditional activities after creation:', traditionalActivities.length);
        console.log('✅ New activities created:', Math.max(0, traditionalActivities.length - initialActivities.length));
        
        const batchActivity = traditionalActivities.find(a => a.message?.includes('Used 2 materials in mini-section'));
        if (batchActivity) {
            console.log('✅ Batch simulation activity found in traditional pagination!');
            console.log('   - ID:', batchActivity._id);
            console.log('   - User:', batchActivity.user.fullName);
            console.log('   - Materials:', batchActivity.materials.length);
            console.log('   - Message:', batchActivity.message);
        } else {
            console.log('❌ Batch simulation activity not found in traditional pagination');
        }

        console.log('\n4️⃣ STEP 4: Verify activity appears in date-based pagination...');
        
        const dateRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&paginationMode=date&dateLimit=10`);
        console.log('✅ Date pagination status:', dateRes.status);
        console.log('✅ Date pagination response structure:', Object.keys(dateRes.data));
        
        if (dateRes.data.data?.dateGroups) {
            console.log('✅ Date groups found:', dateRes.data.data.dateGroups.length);
            
            let foundInDateGroups = false;
            dateRes.data.data.dateGroups.forEach((group, index) => {
                console.log(`   Date ${index + 1}: ${group.date} - ${group.activities.length} activities`);
                
                const batchActivityInGroup = group.activities.find(a => a.message?.includes('Used 2 materials in mini-section'));
                if (batchActivityInGroup) {
                    console.log('     ✅ Batch simulation activity found in this date group!');
                    foundInDateGroups = true;
                }
            });
            
            if (foundInDateGroups) {
                console.log('✅ Batch simulation activity found in date-based pagination!');
            } else {
                console.log('❌ Batch simulation activity not found in date-based pagination');
            }
        } else {
            console.log('❌ No date groups found in response');
            console.log('Response data:', JSON.stringify(dateRes.data, null, 2));
        }

        console.log('\n5️⃣ STEP 5: Test filtering by activity type (used)...');
        
        const usedFilterRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&activity=used&limit=10`);
        console.log('✅ Used filter status:', usedFilterRes.status);
        
        let usedActivities = [];
        if (Array.isArray(usedFilterRes.data)) {
            usedActivities = usedFilterRes.data;
        } else if (usedFilterRes.data.data?.activities) {
            usedActivities = usedFilterRes.data.data.activities;
        } else if (usedFilterRes.data.activities) {
            usedActivities = usedFilterRes.data.activities;
        }
        
        console.log('✅ Used activities found:', usedActivities.length);
        
        const usedBatchActivity = usedActivities.find(a => a.message?.includes('Used 2 materials in mini-section'));
        if (usedBatchActivity) {
            console.log('✅ Batch simulation activity found in used filter!');
        } else {
            console.log('❌ Batch simulation activity not found in used filter');
        }

        console.log('\n6️⃣ STEP 6: Final verification summary...');
        
        const verificationResults = {
            activityCreated: !!createRes.data.data._id,
            foundInTraditional: !!batchActivity,
            foundInDateGroups: dateRes.data.data?.dateGroups?.some(group => 
                group.activities.some(a => a.message?.includes('Used 2 materials in mini-section'))
            ),
            foundInUsedFilter: !!usedBatchActivity
        };
        
        console.log('📊 Verification Results:');
        console.log('   ✅ Activity Created:', verificationResults.activityCreated ? 'YES' : 'NO');
        console.log('   ✅ Found in Traditional Pagination:', verificationResults.foundInTraditional ? 'YES' : 'NO');
        console.log('   ✅ Found in Date-based Pagination:', verificationResults.foundInDateGroups ? 'YES' : 'NO');
        console.log('   ✅ Found in Used Filter:', verificationResults.foundInUsedFilter ? 'YES' : 'NO');
        
        const allTestsPassed = Object.values(verificationResults).every(result => result === true);
        
        if (allTestsPassed) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('✅ Material activity logging is working correctly');
            console.log('✅ The notification page should be able to display material activities');
            console.log('\n💡 If you still don\'t see activities in the notification page:');
            console.log('   1. Make sure you\'re using the material usage form in the app');
            console.log('   2. Check that the clientId in your app matches:', clientId);
            console.log('   3. Look at the browser console for any JavaScript errors');
            console.log('   4. Make sure you\'re on the "Materials" > "Used" tab in notifications');
            console.log('   5. Try refreshing the notification page');
        } else {
            console.log('\n❌ SOME TESTS FAILED');
            console.log('💡 Issues found:');
            
            if (!verificationResults.activityCreated) {
                console.log('   - Activity creation failed');
            }
            if (!verificationResults.foundInTraditional) {
                console.log('   - Activity not found in traditional pagination');
            }
            if (!verificationResults.foundInDateGroups) {
                console.log('   - Activity not found in date-based pagination');
            }
            if (!verificationResults.foundInUsedFilter) {
                console.log('   - Activity not found in used filter');
            }
        }

    } catch (error) {
        console.error('\n❌ ERROR OCCURRED:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        console.error('URL:', error.config?.url);
    }

    console.log('\n========================================');
    console.log('🏁 FINAL VERIFICATION COMPLETED');
    console.log('========================================\n');
}

// Run the final verification
testFinalMaterialActivityVerification().catch(console.error);