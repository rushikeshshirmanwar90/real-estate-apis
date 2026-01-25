const mongoose = require('mongoose');
const { PushNotificationService } = require('../lib/services/pushNotificationService');
const { PushToken } = require('../lib/models/PushToken');
const { Projects } = require('../lib/models/Project');
const { Activity } = require('../lib/models/Xsite/Activity');
const { MaterialActivity } = require('../lib/models/Xsite/materials-activity');

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-test',
  testUserId: 'test-user-123',
  testProjectId: null, // Will be set during test
  testPushToken: 'ExponentPushToken[test-token-for-testing]',
};

class NotificationSystemTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Notification System Tests...\n');
    
    try {
      // Connect to database
      await this.connectDatabase();
      
      // Run individual tests
      await this.testDatabaseConnection();
      await this.testPushTokenModel();
      await this.testPushNotificationService();
      await this.testProjectIntegration();
      await this.testActivityNotifications();
      await this.testMaterialActivityNotifications();
      await this.testErrorHandling();
      await this.testStatistics();
      
      // Cleanup
      await this.cleanup();
      
      // Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.testResults.errors.push(`Test suite error: ${error.message}`);
    } finally {
      await mongoose.disconnect();
    }
  }

  async connectDatabase() {
    try {
      await mongoose.connect(TEST_CONFIG.mongoUri);
      console.log('✅ Database connected successfully');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async testDatabaseConnection() {
    console.log('🔍 Testing Database Connection...');
    
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      const requiredCollections = ['pushtokens', 'projects', 'activities', 'materialactivities'];
      const missingCollections = requiredCollections.filter(name => 
        !collectionNames.some(existing => existing.toLowerCase().includes(name.toLowerCase()))
      );
      
      if (missingCollections.length > 0) {
        this.addResult(false, 'Database Collections', `Missing collections: ${missingCollections.join(', ')}`);
      } else {
        this.addResult(true, 'Database Collections', 'All required collections exist');
      }
      
    } catch (error) {
      this.addResult(false, 'Database Connection', error.message);
    }
  }

  async testPushTokenModel() {
    console.log('🔍 Testing Push Token Model...');
    
    try {
      // Test creating a push token
      const testToken = new PushToken({
        userId: TEST_CONFIG.testUserId,
        userType: 'client',
        token: TEST_CONFIG.testPushToken,
        platform: 'ios',
        deviceId: 'test-device-123',
        deviceName: 'Test iPhone',
        appVersion: '1.0.0',
        isActive: true,
      });
      
      await testToken.save();
      this.addResult(true, 'Push Token Creation', 'Token created successfully');
      
      // Test finding the token
      const foundToken = await PushToken.findOne({ userId: TEST_CONFIG.testUserId });
      if (foundToken) {
        this.addResult(true, 'Push Token Retrieval', 'Token retrieved successfully');
      } else {
        this.addResult(false, 'Push Token Retrieval', 'Token not found');
      }
      
      // Test token validation
      const isValid = PushNotificationService.isValidExpoPushToken(TEST_CONFIG.testPushToken);
      this.addResult(isValid, 'Push Token Validation', `Token validation: ${isValid}`);
      
    } catch (error) {
      this.addResult(false, 'Push Token Model', error.message);
    }
  }

  async testPushNotificationService() {
    console.log('🔍 Testing Push Notification Service...');
    
    try {
      // Test health check
      const healthCheck = await PushNotificationService.healthCheck();
      this.addResult(
        healthCheck.status === 'healthy', 
        'Service Health Check', 
        `Status: ${healthCheck.status}`
      );
      
      // Test statistics
      const stats = await PushNotificationService.getStatistics();
      this.addResult(
        typeof stats.totalTokens === 'number', 
        'Statistics Generation', 
        `Total tokens: ${stats.totalTokens}, Active: ${stats.activeTokens}`
      );
      
      // Test token validation
      const validTokens = [
        'ExponentPushToken[valid-token]',
        'ExpoPushToken[another-valid-token]',
      ];
      
      const invalidTokens = [
        'invalid-token',
        '',
        null,
        undefined,
      ];
      
      const validResults = validTokens.map(token => PushNotificationService.isValidExpoPushToken(token));
      const invalidResults = invalidTokens.map(token => PushNotificationService.isValidExpoPushToken(token));
      
      this.addResult(
        validResults.every(result => result === true),
        'Valid Token Recognition',
        `Valid tokens recognized: ${validResults.filter(r => r).length}/${validResults.length}`
      );
      
      this.addResult(
        invalidResults.every(result => result === false),
        'Invalid Token Recognition',
        `Invalid tokens rejected: ${invalidResults.filter(r => !r).length}/${invalidResults.length}`
      );
      
    } catch (error) {
      this.addResult(false, 'Push Notification Service', error.message);
    }
  }

  async testProjectIntegration() {
    console.log('🔍 Testing Project Integration...');
    
    try {
      // Create a test project with assigned staff
      const testProject = new Projects({
        name: 'Test Notification Project',
        address: '123 Test Street',
        description: 'Project for testing notifications',
        clientId: new mongoose.Types.ObjectId(),
        assignedStaff: [
          {
            _id: TEST_CONFIG.testUserId,
            fullName: 'Test User'
          }
        ]
      });
      
      await testProject.save();
      TEST_CONFIG.testProjectId = testProject._id.toString();
      
      this.addResult(true, 'Test Project Creation', `Project created: ${testProject.name}`);
      
      // Test sending notification to project admins (dry run)
      const result = await PushNotificationService.sendToProjectAdmins(
        TEST_CONFIG.testProjectId,
        '🧪 Test Project Notification',
        'This is a test notification for project admins',
        { isTest: true }
      );
      
      this.addResult(
        result.success,
        'Project Admin Notification',
        `Messages sent: ${result.messagesSent}, Errors: ${result.errors.length}`
      );
      
    } catch (error) {
      this.addResult(false, 'Project Integration', error.message);
    }
  }

  async testActivityNotifications() {
    console.log('🔍 Testing Activity Notifications...');
    
    try {
      if (!TEST_CONFIG.testProjectId) {
        this.addResult(false, 'Activity Notifications', 'No test project available');
        return;
      }
      
      // Create a test activity
      const testActivity = new Activity({
        user: {
          userId: TEST_CONFIG.testUserId,
          fullName: 'Test User'
        },
        clientId: 'test-client-123',
        projectId: TEST_CONFIG.testProjectId,
        projectName: 'Test Notification Project',
        activityType: 'project_updated',
        category: 'project',
        action: 'update',
        description: 'Test project update for notification testing',
        message: 'This is a test activity message',
        date: new Date().toISOString()
      });
      
      await testActivity.save();
      this.addResult(true, 'Test Activity Creation', 'Activity created successfully');
      
      // Test notification creation (without actually sending)
      const { createActivityNotification } = require('../lib/services/notificationService');
      const notification = createActivityNotification(testActivity);
      
      this.addResult(
        notification.title && notification.body,
        'Activity Notification Creation',
        `Title: "${notification.title}"`
      );
      
    } catch (error) {
      this.addResult(false, 'Activity Notifications', error.message);
    }
  }

  async testMaterialActivityNotifications() {
    console.log('🔍 Testing Material Activity Notifications...');
    
    try {
      if (!TEST_CONFIG.testProjectId) {
        this.addResult(false, 'Material Activity Notifications', 'No test project available');
        return;
      }
      
      // Create a test material activity
      const testMaterialActivity = new MaterialActivity({
        user: {
          userId: TEST_CONFIG.testUserId,
          fullName: 'Test User'
        },
        clientId: 'test-client-123',
        projectId: TEST_CONFIG.testProjectId,
        projectName: 'Test Notification Project',
        materials: [
          {
            name: 'Test Cement',
            unit: 'bags',
            qnt: 10,
            perUnitCost: 500,
            totalCost: 5000,
            cost: 5000
          }
        ],
        message: 'Test material import',
        activity: 'imported',
        date: new Date().toISOString()
      });
      
      await testMaterialActivity.save();
      this.addResult(true, 'Test Material Activity Creation', 'Material activity created successfully');
      
      // Test notification creation
      const { createMaterialActivityNotification } = require('../lib/services/notificationService');
      const notification = createMaterialActivityNotification(testMaterialActivity);
      
      this.addResult(
        notification.title && notification.body,
        'Material Activity Notification Creation',
        `Title: "${notification.title}"`
      );
      
    } catch (error) {
      this.addResult(false, 'Material Activity Notifications', error.message);
    }
  }

  async testErrorHandling() {
    console.log('🔍 Testing Error Handling...');
    
    try {
      // Test with invalid project ID
      const result1 = await PushNotificationService.sendToProjectAdmins(
        'invalid-project-id',
        'Test',
        'Test message'
      );
      
      this.addResult(
        result1.success && result1.messagesSent === 0,
        'Invalid Project ID Handling',
        'Handled gracefully without crashing'
      );
      
      // Test with empty user array
      const result2 = await PushNotificationService.sendToUsers(
        [],
        'Test',
        'Test message'
      );
      
      this.addResult(
        result2.success && result2.messagesSent === 0,
        'Empty User Array Handling',
        'Handled gracefully without crashing'
      );
      
      // Test cleanup function
      const cleanupCount = await PushNotificationService.cleanupInvalidTokens();
      this.addResult(
        typeof cleanupCount === 'number',
        'Token Cleanup Function',
        `Cleanup completed, processed ${cleanupCount} tokens`
      );
      
    } catch (error) {
      this.addResult(false, 'Error Handling', error.message);
    }
  }

  async testStatistics() {
    console.log('🔍 Testing Statistics...');
    
    try {
      const stats = await PushNotificationService.getStatistics();
      
      const requiredFields = ['totalTokens', 'activeTokens', 'tokensByPlatform', 'tokensByUserType'];
      const hasAllFields = requiredFields.every(field => stats.hasOwnProperty(field));
      
      this.addResult(
        hasAllFields,
        'Statistics Structure',
        `All required fields present: ${hasAllFields}`
      );
      
      this.addResult(
        stats.totalTokens >= 0 && stats.activeTokens >= 0,
        'Statistics Values',
        `Total: ${stats.totalTokens}, Active: ${stats.activeTokens}`
      );
      
    } catch (error) {
      this.addResult(false, 'Statistics', error.message);
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Remove test data
      await PushToken.deleteMany({ userId: TEST_CONFIG.testUserId });
      
      if (TEST_CONFIG.testProjectId) {
        await Projects.findByIdAndDelete(TEST_CONFIG.testProjectId);
        await Activity.deleteMany({ projectId: TEST_CONFIG.testProjectId });
        await MaterialActivity.deleteMany({ projectId: TEST_CONFIG.testProjectId });
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }

  addResult(passed, testName, details) {
    if (passed) {
      this.testResults.passed++;
      console.log(`  ✅ ${testName}: ${details}`);
    } else {
      this.testResults.failed++;
      console.log(`  ❌ ${testName}: ${details}`);
      this.testResults.errors.push(`${testName}: ${details}`);
    }
    
    this.testResults.details.push({
      testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 NOTIFICATION SYSTEM TEST RESULTS');
    console.log('='.repeat(60));
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎯 SYSTEM STATUS:');
    if (successRate >= 90) {
      console.log('🟢 EXCELLENT - System is working perfectly!');
    } else if (successRate >= 75) {
      console.log('🟡 GOOD - System is mostly working, minor issues detected');
    } else if (successRate >= 50) {
      console.log('🟠 WARNING - System has significant issues that need attention');
    } else {
      console.log('🔴 CRITICAL - System has major problems and needs immediate attention');
    }
    
    console.log('\n📋 NEXT STEPS:');
    if (this.testResults.failed === 0) {
      console.log('  • System is ready for production use');
      console.log('  • Test on physical devices with real push tokens');
      console.log('  • Monitor notification delivery rates');
    } else {
      console.log('  • Fix the failed tests before deploying');
      console.log('  • Check database connections and models');
      console.log('  • Verify API endpoints are working');
    }
    
    console.log('='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new NotificationSystemTester();
  tester.runAllTests().catch(console.error);
}

module.exports = NotificationSystemTester;