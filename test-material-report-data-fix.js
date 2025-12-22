const axios = require('axios');

// Test the material activity report API with detailed debugging
async function testMaterialReportDataFix() {
    console.log('\n========================================');
    console.log('🔧 TESTING MATERIAL REPORT DATA FIX');
    console.log('========================================');

    const baseURL = 'http://localhost:3000'; // Adjust if needed
    
    // Test parameters - replace with actual values
    const testParams = {
        clientId: '6756b5b4b4b2b2c8c8e8e8e8', // Replace with actual client ID
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        activity: 'all'
    };

    try {
        console.log('📋 Test Parameters:');
        console.log('  - Client ID:', testParams.clientId);
        console.log('  - Date Range:', testParams.startDate, 'to', testParams.endDate);
        console.log('  - Activity Filter:', testParams.activity);

        const params = new URLSearchParams(testParams);
        const url = `${baseURL}/api/material-activity-report?${params.toString()}`;
        
        console.log('\n🌐 API Request URL:', url);

        const response = await axios.get(url);

        console.log('\n✅ API Response Status:', response.status);
        console.log('✅ Response Success:', response.data.success);

        if (response.data.success && response.data.data) {
            const { activities, summary } = response.data.data;
            
            console.log('\n📊 SUMMARY VERIFICATION:');
            console.log('  - Total Activities:', summary.totalActivities);
            console.log('  - Imported Count:', summary.importedCount);
            console.log('  - Used Count:', summary.usedCount);
            console.log('  - Total Materials:', summary.totalMaterials);
            console.log('  - Total Cost:', `₹${summary.totalCost.toLocaleString('en-IN')}`);
            console.log('  - Cost (raw):', summary.totalCost);

            console.log('\n📋 DETAILED ACTIVITY ANALYSIS:');
            let manualTotalCost = 0;
            
            activities.forEach((activity, index) => {
                console.log(`\n${index + 1}. Activity ID: ${activity._id}`);
                console.log(`   Type: ${activity.activity.toUpperCase()}`);
                console.log(`   User: ${activity.user.fullName}`);
                console.log(`   Project: ${activity.projectName}`);
                console.log(`   Date: ${activity.date}`);
                console.log(`   Materials: ${activity.materials.length}`);
                
                let activityTotal = 0;
                activity.materials.forEach((material, matIndex) => {
                    const materialCost = Number(material.cost) || 0;
                    activityTotal += materialCost;
                    
                    console.log(`     ${matIndex + 1}. ${material.name}`);
                    console.log(`        Quantity: ${material.qnt} ${material.unit}`);
                    console.log(`        Cost: ₹${materialCost.toLocaleString('en-IN')}`);
                });
                
                console.log(`   Activity Total: ₹${activityTotal.toLocaleString('en-IN')}`);
                manualTotalCost += activityTotal;
                
                if (activity.message) {
                    console.log(`   Message: "${activity.message}"`);
                }
            });

            console.log('\n🔍 COST VERIFICATION:');
            console.log(`  - API Total Cost: ₹${summary.totalCost.toLocaleString('en-IN')}`);
            console.log(`  - Manual Calculation: ₹${manualTotalCost.toLocaleString('en-IN')}`);
            console.log(`  - Match: ${summary.totalCost === manualTotalCost ? '✅ YES' : '❌ NO'}`);
            
            if (summary.totalCost !== manualTotalCost) {
                console.log(`  - Difference: ₹${Math.abs(summary.totalCost - manualTotalCost).toLocaleString('en-IN')}`);
            }

            console.log('\n📅 DATE ANALYSIS:');
            const dateGroups = {};
            activities.forEach(activity => {
                const date = activity.date.split('T')[0]; // Get date part
                if (!dateGroups[date]) {
                    dateGroups[date] = [];
                }
                dateGroups[date].push(activity);
            });
            
            const sortedDates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
            console.log(`  - Date Range: ${sortedDates.length} unique dates`);
            console.log(`  - Latest: ${sortedDates[0] || 'None'}`);
            console.log(`  - Oldest: ${sortedDates[sortedDates.length - 1] || 'None'}`);
            
            sortedDates.slice(0, 5).forEach(date => {
                const dayActivities = dateGroups[date];
                const dayTotal = dayActivities.reduce((sum, act) => 
                    sum + act.materials.reduce((matSum, mat) => matSum + (Number(mat.cost) || 0), 0), 0
                );
                console.log(`  - ${date}: ${dayActivities.length} activities, ₹${dayTotal.toLocaleString('en-IN')}`);
            });

        } else {
            console.error('❌ No data in response or API failed');
            console.error('Response:', response.data);
        }

        console.log('\n========================================');
        console.log('✅ TEST COMPLETED');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED');
        console.error('========================================');
        console.error('Error:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        
        console.error('========================================\n');
    }
}

// Run the test
testMaterialReportDataFix().catch(console.error);