const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3000'; // Adjust if needed
const TEST_CLIENT_ID = '6751b8b8b8b8b8b8b8b8b8b8'; // Replace with actual client ID
const TEST_FROM_PROJECT_ID = '6751b8b8b8b8b8b8b8b8b8b9'; // Replace with actual project ID
const TEST_TO_PROJECT_ID = '6751b8b8b8b8b8b8b8b8b8ba'; // Replace with actual project ID

async function testMaterialTransfer() {
    console.log('🧪 Testing Material Transfer API...\n');

    try {
        // Test data
        const transferData = {
            fromProjectId: TEST_FROM_PROJECT_ID,
            toProjectId: TEST_TO_PROJECT_ID,
            materialName: 'Test Cement',
            unit: 'bag',
            variantId: '6751b8b8b8b8b8b8b8b8b8bb', // Replace with actual material ID
            quantity: 5,
            specs: { grade: 'OPC 53', brand: 'UltraTech' },
            clientId: TEST_CLIENT_ID
        };

        console.log('📤 Sending transfer request...');
        console.log('Transfer Data:', JSON.stringify(transferData, null, 2));

        const response = await axios.post(`${API_BASE_URL}/api/material/transfer`, transferData);

        console.log('\n✅ Transfer API Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        if (response.data.success) {
            console.log('\n🎉 Material transfer completed successfully!');
            console.log(`Transferred: ${transferData.quantity} ${transferData.unit} of ${transferData.materialName}`);
            console.log(`From Project: ${transferData.fromProjectId}`);
            console.log(`To Project: ${transferData.toProjectId}`);
        } else {
            console.log('\n❌ Transfer failed:', response.data.error);
        }

    } catch (error) {
        console.error('\n❌ Test failed with error:');
        console.error('Error Type:', error.constructor.name);
        console.error('Error Message:', error.message);
        
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function testMaterialActivityAPI() {
    console.log('\n🧪 Testing Material Activity API for transferred activities...\n');

    try {
        // Test activity logging for transferred materials
        const activityData = {
            clientId: TEST_CLIENT_ID,
            projectId: TEST_FROM_PROJECT_ID,
            projectName: 'Test Source Project',
            sectionName: 'Test Section',
            materials: [{
                name: 'Test Cement',
                unit: 'bag',
                specs: { grade: 'OPC 53', brand: 'UltraTech' },
                qnt: 5,
                perUnitCost: 500,
                totalCost: 2500,
                cost: 2500,
                transferDetails: {
                    fromProject: { id: TEST_FROM_PROJECT_ID, name: 'Test Source Project' },
                    toProject: { id: TEST_TO_PROJECT_ID, name: 'Test Destination Project' }
                }
            }],
            message: 'Material transferred between projects',
            activity: 'transferred',
            user: {
                userId: 'test-user-123',
                fullName: 'Test User'
            },
            date: new Date().toISOString(),
            transferDetails: {
                fromProject: { id: TEST_FROM_PROJECT_ID, name: 'Test Source Project' },
                toProject: { id: TEST_TO_PROJECT_ID, name: 'Test Destination Project' }
            }
        };

        console.log('📤 Sending activity log request...');
        console.log('Activity Data:', JSON.stringify(activityData, null, 2));

        const response = await axios.post(`${API_BASE_URL}/api/materialActivity`, activityData);

        console.log('\n✅ Material Activity API Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        if (response.data.success) {
            console.log('\n🎉 Material activity logged successfully!');
            console.log('Activity Type: transferred');
            console.log('Materials Count:', activityData.materials.length);
        } else {
            console.log('\n❌ Activity logging failed:', response.data.error);
        }

    } catch (error) {
        console.error('\n❌ Activity API test failed:');
        console.error('Error Type:', error.constructor.name);
        console.error('Error Message:', error.message);
        
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run tests
async function runAllTests() {
    console.log('🚀 Starting Material Transfer Tests...\n');
    console.log('⚠️  Make sure to update the test IDs in this file before running!\n');
    
    await testMaterialTransfer();
    await testMaterialActivityAPI();
    
    console.log('\n✅ All tests completed!');
}

// Execute if run directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testMaterialTransfer,
    testMaterialActivityAPI,
    runAllTests
};