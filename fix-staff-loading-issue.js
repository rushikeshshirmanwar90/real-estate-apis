const axios = require('axios');

// Configuration - Update these values
const BASE_URL = 'http://localhost:3000';
const TARGET_CLIENT_ID = '6941b27c7fdcea3d37e02ada'; // Update with your actual clientId

async function fixStaffLoadingIssue() {
  console.log('🔧 FIXING STAFF LOADING ISSUE');
  console.log('=============================');
  console.log('This script will attempt to fix the most common staff loading problems');
  console.log('=============================\n');

  try {
    // Step 1: Verify server is running
    console.log('1️⃣ Checking server status...');
    try {
      await axios.get(`${BASE_URL}/api/clients`, { timeout: 5000 });
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running');
      console.log('💡 Start your server with: cd real-estate-web && npm run dev');
      return;
    }

    // Step 2: Check if client exists
    console.log('\n2️⃣ Verifying client exists...');
    try {
      const clientResponse = await axios.get(`${BASE_URL}/api/clients?id=${TARGET_CLIENT_ID}`);
      if (clientResponse.data.success && clientResponse.data.data) {
        console.log(`✅ Client found: ${clientResponse.data.data.name}`);
      } else {
        console.log('❌ Client not found');
        console.log('💡 Check if the TARGET_CLIENT_ID is correct');
        return;
      }
    } catch (error) {
      console.log('❌ Client verification failed');
      return;
    }

    // Step 3: Check current staff situation
    console.log('\n3️⃣ Checking staff data...');
    try {
      const staffResponse = await axios.get(`${BASE_URL}/api/(users)/staff?clientId=${TARGET_CLIENT_ID}`);
      
      if (staffResponse.data.success) {
        const staffData = staffResponse.data.data;
        console.log(`📊 Staff found for clientId: ${Array.isArray(staffData) ? staffData.length : 0}`);
        
        if (Array.isArray(staffData) && staffData.length > 0) {
          console.log('✅ Staff data is available! The issue might be in the React Native app.');
          console.log('\n📋 Staff members:');
          staffData.forEach((staff, index) => {
            console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email})`);
          });
          
          console.log('\n💡 SOLUTION: Restart your React Native app');
          console.log('   cd Xsite && npm start');
          return;
        } else {
          console.log('❌ No staff found for this clientId');
          console.log('🔍 Checking if staff exist with different/missing clientId...');
          
          // Check all staff
          const allStaffResponse = await axios.get(`${BASE_URL}/api/(users)/staff`);
          if (allStaffResponse.data.success) {
            const allStaff = allStaffResponse.data.data;
            console.log(`📊 Total staff in database: ${Array.isArray(allStaff) ? allStaff.length : 0}`);
            
            if (Array.isArray(allStaff) && allStaff.length > 0) {
              // Find staff without correct clientId
              const staffToFix = allStaff.filter(staff => 
                !staff.clientId || 
                staff.clientId === null || 
                staff.clientId === '' ||
                staff.clientId !== TARGET_CLIENT_ID
              );
              
              if (staffToFix.length > 0) {
                console.log(`🔧 Found ${staffToFix.length} staff that need clientId fix`);
                console.log('\n📋 Staff to fix:');
                staffToFix.forEach((staff, index) => {
                  console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName}`);
                  console.log(`      - Current clientId: ${staff.clientId || 'NOT SET'}`);
                });
                
                console.log('\n4️⃣ Fixing staff clientId...');
                let fixedCount = 0;
                
                for (const staff of staffToFix) {
                  try {
                    const updateResponse = await axios.put(
                      `${BASE_URL}/api/(users)/staff?id=${staff._id}&clientId=${TARGET_CLIENT_ID}`,
                      { clientId: TARGET_CLIENT_ID }
                    );
                    
                    if (updateResponse.data.success) {
                      console.log(`✅ Fixed: ${staff.firstName} ${staff.lastName}`);
                      fixedCount++;
                    } else {
                      console.log(`❌ Failed to fix: ${staff.firstName} ${staff.lastName}`);
                    }
                  } catch (updateError) {
                    console.log(`❌ Error fixing ${staff.firstName} ${staff.lastName}:`, 
                      updateError.response?.data?.message || updateError.message);
                  }
                }
                
                console.log(`\n📊 Successfully fixed ${fixedCount} out of ${staffToFix.length} staff`);
                
                if (fixedCount > 0) {
                  console.log('\n5️⃣ Verifying fix...');
                  const verifyResponse = await axios.get(`${BASE_URL}/api/(users)/staff?clientId=${TARGET_CLIENT_ID}`);
                  
                  if (verifyResponse.data.success) {
                    const verifyData = verifyResponse.data.data;
                    console.log(`✅ Staff now available: ${Array.isArray(verifyData) ? verifyData.length : 0}`);
                    
                    if (Array.isArray(verifyData) && verifyData.length > 0) {
                      console.log('\n🎉 SUCCESS! Staff should now load in your app');
                      console.log('💡 Restart your React Native app to see the changes:');
                      console.log('   cd Xsite && npm start');
                    }
                  }
                }
              } else {
                console.log('❌ All staff have correct clientId but still not showing');
                console.log('💡 This might be a different issue. Check React Native logs.');
              }
            } else {
              console.log('❌ No staff exist in database at all');
              console.log('💡 Add staff members through the admin panel first');
            }
          }
        }
      } else {
        console.log('❌ Staff API failed');
        console.log(`Error: ${staffResponse.data.message || 'Unknown error'}`);
      }
    } catch (staffError) {
      console.log('❌ Staff API error');
      console.log(`Status: ${staffError.response?.status || 'No status'}`);
      console.log(`Error: ${staffError.response?.data?.message || staffError.message}`);
      
      if (staffError.response?.status === 404) {
        console.log('💡 API endpoint not found. Check if route files exist.');
      }
    }

    console.log('\n=============================');
    console.log('FIX ATTEMPT COMPLETE');
    console.log('=============================');

  } catch (error) {
    console.log('\n❌ FIX FAILED');
    console.error('Error:', error.message);
    
    console.log('\n🔧 MANUAL STEPS TO TRY:');
    console.log('1. Restart Next.js server: cd real-estate-web && npm run dev');
    console.log('2. Restart React Native: cd Xsite && npm start');
    console.log('3. Check if API routes exist in real-estate-web/app/api/');
    console.log('4. Verify clientId is correct in your app');
    console.log('5. Check MongoDB connection and data');
  }
}

console.log('⚠️ IMPORTANT: Update TARGET_CLIENT_ID at the top of this file');
console.log('⚠️ Make sure your Next.js server is running before running this script');
console.log('');

fixStaffLoadingIssue().catch(console.error);