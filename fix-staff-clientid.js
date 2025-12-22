const { MongoClient, ObjectId } = require('mongodb');

// Configuration - Update these with your actual values
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';
const DATABASE_NAME = 'your-database-name'; // Update this
const TARGET_CLIENT_ID = '6941b27c7fdcea3d37e02ada'; // The clientId that should be used

async function fixStaffClientId() {
  console.log('🔧 FIXING STAFF CLIENT ID ASSIGNMENT');
  console.log('====================================');
  console.log('This script will update staff records to have the correct clientId');
  console.log('====================================\n');

  let client;
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully\n');

    const db = client.db(DATABASE_NAME);

    // 1. Verify the target client exists
    console.log('1️⃣ Verifying target client exists...');
    const clientsCollection = db.collection('clients');
    
    let targetClient;
    try {
      targetClient = await clientsCollection.findOne({ _id: new ObjectId(TARGET_CLIENT_ID) });
    } catch (err) {
      // Try without ObjectId conversion in case it's stored as string
      targetClient = await clientsCollection.findOne({ _id: TARGET_CLIENT_ID });
    }
    
    if (targetClient) {
      console.log('✅ Target client found:');
      console.log(`   - Name: ${targetClient.name}`);
      console.log(`   - Email: ${targetClient.email}`);
    } else {
      console.log('❌ Target client not found with ID:', TARGET_CLIENT_ID);
      console.log('⚠️ Cannot proceed without valid client. Please check the clientId.');
      return;
    }

    console.log('\n');

    // 2. Check current staff situation
    console.log('2️⃣ Analyzing current staff records...');
    const staffCollection = db.collection('staff');
    
    const totalStaff = await staffCollection.countDocuments();
    console.log(`📊 Total staff in database: ${totalStaff}`);

    if (totalStaff === 0) {
      console.log('❌ No staff records found. Nothing to fix.');
      return;
    }

    // Check staff with correct clientId
    const staffWithCorrectClientId = await staffCollection.countDocuments({ clientId: TARGET_CLIENT_ID });
    console.log(`✅ Staff with correct clientId: ${staffWithCorrectClientId}`);

    // Check staff without clientId
    const staffWithoutClientId = await staffCollection.find({ 
      $or: [
        { clientId: { $exists: false } },
        { clientId: null },
        { clientId: '' }
      ]
    }).toArray();
    console.log(`⚠️ Staff without clientId: ${staffWithoutClientId.length}`);

    // Check staff with different clientId
    const staffWithDifferentClientId = await staffCollection.find({ 
      clientId: { $exists: true, $ne: TARGET_CLIENT_ID, $ne: null, $ne: '' }
    }).toArray();
    console.log(`⚠️ Staff with different clientId: ${staffWithDifferentClientId.length}`);

    console.log('\n');

    // 3. Show what will be updated
    console.log('3️⃣ Records that will be updated:');
    
    if (staffWithoutClientId.length > 0) {
      console.log('\n📋 Staff without clientId:');
      staffWithoutClientId.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email})`);
      });
    }

    if (staffWithDifferentClientId.length > 0) {
      console.log('\n📋 Staff with different clientId:');
      staffWithDifferentClientId.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email}) - Current: ${staff.clientId}`);
      });
    }

    const totalToUpdate = staffWithoutClientId.length + staffWithDifferentClientId.length;
    
    if (totalToUpdate === 0) {
      console.log('✅ All staff records already have the correct clientId. Nothing to fix.');
      return;
    }

    console.log(`\n📊 Total records to update: ${totalToUpdate}`);

    // 4. Perform the updates
    console.log('\n4️⃣ Performing updates...');
    
    let updatedCount = 0;

    // Update staff without clientId
    if (staffWithoutClientId.length > 0) {
      console.log('🔄 Updating staff without clientId...');
      const result1 = await staffCollection.updateMany(
        { 
          $or: [
            { clientId: { $exists: false } },
            { clientId: null },
            { clientId: '' }
          ]
        },
        { 
          $set: { 
            clientId: TARGET_CLIENT_ID,
            updatedAt: new Date()
          }
        }
      );
      console.log(`✅ Updated ${result1.modifiedCount} staff records without clientId`);
      updatedCount += result1.modifiedCount;
    }

    // Ask before updating staff with different clientId (this is more dangerous)
    if (staffWithDifferentClientId.length > 0) {
      console.log('\n⚠️ WARNING: Some staff have different clientId values.');
      console.log('This might mean they belong to different clients.');
      console.log('Updating them will move them to the target client.');
      console.log('\nFor safety, this script will NOT automatically update these records.');
      console.log('If you want to update them, run this command manually:');
      console.log(`db.staff.updateMany({clientId: {$ne: "${TARGET_CLIENT_ID}", $ne: null, $ne: ""}}, {$set: {clientId: "${TARGET_CLIENT_ID}", updatedAt: new Date()}})`);
    }

    console.log('\n');

    // 5. Verify the fix
    console.log('5️⃣ Verifying the fix...');
    const finalStaffWithCorrectClientId = await staffCollection.countDocuments({ clientId: TARGET_CLIENT_ID });
    console.log(`✅ Staff with correct clientId after fix: ${finalStaffWithCorrectClientId}`);

    const remainingStaffWithoutClientId = await staffCollection.countDocuments({ 
      $or: [
        { clientId: { $exists: false } },
        { clientId: null },
        { clientId: '' }
      ]
    });
    console.log(`⚠️ Staff still without clientId: ${remainingStaffWithoutClientId}`);

    console.log('\n====================================');
    console.log('FIX COMPLETE');
    console.log('====================================');
    
    if (updatedCount > 0) {
      console.log(`✅ Successfully updated ${updatedCount} staff records`);
      console.log('💡 You can now test the staff loading in your app');
    } else {
      console.log('ℹ️ No records were updated');
    }

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Update MONGODB_URI with your actual MongoDB connection string');
    console.log('2. Update DATABASE_NAME with your actual database name');
    console.log('3. Update TARGET_CLIENT_ID with the correct clientId');
    console.log('4. Make sure MongoDB is running and accessible');
    console.log('5. Ensure you have write permissions to the database');
  } finally {
    if (client) {
      await client.close();
      console.log('📡 MongoDB connection closed');
    }
  }
}

// Instructions
console.log('⚠️ IMPORTANT: Update the configuration variables at the top of this file:');
console.log('- MONGODB_URI: Your MongoDB connection string');
console.log('- DATABASE_NAME: Your database name');
console.log('- TARGET_CLIENT_ID: The clientId that staff should have');
console.log('');
console.log('⚠️ WARNING: This script will modify your database. Make a backup first!');
console.log('');

fixStaffClientId().catch(console.error);