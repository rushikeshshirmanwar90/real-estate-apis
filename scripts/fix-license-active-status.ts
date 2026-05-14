/**
 * Database Migration Script: Fix isLicenseActive Status
 * 
 * This script fixes clients who have license days (> 0 or -1) but isLicenseActive is false.
 * This can happen when licenses are added but isLicenseActive is not properly updated.
 * 
 * Run this script once to fix existing data:
 * npx ts-node scripts/fix-license-active-status.ts
 */

import mongoose from 'mongoose';
import { Client } from '../lib/models/super-admin/Client';
import connectDB from '../lib/db';

async function fixLicenseActiveStatus() {
  try {
    console.log('🔧 Starting license active status fix...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Find all clients with license > 0 or -1 (lifetime) but isLicenseActive = false
    const clientsToFix = await Client.find({
      $or: [
        { license: { $gt: 0 }, isLicenseActive: false },
        { license: -1, isLicenseActive: false }
      ]
    }).select('name email license isLicenseActive licenseExpiryDate');

    console.log(`📊 Found ${clientsToFix.length} clients with incorrect isLicenseActive status\n`);

    if (clientsToFix.length === 0) {
      console.log('✅ No clients need fixing. All license statuses are correct!\n');
      process.exit(0);
    }

    // Display clients that will be fixed
    console.log('📋 Clients to be fixed:');
    console.log('─'.repeat(80));
    clientsToFix.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (${client.email})`);
      console.log(`   License: ${client.license === -1 ? 'Lifetime' : `${client.license} days`}`);
      console.log(`   isLicenseActive: ${client.isLicenseActive} → will be set to true`);
      console.log(`   Expiry Date: ${client.licenseExpiryDate || 'N/A'}`);
      console.log('');
    });
    console.log('─'.repeat(80));
    console.log('');

    // Fix each client
    let fixedCount = 0;
    let errorCount = 0;

    for (const client of clientsToFix) {
      try {
        await Client.findByIdAndUpdate(
          client._id,
          {
            $set: {
              isLicenseActive: true
            }
          }
        );
        
        console.log(`✅ Fixed: ${client.name} (${client.email})`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ Error fixing ${client.name} (${client.email}):`, error);
        errorCount++;
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Total clients found: ${clientsToFix.length}`);
    console.log(`   Successfully fixed: ${fixedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('─'.repeat(80));
    console.log('\n✅ License active status fix completed!\n');

    // Verify the fix
    const remainingIssues = await Client.countDocuments({
      $or: [
        { license: { $gt: 0 }, isLicenseActive: false },
        { license: -1, isLicenseActive: false }
      ]
    });

    if (remainingIssues > 0) {
      console.log(`⚠️  Warning: ${remainingIssues} clients still have incorrect status. Please review manually.\n`);
    } else {
      console.log('✅ Verification passed: All clients now have correct isLicenseActive status!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the fix
fixLicenseActiveStatus();
