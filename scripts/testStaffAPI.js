/**
 * Test script to verify staff API endpoint returns assignedProjects
 */

require('dotenv').config();
const axios = require('axios');

async function testStaffAPI() {
  try {
    console.log("🧪 Testing Staff API Endpoint");
    
    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:8080';
    const testEmail = 'shrimanwarsuresh118@gmail.com'; // From our test data
    
    console.log(`📡 Testing API: ${domain}/api/staff?email=${testEmail}`);
    
    try {
      const response = await axios.get(`${domain}/api/staff?email=${testEmail}`);
      
      console.log("✅ API Response Status:", response.status);
      console.log("📦 API Response Data:");
      console.log(JSON.stringify(response.data, null, 2));
      
      const userData = response.data.data;
      if (userData) {
        console.log("\n📋 User Data Analysis:");
        console.log(`   Name: ${userData.firstName} ${userData.lastName}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: ${userData.role}`);
        console.log(`   Has assignedProjects: ${'assignedProjects' in userData}`);
        console.log(`   assignedProjects count: ${userData.assignedProjects?.length || 0}`);
        
        if (userData.assignedProjects && userData.assignedProjects.length > 0) {
          console.log("\n📝 Assigned Projects:");
          userData.assignedProjects.forEach((project, index) => {
            console.log(`   ${index + 1}. ${project.projectName} (${project.clientName})`);
          });
          console.log("\n✅ SUCCESS: API returns assignedProjects correctly!");
        } else {
          console.log("\n❌ ISSUE: API response missing assignedProjects or empty");
        }
      } else {
        console.log("❌ No user data in API response");
      }
      
    } catch (apiError) {
      console.error("❌ API Error:", apiError.response?.status, apiError.response?.statusText);
      console.error("❌ API Error Data:", apiError.response?.data);
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testStaffAPI();