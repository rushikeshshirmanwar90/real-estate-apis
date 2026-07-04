/**
 * Migration Script: Update PushToken Schema
 * 
 * This script migrates existing push tokens to the new schema format:
 * - Renames 'role' field to 'userType'
 * - Adds missing fields: platform, deviceId, deviceName, appVersion, isActive, lastUsed
 * - Populates clientId from user data (Admin/Staff models)
 * - Adds new indexes for better query performance
 * 
 * Run this script once after deploying the new schema.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-push-tokens.ts
 */

import mongoose from 'mongoose';
import { PushToken } from '../lib/models/PushToken';

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

// Migration function
async function migratePushTokens() {
  console.log('🚀 Starting PushToken migration...\n');

  try {
    // Get all existing tokens
    const existingTokens = await PushToken.find({}).lean();
    console.log(`📊 Found ${existingTokens.length} existing tokens\n`);

    if (existingTokens.length === 0) {
      console.log('✅ No tokens to migrate');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Import models
    const { Admin } = await import('../lib/models/users/Admin');
    const { Staff } = await import('../lib/models/users/Staff');

    for (const token of existingTokens) {
      try {
        const updates: any = {};
        let needsUpdate = false;

        // 1. Rename 'role' to 'userType' if it exists
        if ((token as any).role && !(token as any).userType) {
          updates.userType = (token as any).role;
          needsUpdate = true;
          console.log(`  📝 Token ${token._id}: Renaming 'role' to 'userType'`);
        }

        // 2. Add default platform if missing
        if (!token.platform) {
          // Try to infer from token format
          const tokenStr = token.token;
          if (tokenStr.includes('ExponentPushToken') || tokenStr.includes('ExpoPushToken')) {
            updates.platform = 'ios'; // Default to iOS for Expo tokens
          } else if (tokenStr.startsWith('F')) {
            updates.platform = 'android'; // FCM tokens start with F
          } else {
            updates.platform = 'ios'; // Default fallback
          }
          needsUpdate = true;
          console.log(`  📱 Token ${token._id}: Setting platform to '${updates.platform}'`);
        }

        // 3. Add isActive if missing
        if (token.isActive === undefined) {
          updates.isActive = true; // Assume existing tokens are active
          needsUpdate = true;
          console.log(`  ✅ Token ${token._id}: Setting isActive to true`);
        }

        // 4. Add lastUsed if missing
        if (!token.lastUsed) {
          updates.lastUsed = token.updatedAt || new Date();
          needsUpdate = true;
          console.log(`  🕐 Token ${token._id}: Setting lastUsed`);
        }

        // 5. Populate clientId from user data if missing
        if (!token.clientId && token.userId) {
          const userType = updates.userType || (token as any).userType || (token as any).role;
          
          if (userType === 'admin') {
            const admin = await Admin.findById(token.userId).select('clientId').lean();
            if (admin && (admin as any).clientId) {
              updates.clientId = (admin as any).clientId;
              needsUpdate = true;
              console.log(`  🏢 Token ${token._id}: Found clientId for admin: ${updates.clientId}`);
            } else {
              console.log(`  ⚠️  Token ${token._id}: Admin not found or has no clientId`);
            }
          } else if (userType === 'staff') {
            const staff = await Staff.findById(token.userId).select('clients').lean() as any;
            if (staff && staff.clients && staff.clients.length > 0) {
              updates.clientId = staff.clients[0].clientId;
              needsUpdate = true;
              console.log(`  🏢 Token ${token._id}: Found clientId for staff: ${updates.clientId}`);
            } else {
              console.log(`  ⚠️  Token ${token._id}: Staff not found or has no clients`);
            }
          }
        }

        // 6. Add deviceId if missing (use a generated one)
        if (!token.deviceId) {
          updates.deviceId = `migrated-${token.userId}-${Date.now()}`;
          needsUpdate = true;
          console.log(`  📱 Token ${token._id}: Generated deviceId`);
        }

        // 7. Add deviceName if missing
        if (!token.deviceName) {
          updates.deviceName = `${updates.platform || token.platform || 'Unknown'} Device`;
          needsUpdate = true;
          console.log(`  📱 Token ${token._id}: Set default deviceName`);
        }

        // 8. Add appVersion if missing
        if (!token.appVersion) {
          updates.appVersion = '1.0.0';
          needsUpdate = true;
          console.log(`  📦 Token ${token._id}: Set default appVersion`);
        }

        // Apply updates if needed
        if (needsUpdate) {
          await PushToken.updateOne(
            { _id: token._id },
            { $set: updates }
          );
          migratedCount++;
          console.log(`  ✅ Token ${token._id}: Migration complete\n`);
        } else {
          console.log(`  ⏭️  Token ${token._id}: No migration needed\n`);
        }

      } catch (tokenError) {
        errorCount++;
        const errorMsg = `Token ${token._id}: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}\n`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total tokens: ${existingTokens.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDB();
    await migratePushTokens();
    
    console.log('\n🎉 All done! You can now use the new PushToken schema.');
    console.log('\n💡 Next steps:');
    console.log('  1. Test push notifications on both iOS and Android');
    console.log('  2. Verify that admins receive notifications correctly');
    console.log('  3. Check that clientId-based broadcasting works');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();
