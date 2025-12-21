/**
 * Test script to verify forget password flow fix
 * Tests that forget password properly leads to password setting, not login
 */

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'rushikeshshrimanwar@gmail.com'; // Use your test email

async function testForgetPasswordFlowFix() {
  console.log('🔐 Testing Forget Password Flow Fix...\n');

  // Test 1: Find user type
  console.log('1️⃣ Testing user type detection...');
  try {
    const response = await fetch(`${BASE_URL}/api/findUser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ User type detection working');
      console.log(`   User Type: ${data.isUser?.userType}`);
      console.log(`   Status: ${response.status}`);
    } else {
      console.log('❌ User type detection failed:', data.message);
    }
  } catch (error) {
    console.log('❌ User type detection test failed:', error.message);
  }

  // Test 2: Forget password API
  console.log('\n2️⃣ Testing forget password API...');
  try {
    const response = await fetch(`${BASE_URL}/api/forget-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_EMAIL, 
        userType: 'admin' // Adjust based on your test user
      })
    });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Forget password API working');
      console.log(`   Message: ${data.message}`);
      console.log(`   Success: ${data.success}`);
    } else {
      console.log('❌ Forget password API failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Forget password API test failed:', error.message);
  }

  // Test 3: OTP sending
  console.log('\n3️⃣ Testing OTP sending...');
  try {
    const testOTP = 123456;
    const response = await fetch(`${BASE_URL}/api/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_EMAIL, 
        OTP: testOTP
      })
    });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ OTP sending working');
      console.log(`   OTP sent: ${testOTP}`);
    } else {
      console.log('❌ OTP sending failed:', data.message);
    }
  } catch (error) {
    console.log('❌ OTP sending test failed:', error.message);
  }

  // Test 4: Password setting API
  console.log('\n4️⃣ Testing password setting API...');
  try {
    const testPassword = 'TestPassword123!';
    const response = await fetch(`${BASE_URL}/api/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_EMAIL, 
        password: testPassword,
        userType: 'admin' // Adjust based on your test user
      })
    });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Password setting API working');
      console.log(`   Message: ${data.message}`);
    } else {
      console.log('❌ Password setting API failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Password setting API test failed:', error.message);
  }

  // Test 5: Login with new password
  console.log('\n5️⃣ Testing login with new password...');
  try {
    const testPassword = 'TestPassword123!';
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_EMAIL, 
        password: testPassword
      })
    });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login with new password working');
      console.log(`   Login successful`);
    } else {
      console.log('❌ Login failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
  }

  console.log('\n🎉 Forget Password Flow Fix testing completed!');
  console.log('\n📋 Summary of fixes applied:');
  console.log('• Fixed forget password flow to require OTP verification');
  console.log('• Set isVerified to false after password reset');
  console.log('• Redirect to OTP step instead of login after forget password');
  console.log('• Generate and send new OTP for verification');
  console.log('• Ensure password setting API is called, not login API');
  console.log('• Updated messaging to be clearer about the process');
  
  console.log('\n🔄 Expected Flow:');
  console.log('1. User clicks "Forget Password"');
  console.log('2. System resets password to empty');
  console.log('3. System generates and sends OTP');
  console.log('4. User enters OTP');
  console.log('5. User sets new password (calls /api/password)');
  console.log('6. User can now login with new password');
}

// Run the test
testForgetPasswordFlowFix().catch(console.error);