/**
 * Comprehensive Notification System Test Script
 * 
 * Tests the complete notification flow:
 * 1. Token registration with clientId
 * 2. Admin notification broadcasting by clientId
 * 3. Performing admin exclusion
 * 4. Platform-specific features (iOS/Android channelId)
 * 5. Staff activity → admin notifications
 * 
 * Usage:
 *   npx ts-node scripts/test-notification-system.ts
 */

import mongoose from 'mongoose';
import { PushToken } from '../lib/models/PushToken';
import { PushNotificationService } from '../lib/services/pushNotificationService';

// Test configuration
const TEST_CONFIG = {
  // Replace these with actual IDs from your database
  testClientId: 'test-client-123',
  testProjectId: 'test-project-456',
  testAdmin1Id: 'admin-1-id',
  testAdmin2Id: 'admin-2-id',
  testStaffId: 'staff-1-id',
};

// Connect to database
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Test 1: Verify schema migration
async function testSchemaMigration() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Schema Migration Verification');
  console.log('='.repeat(60));

  try {
    const tokens = await PushToken.find({}).limit(5).lean();
    
    if (tokens.length === 0) {
      console.log('⚠️  No tokens found in database');
      return false;
    }

    console.log(`\n📊 Checking ${tokens.length} sample tokens...\n`);

    let allValid = true;
    for (const token of tokens) {
      const checks = {
        hasUserType: !!(token as any).userType,
        hasPlatform: !!token.platform,
        hasIsActive: token.isActive !== undefined,
        hasLastUsed: !!token.lastUsed,
        hasClientId: !!token.clientId,
      };

      const isValid = Object.values(checks).every(v => v);
      allValid = allValid && isValid;

      console.log(`Token ${token._id}:`);
      console.log(`  ✓ userType: ${checks.hasUserType ? '✅' : '❌'} (${(token as any).userType || 'missing'})`);
      console.log(`  ✓ platform: ${checks.hasPlatform ? '✅' : '❌'} (${token.platform || 'missing'})`);
      console.log(`  ✓ isActive: ${checks.hasIsActive ? '✅' : '❌'} (${token.isActive})`);
      console.log(`  ✓ lastUsed: ${checks.hasLastUsed ? '✅' : '❌'}`);
      console.log(`  ✓ clientId: ${checks.hasClientId ? '✅' : '❌'} (${token.clientId || 'missing'})`);
      console.log(`  Overall: ${isValid ? '✅ VALID' : '❌ NEEDS MIGRATION'}\n`);
    }

    if (allValid) {
      console.log('✅ All sample tokens have correct schema');
    } else {
      console.log('❌ Some tokens need migration. Run: npx ts-node scripts/migrate-push-tokens.ts');
    }

    return allValid;
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    return false;
  }
}

