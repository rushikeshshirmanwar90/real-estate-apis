const { default: fetch } = require('node-fetch');

async function testDateRangeFiltering() {
    try {
        console.log('\n========================================');
        console.log('🔍 TESTING DATE RANGE FILTERING');
        console.log('========================================');

        const clientId = '6941b27c7fdcea3d37e02ada';
        
        // Test 1: All data (no date filter)
        console.log('\n📊 TEST 1: All data (no date filter)');
        const allDataUrl = `http://localhost:8080/api/material-activity-report?clientId=${clientId}`;
        const allDataResponse = await fetch(allDataUrl);
        const allData = await allDataResponse.json();
        
        if (allData.success) {
            console.log(`  - Total activities: ${allData.data.activities.length}`);
            console.log(`  - Total cost: ₹${allData.data.summary.totalCost.toLocaleString('en-IN')}`);
        }

        // Test 2: Last 30 days (default in ReportGenerator)
        console.log('\n📊 TEST 2: Last 30 days (ReportGenerator default)');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();
        
        const thirtyDayUrl = `http://localhost:8080/api/material-activity-report?clientId=${clientId}&startDate=${thirtyDaysAgo.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`;
        console.log(`  - URL: ${thirtyDayUrl}`);
        
        const thirtyDayResponse = await fetch(thirtyDayUrl);
        const thirtyDayData = await thirtyDayResponse.json();
        
        if (thirtyDayData.success) {
            console.log(`  - Activities in last 30 days: ${thirtyDayData.data.activities.length}`);
            console.log(`  - Cost in last 30 days: ₹${thirtyDayData.data.summary.totalCost.toLocaleString('en-IN')}`);
        }

        // Test 3: Last 7 days
        console.log('\n📊 TEST 3: Last 7 days');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const sevenDayUrl = `http://localhost:8080/api/material-activity-report?clientId=${clientId}&startDate=${sevenDaysAgo.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`;
        const sevenDayResponse = await fetch(sevenDayUrl);
        const sevenDayData = await sevenDayResponse.json();
        
        if (sevenDayData.success) {
            console.log(`  - Activities in last 7 days: ${sevenDayData.data.activities.length}`);
            console.log(`  - Cost in last 7 days: ₹${sevenDayData.data.summary.totalCost.toLocaleString('en-IN')}`);
        }

        // Test 4: Only "used" activities
        console.log('\n📊 TEST 4: Only "used" activities (all time)');
        const usedOnlyUrl = `http://localhost:8080/api/material-activity-report?clientId=${clientId}&activity=used`;
        const usedOnlyResponse = await fetch(usedOnlyUrl);
        const usedOnlyData = await usedOnlyResponse.json();
        
        if (usedOnlyData.success) {
            console.log(`  - Used activities: ${usedOnlyData.data.activities.length}`);
            console.log(`  - Used activities cost: ₹${usedOnlyData.data.summary.totalCost.toLocaleString('en-IN')}`);
        }

        // Test 5: Only "imported" activities
        console.log('\n📊 TEST 5: Only "imported" activities (all time)');
        const importedOnlyUrl = `http://localhost:8080/api/material-activity-report?clientId=${clientId}&activity=imported`;
        const importedOnlyResponse = await fetch(importedOnlyUrl);
        const importedOnlyData = await importedOnlyResponse.json();
        
        if (importedOnlyData.success) {
            console.log(`  - Imported activities: ${importedOnlyData.data.activities.length}`);
            console.log(`  - Imported activities cost: ₹${importedOnlyData.data.summary.totalCost.toLocaleString('en-IN')}`);
        }

        // Analysis
        console.log('\n========================================');
        console.log('📊 ANALYSIS:');
        console.log('========================================');
        
        if (allData.success && thirtyDayData.success) {
            const missingActivities = allData.data.activities.length - thirtyDayData.data.activities.length;
            const missingCost = allData.data.summary.totalCost - thirtyDayData.data.summary.totalCost;
            
            console.log(`  - Activities missing from 30-day range: ${missingActivities}`);
            console.log(`  - Cost missing from 30-day range: ₹${missingCost.toLocaleString('en-IN')}`);
            
            if (missingActivities > 0) {
                console.log(`  - This explains why user sees lower total!`);
                console.log(`  - User's PDF shows 30-day total: ₹${thirtyDayData.data.summary.totalCost.toLocaleString('en-IN')}`);
                console.log(`  - But actual total is: ₹${allData.data.summary.totalCost.toLocaleString('en-IN')}`);
            }
        }

        console.log('========================================');

    } catch (error) {
        console.error('❌ Error testing date ranges:', error);
    }
}

// Run the test
testDateRangeFiltering().catch(console.error);