const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_DATA = {
  userId: 'test-user-api-123',
  userType: 'client',
  token: 'ExponentPushToken[test-api-token-123]',
  platform: 'ios',
  deviceId: 'test-device-api-123',
  deviceName: 'Test API Device',
  appVersion: '1.0.0',
};

class NotificationAPITester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Testing Notification APIs...\n');
    
    try {
      await this.testPushTokenRegistration();
      await this.testPushTokenRetrieval();
      await this.testPushNotificationStats();
      await this.testPushNotificationTest();
      await this.testPushTokenDeactivation();
      
      this.printResults();
    } catch (error) {
      console.error('❌ API Test Suite Error:', error.message);
    }
  }

  async testPushTokenRegistration() {
    console.log('🔍 Testing Push Token Registration...');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/push-token`, TEST_DATA);
      
      if (response.status === 201 || response.status === 200) {
        this.addResult(true, 'Push Token Registration', `Status: ${response.status}, Token registered`);
        
        // Store token ID for later tests
        if (response.data.data && response.data.data.tokenId) {
          TEST_DATA.tokenId = response.data.data.tokenId;
        }
      } else {
        this.addResult(false, 'Push Token Registration', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.addResult(false, 'Push Token Registration', `Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testPushTokenRetrieval() {
    console.log('🔍 Testing Push Token Retrieval...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/push-token?userId=${TEST_DATA.userId}`);
      
      if (response.status === 200) {
        const tokens = response.data.data.tokens;
        const hasTokens = Array.isArray(tokens) && tokens.length > 0;
        
        this.addResult(
          hasTokens, 
          'Push Token Retrieval', 
          `Found ${tokens.length} tokens for user`
        );
      } else {
        this.addResult(false, 'Push Token Retrieval', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.addResult(false, 'Push Token Retrieval', `Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testPushNotificationStats() {
    console.log('🔍 Testing Push Notification Statistics...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/push-notifications/stats`);
      
      if (response.status === 200) {
        const stats = response.data.data;
        const hasRequiredFields = stats.hasOwnProperty('totalTokens') && 
                                 stats.hasOwnProperty('activeTokens') &&
                                 stats.hasOwnProperty('tokensByPlatform') &&
                                 stats.hasOwnProperty('tokensByUserType');
        
        this.addResult(
          hasRequiredFields,
          'Push Notification Statistics',
          `Total: ${stats.totalTokens}, Active: ${stats.activeTokens}`
        );
      } else {
        this.addResult(false, 'Push Notification Statistics', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.addResult(false, 'Push Notification Statistics', `Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testPushNotificationTest() {
    console.log('🔍 Testing Push Notification Test Endpoint...');
    
    try {
      const testPayload = {
        userIds: [TEST_DATA.userId],
        title: '🧪 API Test Notification',
        body: 'This is a test notification from the API test suite',
        data: {
          isTest: true,
          testType: 'api-test'
        }
      };
      
      const response = await axios.post(`${API_BASE_URL}/api/push-notifications/test`, testPayload);
      
      if (response.status === 200) {
        const result = response.data.data;
        this.addResult(
          result.success !== undefined,
          'Push Notification Test',
          `Messages sent: ${result.messagesSent}, Success: ${result.success}`
        );
      } else {
        this.addResult(false, 'Push Notification Test', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.addResult(false, 'Push Notification Test', `Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testPushTokenDeactivation() {
    console.log('🔍 Testing Push Token Deactivation...');
    
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/push-token?userId=${TEST_DATA.userId}`);
      
      if (response.status === 200) {
        const result = response.data.data;
        this.addResult(
          result.deactivatedCount !== undefined,
          'Push Token Deactivation',
          `Deactivated ${result.deactivatedCount} tokens`
        );
      } else {
        this.addResult(false, 'Push Token Deactivation', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.addResult(false, 'Push Token Deactivation', `Error: ${error.response?.data?.message || error.message}`);
    }
  }

  addResult(passed, testName, details) {
    if (passed) {
      this.results.passed++;
      console.log(`  ✅ ${testName}: ${details}`);
    } else {
      this.results.failed++;
      console.log(`  ❌ ${testName}: ${details}`);
    }
    
    this.results.tests.push({
      testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 API TEST RESULTS');
    console.log('='.repeat(50));
    
    const total = this.results.passed + this.results.failed;
    const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    console.log('\n🎯 API STATUS:');
    if (successRate >= 90) {
      console.log('🟢 APIs are working perfectly!');
    } else if (successRate >= 75) {
      console.log('🟡 APIs are mostly working, minor issues detected');
    } else {
      console.log('🔴 APIs have significant issues that need attention');
    }
    
    console.log('='.repeat(50));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new NotificationAPITester();
  tester.runAllTests().catch(console.error);
}

module.exports = NotificationAPITester;