const axios = require('axios');

const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
const testClientId = '6941b27c7fdcea3d37e02ada'; // The fallback clientId from the mobile app

async function testDateFiltering() {
    console.log('🧪 Testing Date Filtering for Material Activities');
    console.log('================================================');
    console.log('Testing date: 2025-12-21 (today)');
    console.log('Domain:', domain);
    console.log('Test ClientId:', testClientId);

    try {
        // Test 1: Check what material activities exist in the database
        console.log('\n1️⃣ Checking all material activities for this client...');
        const allActivitiesResponse = await axios.get(`${domain}/api/material-activity-report?clientId=${testClientId}`);
        
        if (allActivitiesResponse.data.success) {
            const allActivities = allActivitiesResponse.data.data.activities;
            console.log(`✅ Found ${allActivities.length} total activities`);
            
            if (allActivities.length > 0) {
                console.log('\n📋 Recent activities:');
                allActivities.slice(0, 5).forEach((activity, index) => {
                    const activityDate = new Date(activity.date);
                    console.log(`  ${index + 1}. ${activity.activity} - ${activityDate.toISOString().split('T')[0]} (${activityDate.toLocaleString()})`);
                    console.log(`     Project: ${activity.projectName}`);
                    console.log(`     Materials: ${activity.materials?.length || 0}`);
                });
                
                // Check if any activities are from today
                const today = new Date().toISOString().split('T')[0];
                const todayActivities = allActivities.filter(activity => {
                    const activityDate = new Date(activity.date).toISOString().split('T')[0];
                    return activityDate === today;
                });
                
                console.log(`\n📅 Activities from today (${today}): ${todayActivities.length}`);
                if (todayActivities.length > 0) {
                    todayActivities.forEach((activity, index) => {
                        console.log(`  ${index + 1}. ${activity.activity} at ${new Date(activity.date).toLocaleTimeString()}`);
                    });
                }
            }
        } else {
            console.log('❌ Failed to fetch all activities:', allActivitiesResponse.data.error);
        }

        // Test 2: Test with today's date as both start and end
        console.log('\n2️⃣ Testing with today\'s date (2025-12-21)...');
        const todayDate = '2025-12-21';
        
        const todayResponse = await axios.get(`${domain}/api/material-activity-report?clientId=${testClientId}&startDate=${todayDate}&endDate=${todayDate}`);
        
        if (todayResponse.data.success) {
            const todayActivities = todayResponse.data.data.activities;
            console.log(`✅ Found ${todayActivities.length} activities for ${todayDate}`);
            
            if (todayActivities.length > 0) {
                todayActivities.forEach((activity, index) => {
                    console.log(`  ${index + 1}. ${activity.activity} - ${new Date(activity.date).toLocaleString()}`);
                });
            } else {
                console.log('❌ No activities found for today');
            }
        } else {
            console.log('❌ Failed to fetch today\'s activities:', todayResponse.data.error);
        }

        // Test 3: Test with a wider date range around today
        console.log('\n3️⃣ Testing with wider date range (last 7 days)...');
        const endDate = '2025-12-21';
        const startDate = '2025-12-15';
        
        const rangeResponse = await axios.get(`${domain}/api/material-activity-report?clientId=${testClientId}&startDate=${startDate}&endDate=${endDate}`);
        
        if (rangeResponse.data.success) {
            const rangeActivities = rangeResponse.data.data.activities;
            console.log(`✅ Found ${rangeActivities.length} activities from ${startDate} to ${endDate}`);
            
            if (rangeActivities.length > 0) {
                // Group by date
                const activitiesByDate = {};
                rangeActivities.forEach(activity => {
                    const date = new Date(activity.date).toISOString().split('T')[0];
                    if (!activitiesByDate[date]) {
                        activitiesByDate[date] = [];
                    }
                    activitiesByDate[date].push(activity);
                });
                
                console.log('\n📅 Activities by date:');
                Object.keys(activitiesByDate).sort().forEach(date => {
                    console.log(`  ${date}: ${activitiesByDate[date].length} activities`);
                });
            }
        } else {
            console.log('❌ Failed to fetch range activities:', rangeResponse.data.error);
        }

        // Test 4: Check the exact date format and timezone handling
        console.log('\n4️⃣ Testing date format and timezone handling...');
        
        // Simulate how the mobile app formats dates
        const testDate = new Date('2025-12-21');
        const formattedDate = testDate.toISOString().split('T')[0];
        
        console.log('Original date:', '2025-12-21');
        console.log('Date object:', testDate);
        console.log('Formatted date:', formattedDate);
        console.log('Date object timezone offset:', testDate.getTimezoneOffset());
        
        // Test with the formatted date
        const formatTestResponse = await axios.get(`${domain}/api/material-activity-report?clientId=${testClientId}&startDate=${formattedDate}&endDate=${formattedDate}`);
        
        if (formatTestResponse.data.success) {
            console.log(`✅ Format test: Found ${formatTestResponse.data.data.activities.length} activities`);
        } else {
            console.log('❌ Format test failed:', formatTestResponse.data.error);
        }

        // Test 5: Check what the API query looks like
        console.log('\n5️⃣ Checking API query construction...');
        
        // Simulate the API's date parsing
        const startDateObj = new Date(todayDate);
        startDateObj.setHours(0, 0, 0, 0);
        const endDateObj = new Date(todayDate);
        endDateObj.setHours(23, 59, 59, 999);
        
        console.log('API start date filter (>=):', startDateObj.toISOString());
        console.log('API end date filter (<=):', endDateObj.toISOString());
        
        // Check current time
        const now = new Date();
        console.log('Current time:', now.toISOString());
        console.log('Current time is within range?', now >= startDateObj && now <= endDateObj);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testDateFiltering();