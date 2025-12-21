const axios = require('axios');

// Complete notification debugging - checks everything
async function testCompleteNotificationDebug() {
    console.log('\n========================================');
    console.log('🔍 COMPLETE NOTIFICATION DEBUG');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    const clientId = '6941b27c7fdcea3d37e02ada'; // Fallback clientId
    
    const results = {
        activityApiWorking: false,
        materialActivityApiWorking: false,
        activityDatePaginationWorking: false,
        materialDatePaginationWorking: false,
        activitiesFound: 0,
        materialActivitiesFound: 0,
        batchApiCanCreateMaterial: false,
        notificationPageShouldWork: false
    };

    try {
        console.log('\n1️⃣ Testing Activity API...');
        
        try {
            const activityRes = await axios.get(`${domain}/api/activity?clientId=${clientId}&limit=10`);
            results.activityApiWorking = true;
            
            const activities = activityRes.data.data?.activities || activityRes.data.activities || [];
            results.activitiesFound = activities.length;
            
            console.log('✅ Activity API working:', results.activityApiWorking);
            console.log('✅ Regular activities found:', results.activitiesFound);
        } catch (error) {
            console.log('❌ Activity API failed:', error.response?.status || error.message);
        }

        console.log('\n2️⃣ Testing MaterialActivity API...');
        
        try {
            const materialRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&limit=10`);
            results.materialActivityApiWorking = true;
            
            const materials = materialRes.data.data?.activities || materialRes.data || [];
            results.materialActivitiesFound = materials.length;
            
            console.log('✅ MaterialActivity API working:', results.materialActivityApiWorking);
            console.log('✅ Material activities found:', results.materialActivitiesFound);
        } catch (error) {
            console.log('❌ MaterialActivity API failed:', error.response?.status || error.message);
        }

        console.log('\n3️⃣ Testing Date-based Pagination...');
        
        try {
            const activityDateRes = await axios.get(`${domain}/api/activity?clientId=${clientId}&paginationMode=date&dateLimit=5`);
            const activityDateGroups = activityDateRes.data.data?.dateGroups || activityDateRes.data.dateGroups || [];
            results.activityDatePaginationWorking = activityDateGroups.length > 0;
            
            console.log('✅ Activity date pagination working:', results.activityDatePaginationWorking);
            console.log('✅ Activity date groups:', activityDateGroups.length);
        } catch (error) {
            console.log('❌ Activity date pagination failed:', error.response?.status || error.message);
        }

        try {
            const materialDateRes = await axios.get(`${domain}/api/materialActivity?clientId=${clientId}&paginationMode=date&dateLimit=5`);
            const materialDateGroups = materialDateRes.data.data?.dateGroups || materialDateRes.data.dateGroups || [];
            results.materialDatePaginationWorking = materialDateGroups.length > 0;
            
            console.log('✅ Material date pagination working:', results.materialDatePaginationWorking);
            console.log('✅ Material date groups:', materialDateGroups.length);
        } catch (error) {
            console.log('❌ Material date pagination failed:', error.response?.status || error.message);
        }

        console.log('\n4️⃣ Testing MaterialActivity Creation...');
        
        try {
            const testActivity = {
                clientId: clientId,
                projectId: 'debug-test-project',
                materials: [{
                    name: 'Debug Test Material',
                    unit: 'units',
                    specs: { test: 'debug' },
                    qnt: 1,
                    cost: 100
                }],
                message: 'Debug test material activity',
                activity: 'used',
                user: {
                    userId: 'debug-user',
                    fullName: 'Debug User'
                },
                date: new Date().toISOString()
            };

            const createRes = await axios.post(`${domain}/api/materialActivity`, testActivity);
            results.batchApiCanCreateMaterial = createRes.status === 201;
            
            console.log('✅ MaterialActivity creation working:', results.batchApiCanCreateMaterial);
            console.log('✅ Created activity ID:', createRes.data.data._id);
        } catch (error) {
            console.log('❌ MaterialActivity creation failed:', error.response?.status || error.message);
        }

        console.log('\n5️⃣ Final Analysis...');
        
        // Determine if notification page should work
        const hasAnyActivities = results.activitiesFound > 0 || results.materialActivitiesFound > 0;
        const apisWorking = results.activityApiWorking && results.materialActivityApiWorking;
        const paginationWorking = results.activityDatePaginationWorking || results.materialDatePaginationWorking;
        
        results.notificationPageShouldWork = hasAnyActivities && apisWorking;

        console.log('\n📊 RESULTS SUMMARY:');
        console.log('==================');
        console.log('Activity API Working:', results.activityApiWorking ? '✅' : '❌');
        console.log('MaterialActivity API Working:', results.materialActivityApiWorking ? '✅' : '❌');
        console.log('Activity Date Pagination:', results.activityDatePaginationWorking ? '✅' : '❌');
        console.log('Material Date Pagination:', results.materialDatePaginationWorking ? '✅' : '❌');
        console.log('Regular Activities Found:', results.activitiesFound);
        console.log('Material Activities Found:', results.materialActivitiesFound);
        console.log('Can Create MaterialActivity:', results.batchApiCanCreateMaterial ? '✅' : '❌');
        console.log('Notification Page Should Work:', results.notificationPageShouldWork ? '✅' : '❌');

        console.log('\n🎯 DIAGNOSIS:');
        console.log('=============');

        if (results.notificationPageShouldWork) {
            console.log('✅ NOTIFICATION PAGE SHOULD BE WORKING');
            console.log('💡 If you still don\'t see activities:');
            console.log('   1. Check browser console for JavaScript errors');
            console.log('   2. Make sure you\'re on the correct tab (All/Materials/Used)');
            console.log('   3. Try refreshing the notification page');
            console.log('   4. Check Network tab to see if API calls are being made');
        } else if (!apisWorking) {
            console.log('❌ API ISSUES DETECTED');
            console.log('💡 Problems:');
            if (!results.activityApiWorking) {
                console.log('   - Activity API is not working');
            }
            if (!results.materialActivityApiWorking) {
                console.log('   - MaterialActivity API is not working');
            }
            console.log('💡 Solutions:');
            console.log('   - Make sure the Next.js server is running');
            console.log('   - Check server logs for API errors');
            console.log('   - Verify database connection');
        } else if (!hasAnyActivities) {
            console.log('❌ NO ACTIVITIES FOUND');
            console.log('💡 This means:');
            console.log('   - No regular activities have been created');
            console.log('   - No material activities have been created');
            console.log('   - The batch material usage API might not be creating MaterialActivity records');
            console.log('💡 Solutions:');
            console.log('   - Use the material usage form in your app');
            console.log('   - Check if the batch API is creating MaterialActivity records');
            console.log('   - Verify the clientId is correct');
        }

        console.log('\n🔧 RECOMMENDED ACTIONS:');
        console.log('=======================');

        if (!results.materialActivitiesFound && results.batchApiCanCreateMaterial) {
            console.log('1. The MaterialActivity API works, but no activities exist');
            console.log('   → Use the material usage form in your app to create activities');
            console.log('   → Check if the batch API is actually calling MaterialActivity creation');
        }

        if (!results.materialDatePaginationWorking && results.materialActivitiesFound > 0) {
            console.log('2. Material activities exist but date pagination is not working');
            console.log('   → The notification page will fall back to traditional pagination');
            console.log('   → This should still work, but might be slower');
        }

        if (results.materialActivitiesFound > 0 && !results.notificationPageShouldWork) {
            console.log('3. Material activities exist but APIs have issues');
            console.log('   → Check server logs for API errors');
            console.log('   → Verify database connection and model imports');
        }

        console.log('\n📋 NEXT STEPS:');
        console.log('==============');
        console.log('1. Run: node real-estate-web/test-batch-api-material-activity-creation.js');
        console.log('2. Use the material usage form in your app');
        console.log('3. Check the batch API logs for MaterialActivity creation messages');
        console.log('4. Open notification page and check browser console for errors');
        console.log('5. Use the debug button (🐛) in the notification page header');

    } catch (error) {
        console.error('\n❌ COMPLETE DEBUG ERROR:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
    }

    console.log('\n========================================');
    console.log('🏁 COMPLETE NOTIFICATION DEBUG FINISHED');
    console.log('========================================\n');

    return results;
}

// Run the complete debug
testCompleteNotificationDebug().catch(console.error);