const mongoose = require('mongoose');

// Migration script to add email verification fields to existing staff records
const migrateStaffVerification = async () => {
    console.log('🔄 Starting staff verification migration...\n');

    try {
        // Connect to database
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Define Staff schema with new fields
        const StaffSchema = new mongoose.Schema({
            firstName: String,
            lastName: String,
            phoneNumber: String,
            email: String,
            password: String,
            clientId: String,
            role: String,
            assignedProjects: [String],
            emailVerified: { type: Boolean, default: false },
            emailVerifiedAt: Date
        });

        const Staff = mongoose.models.Staff || mongoose.model('Staff', StaffSchema);

        // Get all staff records
        const allStaff = await Staff.find({});
        console.log(`📊 Found ${allStaff.length} staff records`);

        // Update records that don't have emailVerified field
        let updatedCount = 0;
        
        for (const staff of allStaff) {
            if (staff.emailVerified === undefined) {
                await Staff.findByIdAndUpdate(
                    staff._id,
                    { 
                        emailVerified: false,
                        emailVerifiedAt: null
                    },
                    { new: true }
                );
                updatedCount++;
                console.log(`✅ Updated ${staff.firstName} ${staff.lastName} (${staff.email})`);
            } else {
                console.log(`⏭️ Skipped ${staff.firstName} ${staff.lastName} (already has verification fields)`);
            }
        }

        console.log(`\n🎉 Migration completed!`);
        console.log(`📊 Total records: ${allStaff.length}`);
        console.log(`📊 Updated records: ${updatedCount}`);
        console.log(`📊 Skipped records: ${allStaff.length - updatedCount}`);

        // Verify the migration
        console.log('\n🔍 Verifying migration...');
        const verifyStaff = await Staff.find({}).limit(3);
        
        verifyStaff.forEach((staff, index) => {
            console.log(`${index + 1}. ${staff.firstName} ${staff.lastName}`);
            console.log(`   Email: ${staff.email}`);
            console.log(`   Email Verified: ${staff.emailVerified}`);
            console.log(`   Email Verified At: ${staff.emailVerifiedAt || 'null'}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
};

// Run the migration
migrateStaffVerification().catch(console.error);