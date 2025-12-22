const axios = require('axios');
const mongoose = require('mongoose');

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test function to debug staff loading issue
const debugStaffIssue = async () => {
  console.log('🔍 Starting staff loading debug...\n');

  try {
    await connectDB();

    // Import models directly from the files
    const StaffModel = require('./lib/models/users/Staff');
    const AdminModel = require('./lib/models/users/Admin');
    const ClientModel = require('./lib/models/Client');
    
    const Staff = StaffModel.Staff;
    const Admin = AdminModel.Admin;
    const Client = ClientModel.Client;

    console.log('📊 Database Analysis:');
    console.log('===================');

    // Check total counts
    const totalStaff = await Staff.countDocuments();
    const totalAdmins = await Admin.countDocuments();
    const totalClients = await Client.countDocuments();

    console.log(`Total Staff in DB: ${totalStaff}`);
    console.log(`Total Admins in DB: ${totalAdmins}`);
    console.log(`Total Clients in DB: ${totalClients}\n`);

    // Get all clients
    const clients = await Client.find({}, { _id: 1, name: 1, email: 1 });
    console.log('📋 Available Clients:');
    clients.forEach((client, index) => {
      console.log(`${index + 1}. ID: ${client._id}, Name: ${client.name}, Email: ${client.email}`);
    });
    console.log('');

    // For each client, check staff and admin counts
    for (const client of clients) {
      console.log(`🔍 Checking data for Client: ${client.name} (${client._id})`);
      
      const staffForClient = await Staff.find({ clientId: client._id.toString() });
      const adminForClient = await Admin.find({ clientId: client._id.toString() });
      
      console.log(`  Staff count: ${staffForClient.length}`);
      console.log(`  Admin count: ${adminForClient.length}`);
      
      if (staffForClient.length > 0) {
        console.log('  Staff members:');
        staffForClient.forEach((staff, index) => {
          console.log(`    ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email}) - Role: ${staff.role}`);
        });
      }
      
      if (adminForClient.length > 0) {
        console.log('  Admins:');
        adminForClient.forEach((admin, index) => {
          console.log(`    ${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email})`);
        });
      }
      console.log('');
    }

    // Test API endpoints
    console.log('🌐 Testing API Endpoints:');
    console.log('========================');

    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
    console.log(`Using domain: ${domain}\n`);

    // Test with first client
    if (clients.length > 0) {
      const testClientId = clients[0]._id.toString();
      console.log(`Testing with Client ID: ${testClientId}\n`);

      try {
        // Test Staff API
        console.log('📡 Testing Staff API...');
        const staffUrl = `${domain}/api/users/staff?clientId=${testClientId}`;
        console.log(`URL: ${staffUrl}`);
        
        const staffResponse = await axios.get(staffUrl);
        console.log(`Status: ${staffResponse.status}`);
        console.log(`Response:`, JSON.stringify(staffResponse.data, null, 2));
        console.log('');

        // Test Admin API
        console.log('📡 Testing Admin API...');
        const adminUrl = `${domain}/api/(users)/admin?clientId=${testClientId}`;
        console.log(`URL: ${adminUrl}`);
        
        const adminResponse = await axios.get(adminUrl);
        console.log(`Status: ${adminResponse.status}`);
        console.log(`Response:`, JSON.stringify(adminResponse.data, null, 2));
        console.log('');

        // Test Client API
        console.log('📡 Testing Client API...');
        const clientUrl = `${domain}/api/clients?id=${testClientId}`;
        console.log(`URL: ${clientUrl}`);
        
        const clientResponse = await axios.get(clientUrl);
        console.log(`Status: ${clientResponse.status}`);
        console.log(`Response:`, JSON.stringify(clientResponse.data, null, 2));

      } catch (apiError) {
        console.error('❌ API Test Error:', apiError.message);
        if (apiError.response) {
          console.error('Response Status:', apiError.response.status);
          console.error('Response Data:', apiError.response.data);
        }
      }
    } else {
      console.log('⚠️ No clients found in database');
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

// Run the debug
debugStaffIssue().catch(console.error);