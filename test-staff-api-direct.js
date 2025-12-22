const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada'; // From your logs

async function testStaffApiDirect() {
  console.log('🧪 TESTING STAFF API DIRECTLY');
  console.log('=============================');
  console.log('Testing the exact API calls that the frontend is making');
  console.log('=============================\n');
  
  try {
    console.log('📋 Test Configuration:');
    console.log(`  - Base URL: ${BASE_URL}`);
    console.log(`  - Client ID: ${TEST_CLIENT_ID}`);
    console.log('');

    // Test 1: Staff API with detailed logging
    console.log('1️⃣ Testing Staff API with detailed response...');
    try {
      const staffUrl = `${BASE_URL}/api/(users)/staff?clientId=${TEST_CLIENT_ID}`;
      console.log(`📤 Staff API Request: ${staffUrl}`);
      
      const staffResponse = await axios.get(staffUrl);
      
      console.log('📥 Staff API Response:');
      console.log(`   - Status: ${staffResponse.status}`);
      console.log(`   - Success: ${staffResponse.data.success}`);
      console.log(`   - Message: ${staffResponse.data.message || 'No message'}`);
      
      if (staffResponse.data.success) {
        const staffData = staffResponse.data.data;
        console.log(`   - Data Type: ${Array.isArray(staffData) ? 'Array' : typeof staffData}`);
        console.log(`   - Staff Count: ${Array.isArray(staffData) ? staffData.length : 'N/A'}`);
        
        if (Array.isArray(staffData)) {
          if (staffData.length > 0) {
            console.log('\n📋 Staff Members Found:');
            staffData.forEach((staff, index) => {
              console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName}`);
              console.log(`      - Email: ${staff.email}`);
              console.log(`      - Role: ${staff.role}`);
              console.log(`      - ClientId: ${staff.clientId}`);
              console.log(`      - ID: ${staff._id}`);
              console.log('');
            });
          } else {
            console.log('❌ Staff array is empty - no staff found for this clientId');
          }
        } else {
          console.log('❌ Staff data is not an array:', staffData);
        }
      } else {
        console.log('❌ Staff API returned success: false');
        console.log(`   - Error: ${staffResponse.data.error || 'Unknown error'}`);
      }
    } catch (staffError) {
      console.log('❌ Staff API Error:');
      console.log(`   - Status: ${staffError.response?.status || 'No status'}`);
      console.log(`   - Message: ${staffError.response?.data?.message || staffError.message}`);
      console.log(`   - Full Error: ${JSON.stringify(staffError.response?.data, null, 2)}`);
    }

    console.log('\n');

    // Test 2: Try to get all staff without clientId filter
    console.log('2️⃣ Testing Staff API without clientId filter...');
    try {
      const allStaffUrl = `${BASE_URL}/api/(users)/staff`;
      console.log(`📤 All Staff API Request: ${allStaffUrl}`);
      
      const allStaffResponse = await axios.get(allStaffUrl);
      
      if (allStaffResponse.data.success) {
        const allStaffData = allStaffResponse.data.data;
        console.log(`✅ Total staff in database: ${Array.isArray(allStaffData) ? allStaffData.length : 'N/A'}`);
        
        if (Array.isArray(allStaffData) && allStaffData.length > 0) {
          console.log('\n📋 All Staff Members (first 5):');
          allStaffData.slice(0, 5).forEach((staff, index) => {
            console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName}`);
            console.log(`      - Email: ${staff.email}`);
            console.log(`      - ClientId: ${staff.clientId || 'NOT SET'}`);
            console.log('');
          });

          // Check if any staff have the target clientId
          const matchingStaff = allStaffData.filter(staff => staff.clientId === TEST_CLIENT_ID);
          console.log(`🔍 Staff with clientId "${TEST_CLIENT_ID}": ${matchingStaff.length}`);

          // Check distinct clientIds
          const clientIds = [...new Set(allStaffData.map(staff => staff.clientId))];
          console.log('\n📋 Distinct clientIds found in staff:');
          clientIds.forEach((id, index) => {
            const count = allStaffData.filter(staff => staff.clientId === id).length;
            console.log(`   ${index + 1}. "${id || 'NULL/UNDEFINED'}" (${count} staff)`);
          });
        }
      } else {
        console.log('❌ All Staff API failed:', allStaffResponse.data.message);
      }
    } catch (allStaffError) {
      console.log('❌ All Staff API Error:', allStaffError.response?.data?.message || allStaffError.message);
    }

    console.log('\n');

    // Test 3: Test client API to verify clientId is valid
    console.log('3️⃣ Verifying client exists...');
    try {
      const clientUrl = `${BASE_URL}/api/clients?id=${TEST_CLIENT_ID}`;
      console.log(`📤 Client API Request: ${clientUrl}`);
      
      const clientResponse = await axios.get(clientUrl);
      
      if (clientResponse.data.success) {
        const clientData = clientResponse.data.data;
        console.log('✅ Client found:');
        console.log(`   - Name: ${clientData.name}`);
        console.log(`   - Email: ${clientData.email}`);
        console.log(`   - ID: ${clientData._id}`);
      } else {
        console.log('❌ Client not found:', clientResponse.data.message);
      }
    } catch (clientError) {
      console.log('❌ Client API Error:', clientError.response?.data?.message || clientError.message);
    }

    console.log('\n=============================');
    console.log('DIAGNOSIS SUMMARY');
    console.log('=============================');
    
    console.log('Based on the test results above:');
    console.log('1. If client exists but no staff found with clientId:');
    console.log('   → Staff records may have different/missing clientId values');
    console.log('   → Need to update staff records with correct clientId');
    console.log('');
    console.log('2. If staff exist but with different clientIds:');
    console.log('   → Check if you are using the correct clientId in your app');
    console.log('   → Verify the clientId from getClientId() function');
    console.log('');
    console.log('3. If no staff exist at all:');
    console.log('   → Need to add staff members to the database first');

  } catch (error) {
    console.log('\n=============================');
    console.log('❌ STAFF API TEST FAILED');
    console.log('=============================');
    console.error('Error details:', error.message);
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Make sure your Next.js server is running on the correct port');
    console.log('2. Check if the API routes exist and are accessible');
    console.log('3. Verify the clientId is correct');
    console.log('4. Check server logs for any errors');
  }
}

// Run the test
console.log('ℹ️ This script will test the staff API directly to diagnose the issue');
console.log('');

testStaffApiDirect().catch(console.error);