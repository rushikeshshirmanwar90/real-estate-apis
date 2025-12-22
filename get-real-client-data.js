const mongoose = require('mongoose');

// Get real client data from database
const getRealClientData = async () => {
    console.log('🔍 Getting real client data from database...\n');

    try {
        // Connect to database
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Define Client schema (simplified)
        const ClientSchema = new mongoose.Schema({
            name: String,
            email: String,
            phoneNumber: Number,
            city: String,
            state: String,
            address: String
        });

        const Client = mongoose.models.Client || mongoose.model('Client', ClientSchema);

        // Get all clients
        const clients = await Client.find({}).limit(5);
        console.log(`📊 Found ${clients.length} clients in database:\n`);

        clients.forEach((client, index) => {
            console.log(`${index + 1}. Client ID: ${client._id}`);
            console.log(`   Name: ${client.name}`);
            console.log(`   Email: ${client.email}`);
            console.log(`   Phone: ${client.phoneNumber}`);
            console.log(`   City: ${client.city}, ${client.state}`);
            console.log('');
        });

        if (clients.length > 0) {
            const firstClient = clients[0];
            console.log('🎯 Use this data for testing:');
            console.log(`Client ID: ${firstClient._id}`);
            console.log(`Company Name: ${firstClient.name}`);
            
            // Now get staff for this client
            const StaffSchema = new mongoose.Schema({
                firstName: String,
                lastName: String,
                email: String,
                phoneNumber: String,
                clientId: String,
                role: String
            });

            const Staff = mongoose.models.Staff || mongoose.model('Staff', StaffSchema);
            
            const staffMembers = await Staff.find({ clientId: firstClient._id.toString() }).limit(3);
            console.log(`\n📋 Staff members for ${firstClient.name}:`);
            
            staffMembers.forEach((staff, index) => {
                console.log(`${index + 1}. Staff ID: ${staff._id}`);
                console.log(`   Name: ${staff.firstName} ${staff.lastName}`);
                console.log(`   Email: ${staff.email}`);
                console.log(`   Role: ${staff.role}`);
                console.log('');
            });

            // Generate test payload
            if (staffMembers.length > 0) {
                const testStaff = staffMembers[0];
                console.log('🧪 Test payload for welcome message:');
                console.log(JSON.stringify({
                    recipientEmail: testStaff.email,
                    recipientName: `${testStaff.firstName} ${testStaff.lastName}`,
                    subject: `Welcome to ${firstClient.name} - You've been added as a staff member`,
                    message: `Dear ${testStaff.firstName} ${testStaff.lastName},\n\nWelcome to ${firstClient.name}!...`,
                    type: "staff_welcome",
                    clientId: firstClient._id.toString(),
                    staffId: testStaff._id.toString(),
                    companyName: firstClient.name,
                    metadata: {
                        role: testStaff.role,
                        addedBy: "Administrator",
                        addedAt: new Date().toISOString()
                    }
                }, null, 2));
            }
        } else {
            console.log('⚠️ No clients found in database. You may need to add some test data first.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
};

// Run the script
getRealClientData().catch(console.error);