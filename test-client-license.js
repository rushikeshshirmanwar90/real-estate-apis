// Quick test script to check client license data
const mongoose = require('mongoose');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';

async function checkClientLicense() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the Client model
    const Client = mongoose.model('Client', new mongoose.Schema({}, { strict: false }));

    // Find all clients and show their license info
    const clients = await Client.find({}).select('name email license isLicenseActive licenseExpiryDate').lean();

    console.log('\n📊 Client License Status:');
    console.log('='.repeat(80));

    clients.forEach((client, index) => {
      console.log(`\n${index + 1}. ${client.name || 'Unnamed Client'}`);
      console.log(`   Email: ${client.email}`);
      console.log(`   ID: ${client._id}`);
      console.log(`   License: ${client.license !== undefined ? client.license : 'FIELD MISSING'}`);
      console.log(`   License Type: ${typeof client.license}`);
      console.log(`   isLicenseActive: ${client.isLicenseActive}`);
      console.log(`   licenseExpiryDate: ${client.licenseExpiryDate || 'Not set'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal clients: ${clients.length}`);
    console.log(`Clients with license field: ${clients.filter(c => c.license !== undefined).length}`);
    console.log(`Clients without license field: ${clients.filter(c => c.license === undefined).length}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkClientLicense();
