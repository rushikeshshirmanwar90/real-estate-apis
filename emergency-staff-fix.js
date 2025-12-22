const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada'; // From your logs

async function emergencyStaffFix() {
  console.log('🚨 EMERGENCY STAFF FIX');
  console.log('======================');
  console.log('This script will diagnose and attempt to fix the staff loading issue');
  console.log('======================\n');
  
  try {
    console.log('📋 Configuration:');
    console.log(`  - Base URL: ${BASE_URL}`);
    console.log(`  - Client ID: ${TEST_CLIENT_ID}`);
    console.log('');

    // Step 1: Test if server is running
    console.log('1️⃣ Testing if server is running...');
    try {
      const healthCheck = await axios.get(`${BASE_URL}/api/clients`);
      console.log('✅ Server is running and responding');
    } catch (serverError) {
      console.log('❌ Server is not responding');
      console.log('💡 Make sure your Next.js server is running with: npm run dev');
      return;
    }

    // Step 2: Test client API
    console.log('\n2️⃣ Testing client API...');
    try {
      const clientResponse = await axios.get(`${BASE_URL}/api/clients?id=${TEST_CLIENT_ID}`);
      
      if (clientResponse.data.success) {
        const clientData = clientResponse.data.data;
        console.log('✅ Client found:');
        console.log(`   - Name: ${clientData.name}`);
        console.log(`   - Email: ${clientData.email}`);
        console.log(`   - ID: ${clientData._id}`);
      } else {
        console.log('❌ Client not found');
        console.log('💡 The clientId might be incorrect');
        
        // Try to get all clients
        const allClientsResponse = await axios.get(`${BASE_URL}/api/clients`);
        if (allClientsResponse.data.success && allClientsResponse.data.data.clients) {
          console.log('\n📋 Available clients:');
          allClientsResponse.data.data.clients.slice(0, 5).forEach((client, index) => {
            console.log(`   ${index + 1}. ID: ${client._id}, Name: ${client.name}`);
          });
        }
        return;
      }
    } catch (clientError) {
      console.log('❌ Client API Error:', clientError.response?.data?.message || clientError.message);
      return;
    }

    // Step 3: Test staff API with detailed logging
    console.log('\n3️⃣ Testing staff API...');
    try {
      const staffResponse = await axios.get(`${BASE_URL}/api/(users)/staff?clientId=${TEST_CLIENT_ID}`);
      
      console.log('📥 Staff API Response:');
      console.log(`   - Status: ${staffResponse.status}`);
      console.log(`   - Success: ${staffResponse.data.success}`);
      console.log(`   - Message: ${staffResponse.data.message || 'No message'}`);
      
      if (staffResponse.data.success) {
        const staffData = staffResponse.data.data;
        console.log(`   - Data Type: ${Array.isArray(staffData) ? 'Array' : typeof staffData}`);
        console.log(`   - Staff Count: ${Array.isArray(staffData) ? staffData.length : 'N/A'}`);
        
        if (Array.isArray(staffData) && staffData.length > 0) {
          console.log('✅ Staff found! The issue might be in the frontend.');
          console.log('\n📋 Staff Members:');
          staffData.forEach((staff, index) => {
            console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email})`);
          });
        } else {
          console.log('❌ No staff found for this clientId');
          
          // Try to get all staff
          console.log('\n🔍 Checking all staff in database...');
          const allStaffResponse = await axios.get(`${BASE_URL}/api/(users)/staff`);
          
          if (allStaffResponse.data.success) {
            const allStaff = allStaffResponse.data.data;
            console.log(`📊 Total staff in database: ${Array.isArray(allStaff) ? allStaff.length : 0}`);
            
            if (Array.isArray(allStaff) && allStaff.length > 0) {
              console.log('\n📋 All Staff (first 5):');
              allStaff.slice(0, 5).forEach((staff, index) => {
                console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName}`);
                console.log(`      - Email: ${staff.email}`);
                console.log(`      - ClientId: ${staff.clientId || 'NOT SET'}`);
                console.log('');
              });

              // Check distinct clientIds
              const clientIds = [...new Set(allStaff.map(staff => staff.clientId))];
              console.log('📋 Distinct clientIds in staff:');
              clientIds.forEach((id, index) => {
                const count = allStaff.filter(staff => staff.clientId === id).length;
                console.log(`   ${index + 1}. "${id || 'NULL/UNDEFINED'}" (${count} staff)`);
              });

              // Check if we can fix the clientId issue
              const staffWithoutClientId = allStaff.filter(staff => 
                !staff.clientId || staff.clientId === null || staff.clientId === ''
              );
              
              if (staffWithoutClientId.length > 0) {
                console.log(`\n🔧 Found ${staffWithoutClientId.length} staff without clientId`);
                console.log('💡 These can be fixed by setting their clientId');
                
                // Attempt to fix them
                console.log('\n4️⃣ Attempting to fix staff clientId...');
                
                let fixedCount = 0;
                for (const staff of staffWithoutClientId) {
                  try {
                    const updateResponse = await axios.put(
                      `${BASE_URL}/api/(users)/staff?id=${staff._id}&clientId=${TEST_CLIENT_ID}`,
                      { clientId: TEST_CLIENT_ID }
                    );
                    
                    if (updateResponse.data.success) {
                      console.log(`✅ Fixed: ${staff.firstName} ${staff.lastName}`);
                      fixedCount++;
                    } else {
                      console.log(`❌ Failed to fix: ${staff.firstName} ${staff.lastName}`);
                    }
                  } catch (updateError) {
                    console.log(`❌ Error fixing ${staff.firstName} ${staff.lastName}:`, updateError.response?.data?.message || updateError.message);
                  }
                }
                
                console.log(`\n📊 Fixed ${fixedCount} out of ${staffWithoutClientId.length} staff`);
                
                if (fixedCount > 0) {
                  console.log('\n5️⃣ Re-testing staff API after fix...');
                  const retestResponse = await axios.get(`${BASE_URL}/api/(users)/staff?clientId=${TEST_CLIENT_ID}`);
                  
                  if (retestResponse.data.success) {
                    const retestData = retestResponse.data.data;
                    console.log(`✅ Staff now found: ${Array.isArray(retestData) ? retestData.length : 0} items`);
                    
                    if (Array.isArray(retestData) && retestData.length > 0) {
                      console.log('🎉 SUCCESS! Staff should now appear in your app');
                      console.log('💡 Restart your React Native app to see the changes');
                    }
                  }
                }
              } else {
                console.log('\n❌ All staff have clientId set, but none match the target clientId');
                console.log('💡 This suggests the clientId in your app might be wrong');
                console.log(`💡 Expected: ${TEST_CLIENT_ID}`);
                console.log('💡 Check the getClientId() function in your app');
              }
            } else {
              console.log('❌ No staff exist in the database at all');
              console.log('💡 You need to add staff members first');
            }
          }
        }
      } else {
        console.log('❌ Staff API returned success: false');
        console.log(`   - Error: ${staffResponse.data.error || 'Unknown error'}`);
      }
    } catch (staffError) {
      console.log('❌ Staff API Error:');
      console.log(`   - Status: ${staffError.response?.status || 'No status'}`);
      console.log(`   - Message: ${staffError.response?.data?.message || staffError.message}`);
      
      if (staffError.response?.status === 404) {
        console.log('💡 The API endpoint might not exist. Check if the route file exists.');
      }
    }

    // Step 4: Test admin API
    console.log('\n6️⃣ Testing admin API...');
    try {
      const adminResponse = await axios.get(`${BASE_URL}/api/(users)/admin?clientId=${TEST_CLIENT_ID}`);
      
      if (adminResponse.data.success) {
        const adminData = adminResponse.data.data;
        console.log(`✅ Admin API works: ${adminData ? 'Admin found' : 'No admin'}`);
      } else {
        console.log('❌ Admin API failed:', adminResponse.data.message);
      }
    } catch (adminError) {
      console.log('❌ Admin API Error:', adminError.response?.data?.message || adminError.message);
    }

    console.log('\n======================');
    console.log('EMERGENCY FIX COMPLETE');
    console.log('======================');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. If staff were fixed above, restart your React Native app');
    console.log('2. If no staff exist, add some staff members first');
    console.log('3. If clientId mismatch, check getClientId() function');
    console.log('4. If API errors, check server logs for more details');

  } catch (error) {
    console.log('\n======================');
    console.log('❌ EMERGENCY FIX FAILED');
    console.log('======================');
    console.error('Error details:', error.message);
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure your Next.js server is running');
    console.log('2. Check if the API routes exist');
    console.log('3. Verify the clientId is correct');
    console.log('4. Check server console for errors');
    console.log('5. Try restarting both frontend and backend');
  }
}

// Run the emergency fix
console.log('🚨 This script will attempt to diagnose and fix the staff loading issue');
console.log('💡 Make sure your Next.js server is running before proceeding');
console.log('');

emergencyStaffFix().catch(console.error);