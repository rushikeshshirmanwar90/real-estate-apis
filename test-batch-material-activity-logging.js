const axios = require('axios');

// Test the batch material usage API with activity logging
async function testBatchMaterialUsageWithActivityLogging() {
    console.log('\n========================================');
    console.log('🧪 TESTING BATCH MATERIAL USAGE WITH ACTIVITY LOGGING');
    console.log('========================================');

    const domain = 'http://localhost:3000';
    
    // Test data - replace with actual values from your database
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
            },
            {
                materialId: '6756b8b4b0b5b4b5b4b5b4bb', // Replace with actual material ID
                quantity: 10
            }
        ]
    };

    try {
        console.log('📤 Sending batch material usage request...');
        console.log('Payload:', JSON.stringify(testData, null, 2));

        const response = await axios.post(`${domain}/api/material-usage-batch`, testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        console.log('\n✅ BATCH API SUCCESS:');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));

        // Now check if the activity was logged
        console.log('\n📋 Checking if material activity was logged...');
        
        const activityResponse = await axios.get(`${domain}/api/materialActivity?clientId=${testData.clientId}&activity=used&limit=5`);
        
        console.log('\n✅ MATERIAL ACTIVITY CHECK:');
        console.log('Status:', activityResponse.status);
        console.log('Activities found:', activityResponse.data.data?.activities?.length || 0);
        
        if (activityResponse.data.data?.activities?.length > 0) {
            const latestActivity = activityResponse.data.data.activities[0];
            console.log('\n📝 Latest Material Activity:');
            console.log('  - ID:', latestActivity._id);
            console.log('  - User:', latestActivity.user.fullName);
            console.log('  - Activity:', latestActivity.activity);
            console.log('  - Materials count:', latestActivity.materials.length);
            console.log('  - Message:', latestActivity.message);
            console.log('  - Date:', latestActivity.date);
            
            console.log('\n  Materials used:');
            latestActivity.materials.forEach((material, index) => {
                console.log(`    ${index + 1}. ${material.name}: ${material.qnt} ${material.unit} (₹${material.cost})`);
            });
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:');
        console.error('Error:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        
        if (error.response?.status === 404) {
            console.log('\n💡 TROUBLESHOOTING TIPS:');
            console.log('- Make sure the project, section, and material IDs exist in your database');
            console.log('- Check that the materials have sufficient quantity available');
            console.log('- Verify the clientId is correct');
        }
    }

    console.log('\n========================================');
    console.log('🏁 TEST COMPLETED');
    console.log('========================================\n');
}

// Run the test
testBatchMaterialUsageWithActivityLogging().catch(console.error);