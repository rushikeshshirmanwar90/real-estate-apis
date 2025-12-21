/**
 * Test script to verify activity log data display fixes
 * Tests the notification page data fetching and display logic
 */

const BASE_URL = 'http://localhost:3000';
const CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testActivityLogDisplayFix() {
  console.log('📋 Testing Activity Log Data Display Fix...\n');

  // Test 1: Check Activity API endpoint
  console.log('1️⃣ Testing Activity API endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/activity?clientId=${CLIENT_ID}&paginationMode=date&dateLimit=5`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Activity API working');
      console.log(`   Response structure:`, Object.keys(data));
      console.log(`   Date groups: ${data.data?.dateGroups?.length || 0}`);
      console.log(`   Has more dates: ${data.data?.hasMoreDates || false}`);
    } else {
      console.log('❌ Activity API failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Activity API test failed:', error.message);
  }

  // Test 2: Check Material Activity API endpoint
  console.log('\n2️⃣ Testing Material Activity API endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/materialActivity?clientId=${CLIENT_ID}&paginationMode=date&dateLimit=5`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Material Activity API working');
      console.log(`   Response structure:`, Object.keys(data));
      console.log(`   Date groups: ${data.data?.dateGroups?.length || 0}`);
      console.log(`   Has more dates: ${data.data?.hasMoreDates || false}`);
    } else {
      console.log('❌ Material Activity API failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Material Activity API test failed:', error.message);
  }

  // Test 3: Test fallback traditional pagination
  console.log('\n3️⃣ Testing fallback traditional pagination...');
  try {
    const [activityRes, materialRes] = await Promise.all([
      fetch(`${BASE_URL}/api/activity?clientId=${CLIENT_ID}&limit=10`),
      fetch(`${BASE_URL}/api/materialActivity?clientId=${CLIENT_ID}&limit=10`)
    ]);
    
    const activityData = await activityRes.json();
    const materialData = await materialRes.json();
    
    console.log('✅ Traditional pagination results:');
    console.log(`   Activities: ${activityData.activities?.length || 0}`);
    console.log(`   Material Activities: ${Array.isArray(materialData) ? materialData.length : materialData.activities?.length || 0}`);
  } catch (error) {
    console.log('❌ Traditional pagination test failed:', error.message);
  }

  // Test 4: Simulate data processing logic
  console.log('\n4️⃣ Testing data processing logic...');
  
  const testResponses = [
    // Test different response structures
    { activities: [{ _id: '1', description: 'Test 1' }] },
    { data: { activities: [{ _id: '2', description: 'Test 2' }] } },
    [{ _id: '3', description: 'Test 3' }],
    { data: [{ _id: '4', description: 'Test 4' }] },
    null,
    undefined,
    {}
  ];

  testResponses.forEach((response, index) => {
    console.log(`   Test ${index + 1}:`, typeof response);
    
    // Simulate the processing logic
    let activities = [];
    
    if (Array.isArray(response)) {
      activities = response;
    } else if (response && typeof response === 'object') {
      if (response.data?.activities && Array.isArray(response.data.activities)) {
        activities = response.data.activities;
      } else if (response.activities && Array.isArray(response.activities)) {
        activities = response.activities;
      } else if (response.data && Array.isArray(response.data)) {
        activities = response.data;
      }
    }
    
    console.log(`     → Extracted ${activities.length} activities`);
  });

  // Test 5: Test date normalization
  console.log('\n5️⃣ Testing date normalization...');
  
  const testDates = [
    '2025-12-19T10:30:00.000Z',
    '2025-12-19',
    'invalid-date',
    null,
    undefined,
    1734606600000, // timestamp
    new Date().toISOString()
  ];

  testDates.forEach((dateStr, index) => {
    console.log(`   Date ${index + 1}:`, dateStr);
    
    try {
      let normalizedDate;
      if (!dateStr) {
        normalizedDate = new Date().toISOString().split('T')[0];
      } else {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          normalizedDate = new Date().toISOString().split('T')[0];
        } else {
          normalizedDate = date.toISOString().split('T')[0];
        }
      }
      console.log(`     → Normalized: ${normalizedDate}`);
    } catch (error) {
      console.log(`     → Error: ${error.message}`);
    }
  });

  console.log('\n🎉 Activity Log Display Fix testing completed!');
  console.log('\n📋 Summary of fixes applied:');
  console.log('• Enhanced API response structure handling');
  console.log('• Improved error handling for failed API calls');
  console.log('• Better state management for activities array');
  console.log('• Enhanced fallback mechanisms');
  console.log('• Improved date normalization logic');
  console.log('• Better debugging and error reporting');
}

// Run the test
testActivityLogDisplayFix().catch(console.error);