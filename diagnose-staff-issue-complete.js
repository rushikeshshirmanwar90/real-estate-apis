const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada'; // Update this with your actual clientId

async function diagnoseStaffIssue() {
  console.log('🔍 COMPREHENSIVE STAFF ISSUE DIAGNOSIS');
  console.log('=====================================');
  console.log('This script will identify exactly why staff is not loading');
  console.log('=====================================\n');
  
  try {
    console.log('📋 Configuration:');
    console.log(`  - Base URL: ${BASE_URL}`);
    console.log(`  - Client ID: ${TEST_CLIENT_ID}`);
    console.log('');

    // Step 1: Test server connectivity
    console.log('1️⃣ Testing server connectivity...');
    try {
      const healthCheck = await axios.get(`${BASE_URL}/api/clients`, { timeout: 5000 });
      console.log('✅ Server is running and responding');
      console.log(`   - Status: ${healthCheck.status}`);
    } catch (serverError) {
      console.log('❌ Server connectivity failed');
      console.log(`   - Error: ${serverError.message}`);
      console.log('💡 Solution: Start your Next.js server with: cd real-estate-web && npm run dev');
      return;
    }

    // Step 2: Test client API
    console.log('\n2️⃣ Testing client API...');
    try {
      const clientResponse = await axios.get(`${BASE_URL}/api/clients?id=${TEST_CLIENT_ID}`);
      
      console.log(`   - Status: ${clientResponse.status}`);
      console.log(`   - Success: ${clientResponse.data.success}`);
      
      if (clientResponse.data.success && clientResponse.data.data) {
        const clientData = clientResponse.data.data;
        console.log('✅ Client found:');
        console.log(`   - Name: ${clientData.name}`);
        console.log(`   - Email: ${clientData.email}`);
        console.log(`   - ID: ${clientData._id}`);
      } else {
        console.log('❌ Client not found or API failed');
        console.log('💡 Check if the clientId is correct');
        
        // Try to get all clients to help debug
        try {
          const allClientsResponse = await axios.get(`${BASE_URL}/api/clients`);
          if (allClientsResponse.data.success && allClientsResponse.data.data.clients) {
            console.log('\n📋 Available clients (first 3):');
            allClientsResponse.data.data.clients.slice(0, 3).forEach((client, index) => {
              console.log(`   ${index + 1}. ID: ${client._id}, Name: ${client.name}`);
            });
          }
        } catch (err) {
          console.log('   - Could not fetch available clients');
        }
        return;
      }
    } catch (clientError) {
      console.log('❌ Client API failed');
      console.log(`   - Status: ${clientError.response?.status || 'No status'}`);
      console.log(`   - Error: ${clientError.response?.data?.message || clientError.message}`);
      return;
    }

    // Step 3: Test both staff API endpoints
    console.log('\n3️⃣ Testing staff API endpoints...');
    
    // Test old endpoint
    console.log('\n   🔍 Testing old endpoint: /api/(users)/staff');
    try {
      const oldStaffResponse = await axios.get(`${BASE_URL}/api/(users)/staff?clientId=${TEST_CLIENT_ID}`);
      console.log(`   ✅ Old endpoint works - Status: ${oldStaffResponse.status}`);
      console.log(`   - Success: ${oldStaffResponse.data.success}`);
      console.log(`   - Data count: ${Array.isArray(oldStaffResponse.data.data) ? oldStaffResponse.data.data.length : 'Not array'}`);
    } catch (oldError) {
      console.log(`   ❌ Old endpoint failed - Status: ${oldError.response?.status || 'No status'}`);
      console.log(`   - Error: ${oldError.response?.data?.message || oldError.message}`);
    }

    // Test new endpoint
    console.log('\n   🔍 Testing new endpoint: /api/(users)/staff');
    try {
      const newStaffResponse = await axios.get(`${BASE_URL}/api/(users)/staff?clientId=${TEST_CLIENT_ID}`);
      console.log(`   ✅ New endpoint works - Status: ${newStaffResponse.status}`);
      console.log(`   - Success: ${newStaffResponse.data.success}`);
      console.log(`   - Data count: ${Array.isArray(newStaffResponse.data.data) ? newStaffResponse.data.data.length : 'Not array'}`);
      
      // Use the working endpoint for detailed analysis
      if (newStaffResponse.data.success) {
        const staffData = newStaffResponse.data.data;
        
        if (Array.isArray(staffData) && staffData.length > 0) {
          console.log('\n   📋 Staff found:');
          staffData.forEach((staff, index) => {
            console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName}`);
            console.log(`      - Email: ${staff.email}`);
            console.log(`      - Role: ${staff.role}`);
            console.log(`      - ClientId: ${staff.clientId}`);
            console.log('');
          });
          
          console.log('🎉 SUCCESS: Staff data is available via API');
          console.log('💡 The issue might be in the frontend React Native app');
          
        } else {
          console.log('   ❌ No staff found for this clientId');
          console.log('   💡 This suggests staff records don\'t have the correct clientId');
          
          // Check if any staff exist at all
          try {
            const allStaffResponse = await axios.get(`${BASE_URL}/api/staff`);
            if (allStaffResponse.data.success) {
              const allStaff = allStaffResponse.data.data;
              console.log(`   📊 Total staff in database: ${Array.isArray(allStaff) ? allStaff.length : 0}`);
              
              if (Array.isArray(allStaff) && allStaff.length > 0) {
                console.log('\n   📋 All staff (first 3):');
                allStaff.slice(0, 3).forEach((staff, index) => {
                  console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName}`);
                  console.log(`      - ClientId: ${staff.clientId || 'NOT SET'}`);
                });
                
                // Show distinct clientIds
                const clientIds = [...new Set(allStaff.map(staff => staff.clientId))];
                console.log('\n   📋 Distinct clientIds in staff:');
                clientIds.forEach((id, index) => {
                  const count = allStaff.filter(staff => staff.clientId === id).length;
                  console.log(`   ${index + 1}. "${id || 'NULL/UNDEFINED'}" (${count} staff)`);
                });
                
                console.log('\n   💡 SOLUTION: Update staff records to have correct clientId');
                console.log('   💡 Run: node fix-staff-clientid.js');
              } else {
                console.log('   ❌ No staff exist in database at all');
                console.log('   💡 SOLUTION: Add staff members through the admin panel');
              }
            }
          } catch (allStaffError) {
            console.log('   ❌ Could not fetch all staff');
          }
        }
      }
    } catch (newError) {
      console.log(`   ❌ New endpoint failed - Status: ${newError.response?.status || 'No status'}`);
      console.log(`   - Error: ${newError.response?.data?.message || newError.message}`);
    }

    // Step 4: Test admin API
    console.log('\n4️⃣ Testing admin API...');
    try {
      const adminResponse = await axios.get(`${BASE_URL}/api/admin?clientId=${TEST_CLIENT_ID}`);
      console.log(`   - Status: ${adminResponse.status}`);
      console.log(`   - Success: ${adminResponse.data.success}`);
      
      if (adminResponse.data.success && adminResponse.data.data) {
        const adminData = adminResponse.data.data;
        console.log('   ✅ Admin found:');
        console.log(`   - Name: ${adminData.firstName} ${adminData.lastName}`);
        console.log(`   - Email: ${adminData.email}`);
      } else {
        console.log('   ❌ No admin found for this clientId');
      }
    } catch (adminError) {
      console.log(`   ❌ Admin API failed - Status: ${adminError.response?.status || 'No status'}`);
      console.log(`   - Error: ${adminError.response?.data?.message || adminError.message}`);
    }

    // Step 5: Test the exact URLs that React Native app uses
    console.log('\n5️⃣ Testing React Native app URLs...');
    
    const domain = 'http://localhost:3000'; // This should match your React Native app's domain
    
    try {
      console.log(`   🔍 Testing: ${domain}/api/(users)/staff?clientId=${TEST_CLIENT_ID}`);
      const rnStaffResponse = await axios.get(`${domain}/api/(users)/staff?clientId=${TEST_CLIENT_ID}`);
      console.log(`   ✅ React Native staff URL works - Status: ${rnStaffResponse.status}`);
      console.log(`   - Data count: ${Array.isArray(rnStaffResponse.data.data) ? rnStaffResponse.data.data.length : 'Not array'}`);
    } catch (rnStaffError) {
      console.log(`   ❌ React Native staff URL failed - Status: ${rnStaffError.response?.status || 'No status'}`);
      console.log(`   - Error: ${rnStaffError.response?.data?.message || rnStaffError.message}`);
    }

    try {
      console.log(`   🔍 Testing: ${domain}/api/(users)/admin?clientId=${TEST_CLIENT_ID}`);
      const rnAdminResponse = await axios.get(`${domain}/api/(users)/admin?clientId=${TEST_CLIENT_ID}`);
      console.log(`   ✅ React Native admin URL works - Status: ${rnAdminResponse.status}`);
      console.log(`   - Has data: ${rnAdminResponse.data.data ? 'Yes' : 'No'}`);
    } catch (rnAdminError) {
      console.log(`   ❌ React Native admin URL failed - Status: ${rnAdminError.response?.status || 'No status'}`);
      console.log(`   - Error: ${rnAdminError.response?.data?.message || rnAdminError.message}`);
    }

    console.log('\n=====================================');
    console.log('DIAGNOSIS COMPLETE');
    console.log('=====================================');

  } catch (error) {
    console.log('\n❌ DIAGNOSIS FAILED');
    console.error('Error:', error.message);
  }
}

// Instructions
console.log('📋 INSTRUCTIONS:');
console.log('1. Update TEST_CLIENT_ID with your actual clientId');
console.log('2. Make sure your Next.js server is running (npm run dev)');
console.log('3. Run this script to see exactly what\'s wrong');
console.log('');

diagnoseStaffIssue().catch(console.error);