/**
 * Test script for enhanced notification service
 * This script tests the new comprehensive error handling and structured logging
 */

import { notifyMaterialActivityCreated } from './lib/services/notificationService.js';

// Mock material activity data for testing
const mockMaterialActivity = {
  _id: 'test_activity_123',
  user: {
    userId: 'user_123',
    fullName: 'Test User'
  },
  clientId: 'client_123',
  projectId: 'project_123',
  projectName: 'Test Project',
  materials: [
    {
      name: 'Test Material',
      unit: 'kg',
      qnt: 10,
      perUnitCost: 100,
      totalCost: 1000
    }
  ],
  activity: 'imported',
  message: 'Test import message',
  date: new Date().toISOString()
};

// Test cases
async function runTests() {
  console.log('🧪 Testing Enhanced Notification Service');
  console.log('=====================================');

  // Test 1: Valid material activity
  console.log('\n📋 Test 1: Valid Material Activity');
  try {
    const result = await notifyMaterialActivityCreated(mockMaterialActivity);
    console.log('✅ Test 1 Result:', {
      success: result.success,
      notificationId: result.notificationId,
      recipientCount: result.recipientCount,
      deliveredCount: result.deliveredCount,
      failedCount: result.failedCount,
      errorCount: result.errors.length,
      processingTimeMs: result.processingTimeMs
    });
    
    if (result.errors.length > 0) {
      console.log('⚠️ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.type}: ${error.message}`);
      });
    }
  } catch (error) {
    console.error('❌ Test 1 Failed:', error.message);
  }

  // Test 2: Invalid material activity (missing required fields)
  console.log('\n📋 Test 2: Invalid Material Activity (Missing Fields)');
  try {
    const invalidActivity = {
      _id: 'test_activity_invalid',
      // Missing required fields
    };
    
    const result = await notifyMaterialActivityCreated(invalidActivity);
    console.log('✅ Test 2 Result:', {
      success: result.success,
      errorCount: result.errors.length,
      processingTimeMs: result.processingTimeMs
    });
    
    console.log('⚠️ Validation errors (expected):');
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.type}: ${error.message}`);
    });
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message);
  }

  console.log('\n🏁 Testing Complete');
}

// Run the tests
runTests().catch(console.error);