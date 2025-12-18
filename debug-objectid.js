const { Types } = require('mongoose');

const testId = '694453fbf5f3125cda2d820b';

console.log('🔍 Debugging ObjectId Validation');
console.log('================================');
console.log('Test ID:', testId);
console.log('ID Length:', testId.length);
console.log('Types.ObjectId.isValid():', Types.ObjectId.isValid(testId));

// Try creating ObjectId
try {
    const objectId = new Types.ObjectId(testId);
    console.log('✅ ObjectId creation successful:', objectId.toString());
} catch (error) {
    console.log('❌ ObjectId creation failed:', error.message);
}

// Test with different formats
const testIds = [
    '694453fbf5f3125cda2d820b',
    '694453fbf5f3125cda2d820b ',  // with space
    ' 694453fbf5f3125cda2d820b',  // with leading space
    '694453fbf5f3125cda2d820B',  // uppercase
];

console.log('\n📋 Testing different ID formats:');
testIds.forEach((id, index) => {
    console.log(`${index + 1}. "${id}" (length: ${id.length}) -> ${Types.ObjectId.isValid(id)}`);
});