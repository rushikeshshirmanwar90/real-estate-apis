const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada'; // Replace with a real client ID

async function testStaffAdminLoading() {
  console.log('🧪 TESTING STAFF AND ADMIN LOADING');
  console.log('===================================');
  console.log('Testing API endpoints for staff and admin data loading');
  console.log('===================================\n');
  
  try {
    console.log('📋 Test Configuration:');
    console.log(`  - Base URL: ${BASE_URL}`);
    console.log(`  - Client ID: ${TEST_CLIENT_ID}`);
    console.log('');

    // Test 1: Staff API
    console.log('1️⃣ Testing Staff API...');
    try {
      const staffUrl = `${BASE_URL}/api/(users)/staff?clientId=${TEST_CLIENT_ID}`;
      console.log(`📤 Staff API Request: ${staffUrl}`);
      
      const staffResponse = await axios.get(staffUrl);
      
      if (staffResponse.data.success) {
        const staffData = staffResponse.data.data;
        console.log('✅ Staff API Success');
        console.log(`📊 Staff Count: ${Array.isArray(staffData) ? staffData.length : 'N/A'}`);
        
        if (Array.isArray(staffData) && staffData.length > 0) {
          console.log('📋 Sample Staff Member:');
          const sample = staffData[0];
          console.log(`  - Name: ${sample.firstName} ${sample.lastName}`);
          console.log(`  - Email: ${sample.email}`);
          console.log(`  - Role: ${sample.role}`);
        }
      } else {
        console.log('❌ Staff API Failed:', staffResponse.data.message);
      }
    } catch (staffError) {
      console.log('❌ Staff API Error:', staffError.response?.status, staffError.response?.data?.message || staffError.message);
    }

    console.log('');

    // Test 2: Admin API
    console.log('2️⃣ Testing Admin API...');
    try {
      const adminUrl = `${BASE_URL}/api/(users)/admin?clientId=${TEST_CLIENT_ID}`;
      console.log(`📤 Admin API Request: ${adminUrl}`);
      
      const adminResponse = await axios.get(adminUrl);
      
      if (adminResponse.data.success) {
        const adminData = adminResponse.data.data;
        console.log('✅ Admin API Success');
        console.log(`📊 Admin Data Type: ${Array.isArray(adminData) ? 'Array' : 'Object'}`);
        
        if (adminData) {
          if (Array.isArray(adminData)) {
            console.log(`📊 Admin Count: ${adminData.length}`);
            if (adminData.length > 0) {
              const sample = adminData[0];
              console.log('📋 Sample Admin:');
              console.log(`  - Name: ${sample.firstName} ${sample.lastName}`);
              console.log(`  - Email: ${sample.email}`);
            }
          } else {
            console.log('📋 Admin Details:');
            console.log(`  - Name: ${adminData.firstName} ${adminData.lastName}`);
            console.log(`  - Email: ${adminData.email}`);
          }
        }
      } else {
        console.log('❌ Admin API Failed:', adminResponse.data.message);
      }
    } catch (adminError) {
      console.log('❌ Admin API Error:', adminError.response?.status, adminError.response?.data?.message || adminError.message);
    }

    console.log('');

    // Test 3: Client API
    console.log('3️⃣ Testing Client API...');
    try {
      const clientUrl = `${BASE_URL}/api/clients?id=${TEST_CLIENT_ID}`;
      console.log(`📤 Client API Request: ${clientUrl}`);
      
      const clientResponse = await axios.get(clientUrl);
      
      if (clientResponse.data.success) {
        const clientData = clientResponse.data.data;
        console.log('✅ Client API Success');
        console.log('📋 Client Details:');
        console.log(`  - Company Name: ${clientData.name}`);
        console.log(`  - Email: ${clientData.email}`);
        console.log(`  - Phone: ${clientData.phoneNumber}`);
        console.log(`  - City: ${clientData.city}`);
      } else {
        console.log('❌ Client API Failed:', clientResponse.data.message);
      }
    } catch (clientError) {
      console.log('❌ Client API Error:', clientError.response?.status, clientError.response?.data?.message || clientError.message);
    }

    console.log('');
    console.log('===================================');
    console.log('STAFF AND ADMIN LOADING TEST COMPLETE');
    console.log('===================================');
    
  } catch (error) {
    console.log('\n===================================');
    console.log('❌ STAFF AND ADMIN LOADING TEST FAILED');
    console.log('===================================');
    console.error('Error details:', error.message);
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Make sure your Next.js server is running');
    console.log('2. Update TEST_CLIENT_ID with a real client ID from your database');
    console.log('3. Check if the client exists in the database');
    console.log('4. Verify staff and admin data exists for this client');
    console.log('5. Check the API logs for any errors');
  }
}

// Run the test
console.log('⚠️ IMPORTANT: Update TEST_CLIENT_ID with a real client ID before running this test');
console.log('You can find client IDs in your MongoDB database in the clients collection');
console.log('');

testStaffAdminLoading().catch(console.error);