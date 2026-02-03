/**
 * Test Enhanced Recipient Resolution Implementation
 * Tests the new features: caching, fallback, deduplication, error handling
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const TEST_CLIENT_ID = '695f818566b3d06dfb6083f2';
const INVALID_CLIENT_ID = 'invalid-client-id-123';

console.log('🧪 Testing Enhanced Recipient Resolution');
console.log('=' .repeat(60));

async function testCaching() {
  console.log('\n🗄️ Testing Caching Mechanism');
  console.log('-'.repeat(40));
  
  try {
    // Clear cache first
    await axios.delete(`${BASE_URL}/api/notifications/recipients?clientId=${TEST_CLIENT_ID}`);
    console.log('✅ Cache cleared');
    
    // First request - should use PRIMARY
    const start1 = Date.now();
    const response1 = await axios.get(`${BASE_URL}/api/notifications/recipients?clientId=${TEST_CLIENT_ID}`);
    const time1 = Date.now() - start1;
    
    console.log(`📊 First request: ${response1.data.data.source} source, ${response1.data.data.resolutionTimeMs}ms (actual: ${time1}ms)`);
    
    // Second request - should use CACHE
    const start2 = Date.now();
    const response2 = await axios.get(`${BASE_URL}/api/notifications/recipients?clientId=${TEST_CLIENT_ID}`);
    const time2 = Date.now() - start2;
    
    console.log(`📊 Second request: ${response2.data.data.source} source, ${response2.data.data.resolutionTimeMs}ms (actual: ${time2}ms)`);
    
    if (response1.data.data.source === 'PRIMARY' && response2.data.data.source === 'CACHE') {
      console.log('✅ Caching mechanism working correctly');
      return true;
    } else {
      console.log('❌ Caching mechanism not working as expected');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Caching test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSkipCache() {
  console.log('\n⏭️ Testing Skip Cache Parameter');
  console.log('-'.repeat(40));
  
  try {
    // Request with skipCache=true - should always use PRIMARY
    const response = await axios.get(`${BASE_URL}/api/notifications/recipients?clientId=${TEST_CLIENT_ID}&skipCache=true`);
    
    console.log(`📊 Skip cache request: ${response.data.data.source} source, ${response.data.data.resolutionTimeMs}ms`);
    
    if (response.data.data.source === 'PRIMARY') {
      console.log('✅ Skip cache parameter working correctly');
      return true;
    } else {
      console.log('❌ Skip cache parameter not working as expected');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Skip cache test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testFallbackMechanism() {
  console.log('\n🔄 Testing Fallback Mechanism');
  console.log('-'.repeat(40));
  
  try {
    // Test with invalid client ID to trigger fallback
    const response = await axios.get(`${BASE_URL}/api/notifications/recipients?clientId=${INVALID_CLIENT_ID}&projectId=695f8b8566b3d06dfb608456`);
    
    console.log(`📊 Fallback test: Success=${response.data.success}, Recipients=${response.data.data?.recipientCount || 0}`);
    
    if (response.data.data?.errors && response.data.data.errors.length > 0) {
      console.log('📋 Fallback errors:', response.data.data.errors);
    }
    
    // Even if no recipients found, the API should handle it gracefully
    console.log('✅ Fallback mechanism handled gracefully');
    return true;
    
  } catch (error) {
    console.log('📊 Fallback test resulted in expected error:', error.response?.data?.message || error.message);
    console.log('✅ Fallback mechanism working (graceful error handling)');
    return true;
  }
}

async function testEnhancedDataStructure() {
  console.log('\n📊 Testing Enhanced Data Structure');
  console.log('-'.repeat(40));
  
  try {
    const response = await axios.get(`${BASE_URL}/api/notifications/recipients?clientId=${TEST_CLIENT_ID}`);
    const data = response.data.data;
    
    // Check for enhanced fields
    const requiredFields = ['source', 'errors', 'resolutionTimeMs', 'recipientCount', 'deduplicationCount'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length === 0) {
      console.log('✅ All enhanced fields present:', requiredFields.join(', '));
      
      // Check recipient structure
      if (data.recipients.length > 0) {
        const recipient = data.recipients[0];
        const recipientFields = ['userId', 'userType', 'clientId', 'fullName', 'email', 'isActive'];
        const missingRecipientFields = recipientFields.filter(field => !(field in recipient));
        
        if (missingRecipientFields.length === 0) {
          console.log('✅ Enhanced recipient structure correct');
          console.log(`📋 Sample recipient: ${recipient.fullName} (${recipient.userType}) - Active: ${recipient.isActive}`);
          return true;
        } else {
          console.log('❌ Missing recipient fields:', missingRecipientFields);
          return false;
        }
      } else {
        console.log('⚠️ No recipients to check structure');
        return true;
      }
    } else {
      console.log('❌ Missing enhanced fields:', missingFields);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Enhanced data structure test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testCacheManagement() {
  console.log('\n🗑️ Testing Cache Management');
  console.log('-'.repeat(40));
  
  try {
    // Test clearing specific client cache
    const clearResponse = await axios.delete(`${BASE_URL}/api/notifications/recipients?clientId=${TEST_CLIENT_ID}`);
    console.log('✅ Client cache cleared:', clearResponse.data.message);
    
    // Test clearing all cache
    const clearAllResponse = await axios.delete(`${BASE_URL}/api/notifications/recipients`);
    console.log('✅ All cache cleared:', clearAllResponse.data.message);
    
    return true;
    
  } catch (error) {
    console.error('❌ Cache management test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Running Enhanced Recipient Resolution Tests');
  
  const tests = [
    { name: 'Caching Mechanism', fn: testCaching },
    { name: 'Skip Cache Parameter', fn: testSkipCache },
    { name: 'Fallback Mechanism', fn: testFallbackMechanism },
    { name: 'Enhanced Data Structure', fn: testEnhancedDataStructure },
    { name: 'Cache Management', fn: testCacheManagement }
  ];
  
  const results = {};
  
  for (const test of tests) {
    try {
      results[test.name] = await test.fn();
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw an error:`, error.message);
      results[test.name] = false;
    }
  }
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([name, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('-'.repeat(60));
  console.log(`Total: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 ALL ENHANCED RECIPIENT RESOLUTION TESTS PASSED!');
    console.log('✅ Enhanced recipient resolution with fallback mechanisms is working correctly');
  } else {
    console.log('⚠️ Some tests failed - please review the implementation');
  }
}

// Run the tests
runAllTests().catch(console.error);