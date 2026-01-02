/**
 * Migration Script: Sync Staff-Client Relationship
 * 
 * This script syncs existing staff-client relationships by:
 * 1. Finding all staff members with clientIds
 * 2. Adding their IDs to the corresponding client's staffs array
 * 
 * Run with: node scripts/sync-staff-client-relationship.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define schemas
const StaffSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  clientIds: [String],
}, { collection: 'staffs' });

const ClientSchema = new mongoose.Schema({
  name: String,
  email: String,
  staffs: [String],
}, { collection: 'clients' });

const Staff = mongoose.model('Staff', StaffSchema);
const Client = mongoose.model('Client', ClientSchema);

// Main sync function
const syncStaffClientRelationship = async () => {
  try {
    console.log('\n🔄 Starting Staff-Client Relationship Sync...\n');
    
    // Get all staff members
    const allStaff = await Staff.find({});
    console.log(`📊 Found ${allStaff.length} staff members\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const staff of allStaff) {
      const staffId = staff._id.toString();
      const staffName = `${staff.firstName} ${staff.lastName}`;
      
      console.log(`👤 Processing: ${staffName} (${staffId})`);
      
      if (!staff.clientIds || staff.clientIds.length === 0) {
        console.log(`   ⚠️  No clients assigned - skipping\n`);
        skippedCount++;
        continue;
      }
      
      console.log(`   📋 Assigned to ${staff.clientIds.length} client(s)`);
      
      // Update each client
      for (const clientId of staff.clientIds) {
        try {
          const client = await Client.findById(clientId);
          
          if (!client) {
            console.log(`   ❌ Client ${clientId} not found`);
            errorCount++;
            continue;
          }
          
          const currentStaffs = client.staffs || [];
          
          if (currentStaffs.includes(staffId)) {
            console.log(`   ✓  Already in client ${client.name} - skipping`);
            continue;
          }
          
          // Add staff ID to client's staffs array
          const updatedStaffs = [...currentStaffs, staffId];
          
          await Client.findByIdAndUpdate(
            clientId,
            { staffs: updatedStaffs },
            { new: true }
          );
          
          console.log(`   ✅ Added to client ${client.name}`);
          updatedCount++;
          
        } catch (error) {
          console.log(`   ❌ Error updating client ${clientId}:`, error.message);
          errorCount++;
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Staff: ${allStaff.length}`);
    console.log(`Clients Updated: ${updatedCount}`);
    console.log(`Staff Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');
    
    if (errorCount === 0) {
      console.log('✅ Sync completed successfully!\n');
    } else {
      console.log('⚠️  Sync completed with some errors\n');
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
};

// Run the script
const main = async () => {
  try {
    await connectDB();
    await syncStaffClientRelationship();
    
    console.log('🎉 All done! Closing connection...\n');
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Execute
main();
