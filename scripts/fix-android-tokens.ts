import connect from "../lib/db";
import { PushToken } from "../lib/models/PushToken";

/**
 * Migration script to fix Android push tokens
 * Run this once to clean up tokens without platform field
 * 
 * Usage:
 * cd /Users/chinmayshrimanwar/Desktop/pamu\ dada/app/real-estate-apis
 * npx ts-node scripts/fix-android-tokens.ts
 */
async function fixAndroidTokens() {
  try {
    console.log('🔧 Starting Android token fix migration...\n');
    
    await connect();
    console.log('✅ Connected to database\n');
    
    // Step 1: Find tokens without platform field
    console.log('🔍 Step 1: Checking for tokens without platform field...');
    
    const tokensWithoutPlatform = await PushToken.find({
      $or: [
        { platform: { $exists: false } },
        { platform: null },
        { platform: '' }
      ]
    });
    
    console.log(`📊 Found ${tokensWithoutPlatform.length} tokens without platform field\n`);
    
    if (tokensWithoutPlatform.length > 0) {
      console.log('📋 Tokens to be deleted:');
      tokensWithoutPlatform.forEach((token, index) => {
        console.log(`   ${index + 1}. User: ${token.userId}, Token: ${token.token.substring(0, 30)}...`);
      });
      console.log('');
      
      // Step 2: Delete tokens without platform field
      console.log('🗑️ Step 2: Deleting tokens without platform field...');
      
      const deleteResult = await PushToken.deleteMany({
        $or: [
          { platform: { $exists: false } },
          { platform: null },
          { platform: '' }
        ]
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} tokens without platform field`);
      console.log('📱 Affected users will need to re-login to register new tokens with platform field\n');
    } else {
      console.log('✅ No tokens without platform field found - database is clean!\n');
    }
    
    // Step 3: Verify all remaining tokens have platform field
    console.log('🔍 Step 3: Verifying remaining tokens...');
    
    const allTokens = await PushToken.find({});
    const androidTokens = allTokens.filter(t => t.platform === 'android');
    const iosTokens = allTokens.filter(t => t.platform === 'ios');
    const webTokens = allTokens.filter(t => t.platform === 'web');
    const stillMissingPlatform = allTokens.filter(t => !t.platform);
    
    console.log('\n📊 Final Token Statistics:');
    console.log('═══════════════════════════════════════');
    console.log(`   Total tokens:              ${allTokens.length}`);
    console.log(`   Android tokens:            ${androidTokens.length}`);
    console.log(`   iOS tokens:                ${iosTokens.length}`);
    console.log(`   Web tokens:                ${webTokens.length}`);
    console.log(`   Tokens without platform:   ${stillMissingPlatform.length}`);
    console.log('═══════════════════════════════════════\n');
    
    // Step 4: Show sample of Android tokens
    if (androidTokens.length > 0) {
      console.log('📱 Sample Android Tokens (first 5):');
      androidTokens.slice(0, 5).forEach((token, index) => {
        console.log(`   ${index + 1}. User: ${token.userId}`);
        console.log(`      Platform: ${token.platform}`);
        console.log(`      Active: ${token.isActive}`);
        console.log(`      Token: ${token.token.substring(0, 30)}...`);
        console.log(`      Last Used: ${token.lastUsed}`);
        console.log('');
      });
    }
    
    // Step 5: Check for inactive tokens
    const inactiveTokens = allTokens.filter(t => !t.isActive);
    if (inactiveTokens.length > 0) {
      console.log(`⚠️ Warning: ${inactiveTokens.length} inactive tokens found`);
      console.log('   Consider running cleanup to remove old inactive tokens\n');
    }
    
    // Final summary
    console.log('✅ Migration complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Users with deleted tokens need to re-login');
    console.log('   2. Test notifications using: POST /api/notifications/test-admin-notification');
    console.log('   3. Monitor logs for notification delivery');
    console.log('   4. Verify Android devices receive notifications\n');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
  } finally {
    console.log('🔚 Closing database connection...');
    process.exit(0);
  }
}

// Run the migration
console.log('🚀 Android Token Fix Migration');
console.log('═══════════════════════════════════════\n');
fixAndroidTokens();
