const axios = require('axios');

// Test the material activity report API
async function testMaterialActivityReportAPI() {
    console.log('\n========================================');
    console.log('🧪 TESTING MATERIAL ACTIVITY REPORT API');
    console.log('========================================');

    const baseURL = 'http://localhost:3000'; // Adjust if needed
    
    // Test parameters - replace with actual values
    const testParams = {
        clientId: '6756b5b4b4b2b2c8c8e8e8e8', // Replace with actual client ID
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        activity: 'all' // 'all', 'imported', or 'used'
    };

    try {
        console.log('📋 Test Parameters:');
        console.log('  - Client ID:', testParams.clientId);
        console.log('  - Start Date:', testParams.startDate);
        console.log('  - End Date:', testParams.endDate);
        console.log('  - Activity Filter:', testParams.activity);

        const params = new URLSearchParams(testParams);
        const url = `${baseURL}/api/material-activity-report?${params.toString()}`;
        
        console.log('\n🌐 API Request:');
        console.log('  - URL:', url);

        const response = await axios.get(url);

        console.log('\n✅ API Response:');
        console.log('  - Status:', response.status);
        console.log('  - Success:', response.data.success);
        console.log('  - Message:', response.data.message);

        if (response.data.success && response.data.data) {
            const { activities, summary } = response.data.data;
            
            console.log('\n📊 Summary Statistics:');
            console.log('  - Total Activities:', summary.totalActivities);
            console.log('  - Imported Count:', summary.importedCount);
            console.log('  - Used Count:', summary.usedCount);
            console.log('  - Total Materials:', summary.totalMaterials);
            console.log('  - Total Cost:', `₹${summary.totalCost.toLocaleString('en-IN')}`);

            console.log('\n📋 Activities Sample:');
            activities.slice(0, 3).forEach((activity, index) => {
                console.log(`  ${index + 1}. ${activity.activity.toUpperCase()} - ${activity.user.fullName}`);
                console.log(`     Project: ${activity.projectName || 'Unknown'}`);
                console.log(`     Materials: ${activity.materials.length}`);
                console.log(`     Date: ${activity.date}`);
                if (activity.materials.length > 0) {
                    console.log(`     Sample Material: ${activity.materials[0].name} (${activity.materials[0].qnt} ${activity.materials[0].unit})`);
                }
                console.log('');
            });

            if (activities.length > 3) {
                console.log(`  ... and ${activities.length - 3} more activities`);
            }
        }

        console.log('\n========================================');
        console.log('✅ TEST COMPLETED SUCCESSFULLY');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED');
        console.error('========================================');
        console.error('Error:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        
        console.error('========================================\n');
    }
}

// Test different scenarios
async function runAllTests() {
    console.log('🚀 Starting Material Activity Report API Tests...\n');

    // Test 1: All activities
    await testMaterialActivityReportAPI();

    // Test 2: Only imported materials
    console.log('🧪 Testing with imported materials only...');
    // You can modify testParams.activity = 'imported' and run again

    // Test 3: Only used materials  
    console.log('🧪 Testing with used materials only...');
    // You can modify testParams.activity = 'used' and run again

    console.log('🏁 All tests completed!');
}

// Run the tests
runAllTests().catch(console.error);