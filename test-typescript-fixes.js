/**
 * Test script to verify TypeScript fixes in project [id] route
 * Tests the main functionality and error handling improvements
 */

const BASE_URL = 'http://localhost:3000';
const CLIENT_ID = '6941b27c7fdcea3d37e02ada';

async function testProjectRouteTypescriptFixes() {
  console.log('🧪 Testing TypeScript fixes in project [id] route...\n');

  // Test 1: GET project with proper error handling
  console.log('1️⃣ Testing GET project with invalid ID format...');
  try {
    const response = await fetch(`${BASE_URL}/api/project/invalid-id?clientId=${CLIENT_ID}`);
    const data = await response.json();
    
    if (response.status === 400 && data.message.includes('Invalid project ID format')) {
      console.log('✅ GET properly validates ObjectId format');
    } else {
      console.log('❌ GET validation failed:', data);
    }
  } catch (error) {
    console.log('❌ GET test failed:', error.message);
  }

  // Test 2: PUT with invalid JSON
  console.log('\n2️⃣ Testing PUT with invalid JSON...');
  try {
    const response = await fetch(`${BASE_URL}/api/project/507f1f77bcf86cd799439011`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    const data = await response.json();
    
    if (response.status === 400 && data.message.includes('Invalid JSON')) {
      console.log('✅ PUT properly handles invalid JSON');
    } else {
      console.log('❌ PUT JSON validation failed:', data);
    }
  } catch (error) {
    console.log('❌ PUT JSON test failed:', error.message);
  }

  // Test 3: PUT with empty body
  console.log('\n3️⃣ Testing PUT with empty body...');
  try {
    const response = await fetch(`${BASE_URL}/api/project/507f1f77bcf86cd799439011`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    
    if (response.status === 400 && data.message.includes('No update data provided')) {
      console.log('✅ PUT properly validates empty update data');
    } else {
      console.log('❌ PUT empty body validation failed:', data);
    }
  } catch (error) {
    console.log('❌ PUT empty body test failed:', error.message);
  }

  // Test 4: DELETE with invalid ID format
  console.log('\n4️⃣ Testing DELETE with invalid ID format...');
  try {
    const response = await fetch(`${BASE_URL}/api/project/invalid-id`, {
      method: 'DELETE'
    });
    const data = await response.json();
    
    if (response.status === 400 && data.message.includes('Invalid project ID format')) {
      console.log('✅ DELETE properly validates ObjectId format');
    } else {
      console.log('❌ DELETE validation failed:', data);
    }
  } catch (error) {
    console.log('❌ DELETE test failed:', error.message);
  }

  console.log('\n🎉 TypeScript fixes testing completed!');
  console.log('\n📋 Summary of fixes applied:');
  console.log('• Removed deprecated new mongoose.Types.ObjectId() constructor');
  console.log('• Added proper type guards for Mongoose .lean() results');
  console.log('• Improved error handling for JSON parsing');
  console.log('• Added validation for empty update data');
  console.log('• Enhanced logging with proper error context');
  console.log('• Removed unused variables to eliminate hints');
  console.log('• Added better type safety with ProjectDocument interface');
}

// Run the test
testProjectRouteTypescriptFixes().catch(console.error);