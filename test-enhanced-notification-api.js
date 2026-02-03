/**
 * Test script for enhanced notification service via API calls
 * This tests the new comprehensive error handling and structured logging
 */

const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:8080';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test cases
async function runTests() {
  console.log('🧪 Testing Enhanced Notification Service via API');
  console.log('===============================================');

  try {
    // Test 1: Health check
    console.log('\n📋 Test 1: Server Health Check');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Health Check Result:', {
      status: healthResponse.statusCode,
      healthy: healthResponse.body.success
    });

    // Test 2: Create a material activity (this will trigger the enhanced notification service)
    console.log('\n📋 Test 2: Create Material Activity (Enhanced Notification Test)');
    
    const materialActivityData = {
      user: {
        userId: 'test_user_123',
        fullName: 'Test User Enhanced'
      },
      clientId: 'test_client_123',
      projectId: 'test_project_123',
      projectName: 'Enhanced Test Project',
      materials: [
        {
          name: 'Enhanced Test Cement',
          unit: 'bags',
          qnt: 15,
          perUnitCost: 600,
          totalCost: 9000,
          cost: 9000,
          specs: { grade: 'OPC 53' },
          sectionId: 'test_section_123',
          miniSectionId: 'test_mini_section_123'
        }
      ],
      message: 'Testing enhanced notification system with comprehensive error handling',
      activity: 'imported',
      date: new Date().toISOString()
    };

    const materialActivityResponse = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/materialActivity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, materialActivityData);
    
    console.log('✅ Material Activity Creation Result:', {
      status: materialActivityResponse.statusCode,
      success: materialActivityResponse.body.success,
      message: materialActivityResponse.body.message
    });

    if (materialActivityResponse.body.success) {
      console.log('📱 Enhanced notification system should have been triggered!');
      console.log('   Check the server logs for structured logging output with:');
      console.log('   - Activity ID, User ID, Client ID, Project ID context');
      console.log('   - Performance timing measurements');
      console.log('   - Comprehensive error handling details');
      console.log('   - Recipient resolution with fallback mechanisms');
    }

    // Test 3: Create a transfer activity (tests source project notification handling)
    console.log('\n📋 Test 3: Create Transfer Activity (Enhanced Transfer Notification Test)');
    
    const transferActivityData = {
      user: {
        userId: 'test_user_456',
        fullName: 'Transfer Test User'
      },
      clientId: 'test_client_123',
      projectId: 'test_project_destination',
      projectName: 'Destination Project',
      materials: [
        {
          name: 'Transferred Steel Bars',
          unit: 'tons',
          qnt: 2,
          perUnitCost: 50000,
          totalCost: 100000,
          cost: 100000,
          specs: { grade: 'Fe500' }
        }
      ],
      message: 'Testing enhanced transfer notification with source project handling',
      activity: 'transferred',
      transferDetails: {
        fromProject: {
          id: 'test_project_source',
          name: 'Source Project'
        },
        toProject: {
          id: 'test_project_destination',
          name: 'Destination Project'
        }
      },
      date: new Date().toISOString()
    };

    const transferResponse = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/materialActivity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, transferActivityData);
    
    console.log('✅ Transfer Activity Creation Result:', {
      status: transferResponse.statusCode,
      success: transferResponse.body.success,
      message: transferResponse.body.message
    });

    if (transferResponse.body.success) {
      console.log('📱 Enhanced transfer notification system should have been triggered!');
      console.log('   This should have sent notifications to BOTH:');
      console.log('   - Destination project recipients (main notification)');
      console.log('   - Source project recipients (transfer-out notification)');
      console.log('   Check server logs for dual notification processing');
    }

    // Test 4: Test batch material usage (another notification trigger point)
    console.log('\n📋 Test 4: Create Batch Material Usage (Enhanced Batch Notification Test)');
    
    const batchUsageData = {
      user: {
        userId: 'test_user_789',
        fullName: 'Batch Test User'
      },
      clientId: 'test_client_456',
      projectId: 'test_project_batch',
      projectName: 'Batch Test Project',
      materials: [
        {
          name: 'Batch Test Concrete',
          unit: 'cubic meters',
          qnt: 5,
          perUnitCost: 8000,
          totalCost: 40000,
          cost: 40000,
          specs: { grade: 'M25' }
        },
        {
          name: 'Batch Test Reinforcement',
          unit: 'kg',
          qnt: 500,
          perUnitCost: 80,
          totalCost: 40000,
          cost: 40000,
          specs: { grade: 'Fe415' }
        }
      ],
      message: 'Testing enhanced batch notification system',
      activity: 'used',
      date: new Date().toISOString()
    };

    const batchResponse = await makeRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/material-usage-batch',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, batchUsageData);
    
    console.log('✅ Batch Usage Creation Result:', {
      status: batchResponse.statusCode,
      success: batchResponse.body.success,
      message: batchResponse.body.message
    });

    if (batchResponse.body.success) {
      console.log('📱 Enhanced batch notification system should have been triggered!');
      console.log('   Check server logs for comprehensive error handling and timing');
    }

    console.log('\n🏁 API Testing Complete');
    console.log('\n📊 VERIFICATION CHECKLIST:');
    console.log('   ✓ Check server console logs for structured logging with context');
    console.log('   ✓ Verify performance timing measurements are logged');
    console.log('   ✓ Confirm comprehensive error handling prevents silent failures');
    console.log('   ✓ Validate recipient resolution with fallback mechanisms');
    console.log('   ✓ Ensure transfer activities trigger dual notifications');
    console.log('\n💡 The enhanced notification service now returns NotificationResult objects');
    console.log('   with detailed success/failure information instead of void.');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests
runTests().catch(console.error);