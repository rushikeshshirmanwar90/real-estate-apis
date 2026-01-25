#!/usr/bin/env node

/**
 * Notification System Test Runner
 * Tests the complete push notification system
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-test',
  testTimeout: 30000,
  verbose: true,
  serverUrl: 'http://localhost:8080', // Updated to correct port
};

console.log('🧪 Starting Notification System Tests...\n');

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function logTest(name, status, message = '') {
  totalTests++;
  const emoji = status === 'PASS' ? '✅' : '❌';
  const result = { name, status, message };
  testResults.push(result);
  
  if (status === 'PASS') {
    passedTests++;
    console.log(`${emoji} ${name}`);
  } else {
    failedTests++;
    console.log(`${emoji} ${name}: ${message}`);
  }
}

// Test 1: Check if server is running
async function testServerHealth() {
  try {
    // Use the notifications metrics endpoint as health check
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/notifications/metrics`);
    if (response.ok || response.status === 400) { // 400 is also acceptable, means server is running
      logTest('Server Health Check', 'PASS');
      return true;
    } else {
      logTest('Server Health Check', 'FAIL', `Server returned ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Server Health Check', 'FAIL', 'Server not running or not accessible');
    return false;
  }
}

// Test 2: Test push token registration API
async function testPushTokenAPI() {
  try {
    const testToken = {
      userId: 'test-user-' + Date.now(),
      userType: 'client',
      token: 'ExponentPushToken[test-token-' + Date.now() + ']',
      platform: 'ios',
      deviceId: 'test-device-123',
      deviceName: 'Test iPhone',
      appVersion: '1.0.0'
    };

    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testToken)
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        logTest('Push Token Registration API', 'PASS');
        return testToken.userId;
      } else {
        logTest('Push Token Registration API', 'FAIL', result.message);
        return null;
      }
    } else {
      logTest('Push Token Registration API', 'FAIL', `HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    logTest('Push Token Registration API', 'FAIL', error.message);
    return null;
  }
}

// Test 3: Test push token retrieval API
async function testPushTokenRetrieval(userId) {
  if (!userId) {
    logTest('Push Token Retrieval API', 'FAIL', 'No user ID from registration test');
    return;
  }

  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/push-token?userId=${userId}`);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        logTest('Push Token Retrieval API', 'PASS');
      } else {
        logTest('Push Token Retrieval API', 'FAIL', 'No tokens found for user');
      }
    } else {
      logTest('Push Token Retrieval API', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Push Token Retrieval API', 'FAIL', error.message);
  }
}

// Test 4: Test notification statistics API
async function testNotificationStats() {
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/notifications/metrics`);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        logTest('Notification Statistics API', 'PASS');
      } else {
        logTest('Notification Statistics API', 'FAIL', 'Invalid response format');
      }
    } else {
      logTest('Notification Statistics API', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Notification Statistics API', 'FAIL', error.message);
  }
}

// Test 5: Test notification sending API
async function testNotificationSending(userId) {
  if (!userId) {
    logTest('Test Notification Sending API', 'FAIL', 'No user ID from registration test');
    return;
  }

  try {
    const testNotification = {
      userIds: [userId],
      title: 'Test Notification',
      body: 'This is a test notification from the automated test suite'
    };

    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/push-notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testNotification)
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        logTest('Test Notification Sending API', 'PASS');
      } else {
        logTest('Test Notification Sending API', 'FAIL', result.message || 'Unknown error');
      }
    } else {
      logTest('Test Notification Sending API', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Test Notification Sending API', 'FAIL', error.message);
  }
}

// Test 6: Test database connectivity (if server is running)
async function testDatabaseConnectivity() {
  try {
    // Try to get stats which requires database access
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/notifications/metrics`);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data && result.data.database) {
        logTest('Database Connectivity', 'PASS');
      } else {
        logTest('Database Connectivity', 'FAIL', 'No database stats in response');
      }
    } else {
      logTest('Database Connectivity', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Database Connectivity', 'FAIL', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🔍 Running Notification System Tests...\n');

  // Check if server is running first
  const serverRunning = await testServerHealth();
  
  if (!serverRunning) {
    console.log('\n⚠️  Server is not running. Please start the server with:');
    console.log('   npm run dev');
    console.log('\nThen run this test again.\n');
    return;
  }

  // Run API tests
  console.log('\n📡 Testing API Endpoints...');
  const testUserId = await testPushTokenAPI();
  await testPushTokenRetrieval(testUserId);
  await testNotificationStats();
  await testNotificationSending(testUserId);
  await testDatabaseConnectivity();

  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${successRate}%`);
  
  // Status indicator
  if (successRate >= 95) {
    console.log('\n🟢 EXCELLENT - System is production ready!');
  } else if (successRate >= 85) {
    console.log('\n🟡 GOOD - Minor issues, mostly ready for production');
  } else if (successRate >= 70) {
    console.log('\n🟠 WARNING - Significant issues need attention');
  } else {
    console.log('\n🔴 CRITICAL - Major problems, do not deploy');
  }

  // Show failed tests
  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.message}`);
      });
  }

  console.log('\n' + '='.repeat(50));
  
  // Next steps
  if (successRate >= 95) {
    console.log('\n🎉 Next Steps:');
    console.log('1. Update Expo project ID in Xsite/services/notificationManager.ts');
    console.log('2. Test on physical devices');
    console.log('3. Deploy to production');
    console.log('4. Monitor notification delivery rates');
  } else {
    console.log('\n🔧 Recommended Actions:');
    console.log('1. Fix the failed tests above');
    console.log('2. Check server logs for detailed error messages');
    console.log('3. Verify database connection and configuration');
    console.log('4. Re-run tests after fixes');
  }
  
  console.log('');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Notification System Test Runner');
  console.log('');
  console.log('Usage: node scripts/testNotifications.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('Prerequisites:');
  console.log('  • Server must be running (npm run dev)');
  console.log('  • MongoDB must be accessible');
  console.log('');
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});