/**
 * Migration Script: Convert Staff clientIds to clients field
 * 
 * This script migrates existing Staff documents from the old clientIds array format
 * to the new clients array format with client details.
 * 
 * Old format: clientIds: ["clientId1", "clientId2"]
 * New format: clients: [
 *   { clientId: "clientId1", clientName: "Client Name 1", assignedAt: Date },
 *   { clientId: "clientId2", clientName: "Client Name 2", assignedAt: Date }
 * ]
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define schemas (simplified versions for migration)
const ClientSchema = new mongoose.Schema({
  name: String,
  companyName: String,
}, { collection: 'clients' });

const StaffSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  clientIds: [String], // Old field
  clients: [{
    clientId: String,
    clientName: String,
    assignedAt: { type: Date, default: Date.now }
  }], // New field
}, { collection: 'staffs' });

const Client = mongoose.model('Client', ClientSchema);
const Staff = mongoose.model('Staff', StaffSchema);

const migrateStaffClientIds = async () => {
  try {
    console.log('🔄 Starting migration: clientIds → clients');
    
    // Find all staff with clientIds but no clients field (or empty clients)
    const staffToMigrate = await Staff.find({
      $and: [
        { clientIds: { $exists: true, $ne: [] } }, // Has clientIds
        { 
          $or: [
            { clients: { $exists: false } }, // No clients field
            { clients: { $size: 0 } } // Empty clients array
          ]
        }
      ]
    });

    console.log(`📊 Found ${staffToMigrate.length} staff members to migrate`);

    if (staffToMigrate.length === 0) {
      console.log('✅ No migration needed - all staff already use clients field');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const staff of staffToMigrate) {
      try {
        console.log(`\n🔄 Migrating staff: ${staff.firstName} ${staff.lastName} (${staff.email})`);
        console.log(`   Old clientIds: [${staff.clientIds.join(', ')}]`);

        const newClients = [];

        // Convert each clientId to client object with name
        for (const clientId of staff.clientIds) {
          try {
            // Find the client to get the name
            const client = await Client.findById(clientId);
            
            if (client) {
              const clientName = client.name || client.companyName || 'Unknown Client';
              newClients.push({
                clientId: clientId,
                clientName: clientName,
                assignedAt: new Date() // Use current date as assignment date
              });
              console.log(`   ✅ Found client: ${clientName} (${clientId})`);
            } else {
              console.log(`   ⚠️ Client not found: ${clientId} - using placeholder name`);
              newClients.push({
                clientId: clientId,
                clientName: 'Unknown Client',
                assignedAt: new Date()
              });
            }
          } catch (clientError) {
            console.error(`   ❌ Error fetching client ${clientId}:`, clientError.message);
            // Still add the client with unknown name
            newClients.push({
              clientId: clientId,
              clientName: 'Unknown Client',
              assignedAt: new Date()
            });
          }
        }

        // Update the staff document
        await Staff.findByIdAndUpdate(staff._id, {
          clients: newClients,
          // Keep clientIds for now (will be removed in a separate cleanup step)
        });

        console.log(`   ✅ Migrated to clients: ${newClients.map(c => `${c.clientName} (${c.clientId})`).join(', ')}`);
        migratedCount++;

      } catch (staffError) {
        console.error(`   ❌ Error migrating staff ${staff.email}:`, staffError.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount} staff members`);
    console.log(`   ❌ Errors: ${errorCount} staff members`);

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n⚠️ Next steps:');
      console.log('   1. Test the application thoroughly');
      console.log('   2. Run cleanup script to remove old clientIds field');
    } else {
      console.log('\n⚠️ Migration completed with errors. Please review the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const cleanupOldClientIds = async () => {
  try {
    console.log('\n🧹 Starting cleanup: removing old clientIds field');
    
    // Remove clientIds field from all staff documents
    const result = await Staff.updateMany(
      { clientIds: { $exists: true } },
      { $unset: { clientIds: "" } }
    );

    console.log(`✅ Removed clientIds field from ${result.modifiedCount} staff documents`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
};

const verifyMigration = async () => {
  try {
    console.log('\n🔍 Verifying migration...');
    
    const staffWithOldFormat = await Staff.countDocuments({
      clientIds: { $exists: true, $ne: [] },
      $or: [
        { clients: { $exists: false } },
        { clients: { $size: 0 } }
      ]
    });

    const staffWithNewFormat = await Staff.countDocuments({
      clients: { $exists: true, $ne: [] }
    });

    const totalStaff = await Staff.countDocuments({});

    console.log(`📊 Verification Results:`);
    console.log(`   Total staff: ${totalStaff}`);
    console.log(`   Staff with new format (clients): ${staffWithNewFormat}`);
    console.log(`   Staff with old format (clientIds only): ${staffWithOldFormat}`);

    if (staffWithOldFormat === 0) {
      console.log('✅ All staff successfully migrated to new format!');
    } else {
      console.log('⚠️ Some staff still use old format - migration may need to be run again');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'migrate';

    switch (command) {
      case 'migrate':
        await migrateStaffClientIds();
        await verifyMigration();
        break;
        
      case 'cleanup':
        console.log('⚠️ This will permanently remove the old clientIds field!');
        console.log('Make sure migration was successful before running cleanup.');
        await cleanupOldClientIds();
        await verifyMigration();
        break;
        
      case 'verify':
        await verifyMigration();
        break;
        
      default:
        console.log('Usage: node migrate-clientids-to-clients.js [migrate|cleanup|verify]');
        console.log('  migrate - Convert clientIds to clients (default)');
        console.log('  cleanup - Remove old clientIds field (run after testing)');
        console.log('  verify  - Check migration status');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { migrateStaffClientIds, cleanupOldClientIds, verifyMigration };