const { MongoClient } = require('mongodb');

// Configuration - Update these with your actual values
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';
const DATABASE_NAME = 'your-database-name'; // Update this
const TEST_CLIENT_ID = '6941b27c7fdcea3d37e02ada'; // The clientId from your logs

async function diagnoseStaffClientIdMismatch() {
  console.log('🔍 DIAGNOSING STAFF CLIENT ID MISMATCH');
  console.log('=====================================');
  console.log('Investigating why staff data is not loading despite existing in database');
  console.log('=====================================\n');

  let client;
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully\n');

    const db = client.db(DATABASE_NAME);

    // 1. Check if the client exists
    console.log('1️⃣ Checking if client exists...');
    const clientsCollection = db.collection('clients');
    const clientDoc = await clientsCollection.findOne({ _id: { $oid: TEST_CLIENT_ID } });
    
    if (clientDoc) {
      console.log('✅ Client found:');
      console.log(`   - ID: ${clientDoc._id}`);
      console.log(`   - Name: ${clientDoc.name}`);
      console.log(`   - Email: ${clientDoc.email}`);
    } else {
      console.log('❌ Client not found with ID:', TEST_CLIENT_ID);
      
      // Try to find clients with similar IDs
      const allClients = await clientsCollection.find({}).limit(5).toArray();
      console.log('\n📋 Available clients (first 5):');
      allClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ID: ${client._id}, Name: ${client.name}`);
      });
    }

    console.log('\n');

    // 2. Check staff collection
    console.log('2️⃣ Checking staff collection...');
    const staffCollection = db.collection('staff');
    
    // Count total staff
    const totalStaff = await staffCollection.countDocuments();
    console.log(`📊 Total staff in database: ${totalStaff}`);

    if (totalStaff > 0) {
      // Get sample staff records
      const sampleStaff = await staffCollection.find({}).limit(5).toArray();
      console.log('\n📋 Sample staff records:');
      sampleStaff.forEach((staff, index) => {
        console.log(`   ${index + 1}. Name: ${staff.firstName} ${staff.lastName}`);
        console.log(`      Email: ${staff.email}`);
        console.log(`      ClientId: ${staff.clientId || 'NOT SET'}`);
        console.log(`      Role: ${staff.role || 'NOT SET'}`);
        console.log('');
      });

      // Check staff with the specific clientId
      const staffWithClientId = await staffCollection.find({ clientId: TEST_CLIENT_ID }).toArray();
      console.log(`📊 Staff with clientId "${TEST_CLIENT_ID}": ${staffWithClientId.length}`);

      if (staffWithClientId.length === 0) {
        console.log('❌ No staff found with the specified clientId');
        
        // Check what clientIds exist in staff collection
        const distinctClientIds = await staffCollection.distinct('clientId');
        console.log('\n📋 Distinct clientIds in staff collection:');
        distinctClientIds.forEach((id, index) => {
          console.log(`   ${index + 1}. ${id || 'NULL/UNDEFINED'}`);
        });

        // Check staff without clientId
        const staffWithoutClientId = await staffCollection.find({ 
          $or: [
            { clientId: { $exists: false } },
            { clientId: null },
            { clientId: '' }
          ]
        }).toArray();
        console.log(`\n📊 Staff without clientId: ${staffWithoutClientId.length}`);
        
        if (staffWithoutClientId.length > 0) {
          console.log('📋 Staff without clientId:');
          staffWithoutClientId.forEach((staff, index) => {
            console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email})`);
          });
        }
      } else {
        console.log('✅ Found staff with matching clientId:');
        staffWithClientId.forEach((staff, index) => {
          console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email})`);
        });
      }
    } else {
      console.log('❌ No staff records found in database');
    }

    console.log('\n');

    // 3. Check admin collection
    console.log('3️⃣ Checking admin collection...');
    const adminCollection = db.collection('admins');
    
    const totalAdmins = await adminCollection.countDocuments();
    console.log(`📊 Total admins in database: ${totalAdmins}`);

    if (totalAdmins > 0) {
      const adminWithClientId = await adminCollection.find({ clientId: TEST_CLIENT_ID }).toArray();
      console.log(`📊 Admins with clientId "${TEST_CLIENT_ID}": ${adminWithClientId.length}`);

      if (adminWithClientId.length > 0) {
        console.log('✅ Found admin with matching clientId:');
        adminWithClientId.forEach((admin, index) => {
          console.log(`   ${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email})`);
        });
      } else {
        console.log('❌ No admin found with the specified clientId');
        
        // Check distinct clientIds in admin collection
        const distinctAdminClientIds = await adminCollection.distinct('clientId');
        console.log('\n📋 Distinct clientIds in admin collection:');
        distinctAdminClientIds.forEach((id, index) => {
          console.log(`   ${index + 1}. ${id || 'NULL/UNDEFINED'}`);
        });
      }
    }

    console.log('\n');

    // 4. Recommendations
    console.log('4️⃣ RECOMMENDATIONS:');
    console.log('==================');

    if (totalStaff === 0) {
      console.log('❌ No staff records exist - you need to add staff members first');
    } else {
      const staffWithoutClientId = await staffCollection.find({ 
        $or: [
          { clientId: { $exists: false } },
          { clientId: null },
          { clientId: '' }
        ]
      }).countDocuments();

      if (staffWithoutClientId > 0) {
        console.log('⚠️ Some staff records are missing clientId - they need to be updated');
        console.log('💡 Solution: Update existing staff records to include the correct clientId');
        console.log(`   db.staff.updateMany({clientId: {$exists: false}}, {$set: {clientId: "${TEST_CLIENT_ID}"}})`);
      }

      const staffWithDifferentClientId = await staffCollection.find({ 
        clientId: { $exists: true, $ne: TEST_CLIENT_ID, $ne: null, $ne: '' }
      }).countDocuments();

      if (staffWithDifferentClientId > 0) {
        console.log('⚠️ Staff records exist but with different clientId');
        console.log('💡 Check if you are using the correct clientId in your app');
      }
    }

    console.log('\n=====================================');
    console.log('DIAGNOSIS COMPLETE');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Update MONGODB_URI with your actual MongoDB connection string');
    console.log('2. Update DATABASE_NAME with your actual database name');
    console.log('3. Update TEST_CLIENT_ID with the clientId from your app logs');
    console.log('4. Make sure MongoDB is running and accessible');
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
console.log('- TEST_CLIENT_ID: The clientId from your app (currently using from logs)');
console.log('');

diagnoseStaffClientIdMismatch().catch(console.error);