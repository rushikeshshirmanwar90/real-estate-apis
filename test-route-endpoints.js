const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CLIENT_ID = '6947ca5feb038ceeb22be7ee'; // Update with your actual clientId

async function testRouteEndpoints() {
  console.log('🧪 TESTING ROUTE ENDPOINTS');
  console.log('=========================');
  console.log('This script will test which API endpoints are working');
  console.log('=========================\n');

  try {
    console.log('📋 Configuration:');
    console.log(`  - Base URL: ${BASE_URL}`);
    console.log(`  - Client ID: ${TEST_CLIENT_ID}`);
    console.log('');

    // Test 1: Check server is running
    console.log('1️⃣ Testing server connectivity...');
    try {
      const healthCheck = await axios.get(`${BASE_URL}/api/clients`, { timeout: 5000 });
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running');
      console.log('💡 Start your server with: cd real-estate-web && npm run dev');
      return;
    }

    // Test 2: Test all possible staff endpoints
    console.log('\n2️⃣ Testing staff endpoints...');
    
    const staffEndpoints = [
      '/api/staff',
      '/api/(users)/staff',
      '/api/users/staff'
    ];

    for (const endpoint of staffEndpoints) {
      try {
        console.log(`\n   🔍 Testing: ${endpoint}?clientId=${TEST_CLIENT_ID}`);
        const response = await axios.get(`${BASE_URL}${endpoint}?clientId=${TEST_CLIENT_ID}`);
        console.log(`   ✅ ${endpoint} - Status: ${response.status}`);
        console.log(`   - Success: ${response.data.success}`);
        console.log(`   - Data count: ${Array.isArray(response.data.data) ? response.data.data.length : 'Not array'}`);
      } catch (error) {
        console.log(`   ❌ ${endpoint} - Status: ${error.response?.status || 'No response'}`);
        console.log(`   - Error: ${error.response?.data?.message || error.message}`);
      }
    }

    // Test 3: Test all possible admin endpoints
    console.log('\n3️⃣ Testing admin endpoints...');
    
    const adminEndpoints = [
      '/api/admin',
      '/api/(users)/admin',
      '/api/users/admin'
    ];

    for (const endpoint of adminEndpoints) {
      try {
        console.log(`\n   🔍 Testing: ${endpoint}?clientId=${TEST_CLIENT_ID}`);
        const response = await axios.get(`${BASE_URL}${endpoint}?clientId=${TEST_CLIENT_ID}`);
        console.log(`   ✅ ${endpoint} - Status: ${response.status}`);
        console.log(`   - Success: ${response.data.success}`);
        console.log(`   - Has data: ${response.data.data ? 'Yes' : 'No'}`);
      } catch (error) {
        console.log(`   ❌ ${endpoint} - Status: ${error.response?.status || 'No response'}`);
        console.log(`   - Error: ${error.response?.data?.message || error.message}`);
      }
    }

    // Test 4: Test client endpoint
    console.log('\n4️⃣ Testing client endpoint...');
    try {
      const clientResponse = await axios.get(`${BASE_URL}/api/clients?id=${TEST_CLIENT_ID}`);
      console.log(`   ✅ Client API - Status: ${clientResponse.status}`);
      console.log(`   - Success: ${clientResponse.data.success}`);
      console.log(`   - Client name: ${clientResponse.data.data?.name || 'Not found'}`);
    } catch (error) {
      console.log(`   ❌ Client API - Status: ${error.response?.status || 'No response'}`);
      console.log(`   - Error: ${error.response?.data?.message || error.message}`);
    }

    console.log('\n=========================');
    console.log('ENDPOINT TESTING COMPLETE');
    console.log('=========================');

  } catch (error) {
    console.log('\n❌ TESTING FAILED');
    console.error('Error:', error.message);
  }
}

console.log('📋 INSTRUCTIONS:');
console.log('1. Update TEST_CLIENT_ID with your actual clientId');
console.log('2. Make sure your Next.js server is running (npm run dev)');
console.log('3. Run this script to see which endpoints work');
console.log('');

testRouteEndpoints().catch(console.error);