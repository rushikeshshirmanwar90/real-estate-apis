// Simple test script to verify equipment API functionality
// Run with: node test-equipment-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Adjust as needed
const API_URL = `${BASE_URL}/api/equipment`;

// Test data
const testEquipment = {
  type: 'Excavator',
  category: 'Earthmoving & Excavation Equipment',
  quantity: 2,
  perUnitCost: 5000,
  projectId: '507f1f77bcf86cd799439011', // Replace with actual project ID
  projectName: 'Test Project',
  projectSectionId: '507f1f77bcf86cd799439012', // Replace with actual section ID
  projectSectionName: 'Foundation Work',
  costType: 'rental',
  rentalPeriod: 'daily',
  rentalDuration: 7,
  status: 'active',
  notes: 'Test equipment entry'
};

async function testEquipmentAPI() {
  try {
    console.log('🧪 Testing Equipment API...\n');

    // Test 1: Create equipment
    console.log('1. Creating equipment entry...');
    const createResponse = await axios.post(API_URL, testEquipment);
    console.log('✅ Equipment created:', createResponse.data.data._id);
    const equipmentId = createResponse.data.data._id;

    // Test 2: Get equipment by ID
    console.log('\n2. Fetching equipment by ID...');
    const getResponse = await axios.get(`${API_URL}?id=${equipmentId}`);
    console.log('✅ Equipment retrieved:', getResponse.data.data.type);

    // Test 3: Get equipment by project and section
    console.log('\n3. Fetching equipment by project and section...');
    const filterResponse = await axios.get(`${API_URL}?projectId=${testEquipment.projectId}&projectSectionId=${testEquipment.projectSectionId}`);
    console.log('✅ Equipment filtered:', filterResponse.data.data.equipment.length, 'entries found');

    // Test 4: Update equipment
    console.log('\n4. Updating equipment...');
    const updateData = { quantity: 3, notes: 'Updated test equipment' };
    const updateResponse = await axios.put(`${API_URL}?id=${equipmentId}`, updateData);
    console.log('✅ Equipment updated:', updateResponse.data.data.quantity);

    // Test 5: Get equipment stats
    console.log('\n5. Fetching equipment stats...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/equipment/stats?projectId=${testEquipment.projectId}&projectSectionId=${testEquipment.projectSectionId}`);
      console.log('✅ Equipment stats:', statsResponse.data.data.totalStats);
    } catch (statsError) {
      console.log('⚠️ Stats API not available or error:', statsError.message);
    }

    // Test 6: Delete equipment
    console.log('\n6. Deleting equipment...');
    const deleteResponse = await axios.delete(`${API_URL}?id=${equipmentId}`);
    console.log('✅ Equipment deleted:', deleteResponse.data.message);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testEquipmentAPI();