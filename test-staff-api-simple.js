const axios = require('axios');

// Simple API test without database connection
const testStaffAPI = async () => {
  console.log('🔍 Testing Staff API Endpoints...\n');

  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
  console.log(`Using domain: ${domain}\n`);

  // Test different clientId values - you'll need to replace these with actual values from your database
  const testClientIds = [
    '676b8b8b8b8b8b8b8b8b8b8b', // Replace with actual clientId from your database
    '676b8b8b8b8b8b8b8b8b8b8c', // Replace with another actual clientId
    '676b8b8b8b8b8b8b8b8b8b8d'  // Replace with another actual clientId
  ];

  for (const clientId of testClientIds) {
    console.log(`🔍 Testing with Client ID: ${clientId}`);
    console.log('='.repeat(50));

    try {
      // Test Staff API
      console.log('📡 Testing Staff API...');
      const staffUrl = `${domain}/api/users/staff?clientId=${clientId}`;
      console.log(`URL: ${staffUrl}`);
      
      const staffResponse = await axios.get(staffUrl);
      console.log(`✅ Staff API Status: ${staffResponse.status}`);
      console.log(`Staff Response:`, JSON.stringify(staffResponse.data, null, 2));
      
    } catch (staffError) {
      console.error('❌ Staff API Error:', staffError.message);
      if (staffError.response) {
        console.error('Staff Response Status:', staffError.response.status);
        console.error('Staff Response Data:', JSON.stringify(staffError.response.data, null, 2));
      }
    }

    try {
      // Test Admin API
      console.log('\n📡 Testing Admin API...');
      const adminUrl = `${domain}/api/(users)/admin?clientId=${clientId}`;
      console.log(`URL: ${adminUrl}`);
      
      const adminResponse = await axios.get(adminUrl);
      console.log(`✅ Admin API Status: ${adminResponse.status}`);
      console.log(`Admin Response:`, JSON.stringify(adminResponse.data, null, 2));
      
    } catch (adminError) {
      console.error('❌ Admin API Error:', adminError.message);
      if (adminError.response) {
        console.error('Admin Response Status:', adminError.response.status);
        console.error('Admin Response Data:', JSON.stringify(adminError.response.data, null, 2));
      }
    }

    try {
      // Test Client API
      console.log('\n📡 Testing Client API...');
      const clientUrl = `${domain}/api/clients?id=${clientId}`;
      console.log(`URL: ${clientUrl}`);
      
      const clientResponse = await axios.get(clientUrl);
      console.log(`✅ Client API Status: ${clientResponse.status}`);
      console.log(`Client Response:`, JSON.stringify(clientResponse.data, null, 2));
      
    } catch (clientError) {
      console.error('❌ Client API Error:', clientError.message);
      if (clientError.response) {
        console.error('Client Response Status:', clientError.response.status);
        console.error('Client Response Data:', JSON.stringify(clientError.response.data, null, 2));
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');
  }

  // Test without clientId to see what happens
  console.log('🔍 Testing APIs without clientId...');
  console.log('='.repeat(50));

  try {
    const staffUrl = `${domain}/api/users/staff`;
    console.log(`Testing Staff API without clientId: ${staffUrl}`);
    const staffResponse = await axios.get(staffUrl);
    console.log(`✅ Staff API Status: ${staffResponse.status}`);
    console.log(`Staff Response:`, JSON.stringify(staffResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Staff API without clientId Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  try {
    const adminUrl = `${domain}/api/(users)/admin`;
    console.log(`\nTesting Admin API without clientId: ${adminUrl}`);
    const adminResponse = await axios.get(adminUrl);
    console.log(`✅ Admin API Status: ${adminResponse.status}`);
    console.log(`Admin Response:`, JSON.stringify(adminResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Admin API without clientId Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

// Run the test
testStaffAPI().catch(console.error);