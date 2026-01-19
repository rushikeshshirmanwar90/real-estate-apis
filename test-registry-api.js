// Simple test script to test the registry API
const fetch = require('node-fetch');

const API_BASE = 'http://10.25.234.56:8080';

async function testRegistryAPI() {
  console.log('🧪 Testing Registry API...');
  
  // Test data
  const testData = {
    bookingId: '507f1f77bcf86cd799439011', // Valid ObjectId format but doesn't exist
    customerName: 'Test Customer',
    mobileNumber: '9876543210',
    address: '123 Test Street, Test City',
    aadharNumber: '123456789012',
    panNumber: 'ABCDE1234F',
    projectName: 'Test Project',
    flatNumber: 'A-101',
    directions: {
      north: 'Main Road',
      south: 'Park',
      east: 'Shopping Mall',
      west: 'School'
    },
    remarks: 'Test registry entry'
  };
  
  try {
    console.log('📤 Sending POST request to registry API...');
    const response = await fetch(`${API_BASE}/api/customer/registry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Registry API test passed!');
      
      // Test GET request
      console.log('📤 Testing GET request...');
      const getResponse = await fetch(`${API_BASE}/api/customer/registry?bookingId=${testData.bookingId}`);
      const getResult = await getResponse.json();
      
      console.log('📥 GET Response status:', getResponse.status);
      console.log('📥 GET Response data:', JSON.stringify(getResult, null, 2));
      
    } else {
      console.log('❌ Registry API test failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testRegistryAPI();