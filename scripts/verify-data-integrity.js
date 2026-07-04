/**
 * Data Integrity Verification Script
 * 
 * Run this after deployment to verify no data was lost
 * Usage: node scripts/verify-data-integrity.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const DB_URL = process.env.DB_URL;

// Collection names to check
const COLLECTIONS_TO_CHECK = [
  'projects',
  'buildings',
  'equipments',
  'labors',
  'staffs',
  'admins',
  'clients',
  'materialactivities',
  'activities',
  'updates',
  'usercustomerdetails',
  'sections',
  'rowhouses',
  'roominfos',
  'othersections',
  'minisections'
];

async function connect() {
  try {
    await mongoose.connect(DB_URL, {
      dbName: "realEstate",
      bufferCommands: true,
    });
    console.log("✅ Connected to database");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    throw error;
  }
}

async function verifyDataIntegrity() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 DATA INTEGRITY VERIFICATION');
  console.log('='.repeat(60) + '\n');
  
  const results = [];
  let totalDocuments = 0;
  let hasIssues = false;

  for (const collectionName of COLLECTIONS_TO_CHECK) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      
      // Check if collection exists
      const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
      
      if (collections.length === 0) {
        console.log(`⚠️  ${collectionName.padEnd(25)} - Collection does not exist`);
        results.push({ collection: collectionName, count: 0, status: 'missing' });
        hasIssues = true;
        continue;
      }
      
      // Count documents
      const count = await collection.countDocuments();
      totalDocuments += count;
      
      // Check for indexes
      const indexes = await collection.indexes();
      const indexCount = indexes.length;
      
      const status = count === 0 ? '⚠️ ' : '✅';
      console.log(`${status} ${collectionName.padEnd(25)} - ${count.toString().padStart(6)} documents, ${indexCount} indexes`);
      
      results.push({ 
        collection: collectionName, 
        count, 
        indexes: indexCount,
        status: count === 0 ? 'empty' : 'ok' 
      });
      
      if (count === 0) {
        hasIssues = true;
      }
      
    } catch (error) {
      console.log(`❌ ${collectionName.padEnd(25)} - Error: ${error.message}`);
      results.push({ collection: collectionName, count: 0, status: 'error', error: error.message });
      hasIssues = true;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Collections Checked: ${COLLECTIONS_TO_CHECK.length}`);
  console.log(`Total Documents: ${totalDocuments}`);
  console.log(`Collections with Data: ${results.filter(r => r.count > 0).length}`);
  console.log(`Empty Collections: ${results.filter(r => r.count === 0).length}`);
  console.log(`Missing Collections: ${results.filter(r => r.status === 'missing').length}`);
  console.log(`Errors: ${results.filter(r => r.status === 'error').length}`);
  console.log('='.repeat(60) + '\n');
  
  if (hasIssues) {
    console.log('⚠️  WARNING: Some collections are empty or missing!');
    console.log('   This could indicate data loss during deployment.');
    console.log('   Please check backups and restore if necessary.\n');
    return false;
  } else {
    console.log('✅ All collections have data - integrity check passed!\n');
    return true;
  }
}

async function checkForBackupCollections() {
  console.log('🔍 Checking for backup collections...\n');
  
  const allCollections = await mongoose.connection.db.listCollections().toArray();
  const backupCollections = allCollections.filter(c => 
    c.name.includes('backup') || c.name.includes('_old') || c.name.includes('_archive')
  );
  
  if (backupCollections.length > 0) {
    console.log(`Found ${backupCollections.length} backup collection(s):`);
    for (const col of backupCollections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }
    console.log('\n💡 You can restore from these backups if needed.\n');
  } else {
    console.log('No backup collections found.\n');
  }
}

async function checkRecentDeletions() {
  console.log('🔍 Checking for recent deletions (if DeletedRecords exists)...\n');
  
  try {
    const deletedRecords = mongoose.connection.db.collection('deletedrecords');
    const recentDeletions = await deletedRecords
      .find({
        deletedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
      .sort({ deletedAt: -1 })
      .limit(10)
      .toArray();
    
    if (recentDeletions.length > 0) {
      console.log(`⚠️  Found ${recentDeletions.length} recent deletions (last 24 hours):`);
      for (const record of recentDeletions) {
        console.log(`  - ${record.modelName} (ID: ${record.originalId}) deleted at ${record.deletedAt}`);
      }
      console.log('');
    } else {
      console.log('✅ No recent deletions found.\n');
    }
  } catch (error) {
    console.log('ℹ️  DeletedRecords collection not found (this is normal if not implemented yet).\n');
  }
}

async function main() {
  try {
    await connect();
    
    const integrityOk = await verifyDataIntegrity();
    await checkForBackupCollections();
    await checkRecentDeletions();
    
    if (!integrityOk) {
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