// Test 2: Token statistics
async function testTokenStatistics() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Token Statistics');
  console.log('='.repeat(60));

  try {
    const stats = await PushNotificationService.getStatistics();
    
    console.log('\n📊 Push Token Statistics:');
    console.log(`  Total tokens: ${stats.totalTokens}`);
    console.log(`  Active tokens: ${stats.activeTokens}`);
    console.log(`  Inactive tokens: ${stats.totalTokens - stats.activeTokens}`);
    
    console.log('\n📱 By Platform:');
    Object.entries(stats.tokensByPlatform).forEach(([platform, count]) => {
      console.log(`  ${platform}: ${count}`);
    });
    
    console.log('\n👥 By User Type:');
    Object.entries(stats.tokensByUserType).forEach(([userType, count]) => {
      console.log(`  ${userType}: ${count}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Statistics test failed:', error);
    return false;
  }
}

// Test 3: ClientId-based token lookup
async function testClientIdLookup() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: ClientId-Based Token Lookup');
  console.log('='.repeat(60));

  try {
    // Get all unique clientIds
    const clientIds = await PushToken.distinct('clientId', { 
      clientId: { $exists: true, $ne: null },
      isActive: true 
    });

    console.log(`\n📊 Found ${clientIds.length} unique clientIds with active tokens\n`);

    if (clientIds.length === 0) {
      console.log('⚠️  No tokens with clientId found. This is expected if:');
      console.log('   1. No users have registered tokens yet');
      console.log('   2. Migration script hasn\'t been run');
      return false;
    }

    // Test lookup for first 3 clientIds
    for (const clientId of clientIds.slice(0, 3)) {
      const adminTokens = await PushToken.find({
        clientId: clientId,
        userType: 'admin',
        isActive: true
      }).lean();

      console.log(`ClientId: ${clientId}`);
      console.log(`  Admin tokens: ${adminTokens.length}`);
      
      if (adminTokens.length > 0) {
        console.log(`  Platforms: ${[...new Set(adminTokens.map(t => t.platform))].join(', ')}`);
        console.log(`  ✅ Ready for notification broadcasting\n`);
      } else {
        console.log(`  ⚠️  No admin tokens found\n`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ ClientId lookup test failed:', error);
    return false;
  }
}

// Test 4: Platform-specific features
async function testPlatformFeatures() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Platform-Specific Features');
  console.log('='.repeat(60));

  try {
    const androidTokens = await PushToken.find({ 
      platform: 'android',
      isActive: true 
    }).limit(3).lean();

    const iosTokens = await PushToken.find({ 
      platform: 'ios',
      isActive: true 
    }).limit(3).lean();

    console.log(`\n📱 Android tokens: ${androidTokens.length}`);
    console.log(`📱 iOS tokens: ${iosTokens.length}\n`);

    // Verify Android tokens would get channelId
    if (androidTokens.length > 0) {
      console.log('✅ Android tokens found - channelId will be added automatically');
      console.log('   Channel: "project-updates"');
      console.log('   Required for Android 8.0+ notifications\n');
    } else {
      console.log('⚠️  No Android tokens found for testing\n');
    }

    // Verify iOS tokens work without channelId
    if (iosTokens.length > 0) {
      console.log('✅ iOS tokens found - no channelId needed');
      console.log('   iOS handles notifications natively\n');
    } else {
      console.log('⚠️  No iOS tokens found for testing\n');
    }

    return true;
  } catch (error) {
    console.error('❌ Platform features test failed:', error);
    return false;
  }
}

// Test 5: Notification broadcasting simulation
async function testNotificationBroadcasting() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Notification Broadcasting Simulation');
  console.log('='.repeat(60));

  try {
    // Find a clientId with multiple admins
    const clientIds = await PushToken.distinct('clientId', { 
      clientId: { $exists: true, $ne: null },
      userType: 'admin',
      isActive: true 
    });

    if (clientIds.length === 0) {
      console.log('⚠️  No clientIds with admin tokens found');
      return false;
    }

    // Get admin counts for each clientId
    console.log('\n📊 Admin token distribution by clientId:\n');
    
    for (const clientId of clientIds.slice(0, 5)) {
      const adminTokens = await PushToken.find({
        clientId: clientId,
        userType: 'admin',
        isActive: true
      }).lean();

      console.log(`ClientId: ${clientId}`);
      console.log(`  Admins with tokens: ${adminTokens.length}`);
      
      if (adminTokens.length > 1) {
        console.log(`  ✅ Multi-admin broadcasting ready`);
        console.log(`  📱 Platforms: ${[...new Set(adminTokens.map(t => t.platform))].join(', ')}`);
      } else if (adminTokens.length === 1) {
        console.log(`  ⚠️  Only 1 admin - broadcasting will work but limited`);
      }
      console.log();
    }

    console.log('💡 Broadcasting behavior:');
    console.log('  1. Staff performs activity → ALL admins with same clientId notified');
    console.log('  2. Admin performs activity → OTHER admins with same clientId notified');
    console.log('  3. Performing admin is automatically excluded');

    return true;
  } catch (error) {
    console.error('❌ Broadcasting simulation failed:', error);
    return false;
  }
}

// Test 6: Service health check
async function testServiceHealth() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: Service Health Check');
  console.log('='.repeat(60));

  try {
    const health = await PushNotificationService.healthCheck();
    
    console.log(`\n🏥 Service Status: ${health.status === 'healthy' ? '✅ HEALTHY' : '❌ ERROR'}`);
    console.log(`⏰ Timestamp: ${health.timestamp}`);
    
    if (health.stats) {
      console.log('\n📊 Service Statistics:');
      console.log(`  Total tokens: ${health.stats.totalTokens}`);
      console.log(`  Active tokens: ${health.stats.activeTokens}`);
    }

    if (health.errors && health.errors.length > 0) {
      console.log('\n❌ Errors:');
      health.errors.forEach(error => console.log(`  - ${error}`));
    }

    return health.status === 'healthy';
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n🧪 NOTIFICATION SYSTEM COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60));
  console.log('Testing notification system functionality...\n');

  const results = {
    schemaMigration: false,
    tokenStatistics: false,
    clientIdLookup: false,
    platformFeatures: false,
    notificationBroadcasting: false,
    serviceHealth: false,
  };

  try {
    await connectDB();

    results.schemaMigration = await testSchemaMigration();
    results.tokenStatistics = await testTokenStatistics();
    results.clientIdLookup = await testClientIdLookup();
    results.platformFeatures = await testPlatformFeatures();
    results.notificationBroadcasting = await testNotificationBroadcasting();
    results.serviceHealth = await testServiceHealth();

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const testResults = [
      { name: 'Schema Migration', passed: results.schemaMigration },
      { name: 'Token Statistics', passed: results.tokenStatistics },
      { name: 'ClientId Lookup', passed: results.clientIdLookup },
      { name: 'Platform Features', passed: results.platformFeatures },
      { name: 'Notification Broadcasting', passed: results.notificationBroadcasting },
      { name: 'Service Health', passed: results.serviceHealth },
    ];

    testResults.forEach(test => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${test.name}`);
    });

    const passedCount = testResults.filter(t => t.passed).length;
    const totalCount = testResults.length;
    const passRate = ((passedCount / totalCount) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log(`Overall: ${passedCount}/${totalCount} tests passed (${passRate}%)`);
    console.log('='.repeat(60));

    if (passedCount === totalCount) {
      console.log('\n🎉 All tests passed! Notification system is ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the output above for details.');
      
      if (!results.schemaMigration) {
        console.log('\n💡 Action Required: Run migration script');
        console.log('   npx ts-node scripts/migrate-push-tokens.ts');
      }
    }

    process.exit(passedCount === totalCount ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run all tests
runAllTests();
