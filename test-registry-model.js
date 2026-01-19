// Test script to verify Registry model validation
// Run this with: node test-registry-model.js

const mongoose = require('mongoose');

// Define the schema exactly as in the updated model
const RegistrySchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  projectName: {
    type: String,
    required: true,
  },
  flatNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'submitted', 'verified', 'approved', 'rejected'],
    default: 'draft',
  },
  address: {
    type: String,
    required: false, // ← This should be false
  },
  aadharNumber: {
    type: String,
    required: false, // ← This should be false
  },
  panNumber: {
    type: String,
    required: false, // ← This should be false
  },
});

// Create a test model
const TestRegistry = mongoose.model('TestRegistry', RegistrySchema);

// Test validation
const testDoc = new TestRegistry({
  bookingId: new mongoose.Types.ObjectId(),
  customerName: 'Test Customer',
  mobileNumber: '9876543210',
  projectName: 'Test Project',
  flatNumber: 'A-101',
  status: 'draft',
  address: '',        // Empty - should be OK
  aadharNumber: '',   // Empty - should be OK
  panNumber: '',      // Empty - should be OK
});

// Validate the document
testDoc.validate()
  .then(() => {
    console.log('✅ SUCCESS: Registry validation passed with empty optional fields!');
    console.log('The model is correctly configured.');
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ FAILED: Registry validation failed');
    console.log('Error:', error.message);
    console.log('\nThis means the model is still using the old schema.');
    console.log('Please restart the development server.');
    process.exit(1);
  });
