/**
 * Test script to debug password API issues
 * Tests the password setting API with different user types and scenarios
 */

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'rushikeshshrimanwar@gmail.com'; // Use your test email

async function testPasswordApiDebug() {
  console.log('🔐 Testing Password API Debug...\n');

  // Test 1: Find user type first
  console.log('1️⃣ Finding user type...');
  let userType = null;
  try {
    const response = await fetch(`${BASE_URL}/api/findUser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    const data = await response.json();
    
    if (response.ok) {
      userType = data.isUser?.userType;
      console.log('✅ User found');
      console.log(`   User Type: ${userType}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, data);
    } else {
      console.log('❌ User not found:', data.message);
      return;
    }
  } catch (error) {
    console.log('❌ User type detection failed:', error.message);
    return;
  }

  // Test 2: Test password validation
  console.log('\n2️⃣ Testing password validation...');
  const testPasswords = [
    'weak',                    // Too weak
    'WeakPassword',           // Missing number and special char
    'WeakPassword123',        // Missing special char
    'WeakPassword123!',       // Should be valid
  ];

  for (const testPassword of testPasswords) {
    console.log(`\n   Testing password: "${testPassword}"`);
    try {
      const response = await fetch(`${BASE_URL}/api/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: TEST_EMAIL, 
          password: testPassword,
          userType: userType
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Password accepted: ${data.message}`);
      } else {
        console.log(`   ❌ Password rejected: ${data.message}`);
      }
    } catch (error) {
      console.log(`   ❌ API error: ${error.message}`);
    }
  }

  // Test 3: Test different user types
  console.log('\n3️⃣ Testing different user types...');
  const testUserTypes = ['admin', 'user', 'users', 'staff', 'client', 'clients'];
  const validPassword = 'TestPassword123!';

  for (const testUserType of testUserTypes) {
    console.log(`\n   Testing user type: "${testUserType}"`);
    try {
      const response = await fetch(`${BASE_URL}/api/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: TEST_EMAIL, 
          password: validPassword,
          userType: testUserType
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ User type accepted: ${data.message}`);
      } else {
        console.log(`   ❌ User type rejected: ${data.message}`);
      }
    } catch (error) {
      console.log(`   ❌ API error: ${error.message}`);
    }
  }

  // Test 4: Test with the actual detected user type
  console.log(`\n4️⃣ Testing with detected user type: "${userType}"`);
  try {
    const response = await fetch(`${BASE_URL}/api/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_EMAIL, 
        password: 'FinalTestPassword123!',
        userType: userType
      })
    });
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, data);
    
    if (response.ok) {
      console.log(`   ✅ Password set successfully!`);
    } else {
      console.log(`   ❌ Password setting failed: ${data.message}`);
    }
  } catch (error) {
    console.log(`   ❌ API error: ${error.message}`);
  }

  // Test 5: Test login with new password
  console.log('\n5️⃣ Testing login with new password...');
  try {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_EMAIL, 
        password: 'FinalTestPassword123!'
      })
    });
    const data = await response.json();
    
    if (response.ok) {
      console.log('   ✅ Login successful with new password!');
    } else {
      console.log('   ❌ Login failed:', data.message);
    }
  } catch (error) {
    console.log('   ❌ Login test failed:', error.message);
  }

  console.log('\n🎉 Password API Debug testing completed!');
  console.log('\n📋 Debug Information:');
  console.log(`• Detected User Type: ${userType}`);
  console.log('• Check the server logs for detailed error information');
  console.log('• Look for console.log messages starting with 🔐, ✅, or ❌');
}

// Run the test
testPasswordApiDebug().catch(console.error);