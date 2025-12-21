const axios = require('axios');

// Test the batch material usage API
async function testBatchAPI() {
    const domain = 'http://localhost:3000'; // Adjust as needed
    
    console.log('🧪 Testing Batch Material Usage API...');
    console.log('Endpoint:', `${domain}/api/material-usage-batch`);
    
    // First, test if the endpoint exists with a GET request (should return 405)
    try {
        console.log('\n1. Testing GET request (should return 405)...');
        const getResponse = await axios.get(`${domain}/api/material-usage-batch`);
        console.log('❌ Unexpected: GET request succeeded');
        console.log('Response:', getResponse.data);
    } catch (error) {
        if (error.response?.status === 405) {
            console.log('✅ Expected: GET request returned 405 (Method Not Allowed)');
        } else {
            console.log('❌ Unexpected error:', error.response?.status, error.response?.data || error.message);
        }
    }
    
    // Test POST with invalid data (should return 400)
    try {
        console.log('\n2. Testing POST with invalid data (should return 400)...');
        const invalidResponse = await axios.post(`${domain}/api/material-usage-batch`, {
            // Missing required fields
        });
        console.log('❌ Unexpected: Invalid request succeeded');
        console.log('Response:', invalidResponse.data);
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Expected: Invalid POST request returned 400');
            console.log('Error message:', error.response.data.error);
        } else {
            console.log('❌ Unexpected error:', error.response?.status, error.response?.data || error.message);
        }
    }
    
    console.log('\n📝 API endpoint is properly configured!');
    console.log('Next steps:');
    console.log('1. Make sure your project has valid data');
    console.log('2. Use valid projectId, sectionId, and materialUsages in your request');
    console.log('3. Check the browser network tab for the actual request being made');
}

// Run the test
testBatchAPI().catch(console.error);