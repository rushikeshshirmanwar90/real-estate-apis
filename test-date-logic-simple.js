// Simple test to verify date filtering logic

console.log('🧪 Testing Date Filtering Logic');
console.log('===============================');

// Simulate the date input from the mobile app
const inputDate = '2025-12-21';
console.log('Input date:', inputDate);

// OLD logic (problematic)
console.log('\n❌ OLD Logic (problematic):');
const oldStart = new Date(inputDate);
oldStart.setHours(0, 0, 0, 0);
const oldEnd = new Date(inputDate);
oldEnd.setHours(23, 59, 59, 999);

console.log('  Start filter:', oldStart.toISOString());
console.log('  End filter:', oldEnd.toISOString());

// NEW logic (fixed)
console.log('\n✅ NEW Logic (fixed):');
const newStart = new Date(inputDate + 'T00:00:00.000Z');
const newEnd = new Date(inputDate + 'T23:59:59.999Z');

console.log('  Start filter:', newStart.toISOString());
console.log('  End filter:', newEnd.toISOString());

// Simulate a material activity created today
const activityDate = new Date().toISOString();
console.log('\n📅 Sample activity date:', activityDate);

// Test if the activity would be included
const oldMatch = activityDate >= oldStart.toISOString() && activityDate <= oldEnd.toISOString();
const newMatch = activityDate >= newStart.toISOString() && activityDate <= newEnd.toISOString();

console.log('\n🔍 Would activity be included?');
console.log('  Old logic:', oldMatch);
console.log('  New logic:', newMatch);

// Test with different timezones
console.log('\n🌍 Timezone comparison:');
console.log('  Local timezone offset:', new Date().getTimezoneOffset(), 'minutes');
console.log('  Old start (local):', oldStart.toString());
console.log('  New start (UTC):', newStart.toString());

// Test edge cases
console.log('\n🔬 Edge case testing:');

// Activity at start of day
const startOfDay = new Date(inputDate + 'T00:00:00.000Z').toISOString();
console.log('  Start of day activity:', startOfDay);
console.log('  Old logic includes:', startOfDay >= oldStart.toISOString() && startOfDay <= oldEnd.toISOString());
console.log('  New logic includes:', startOfDay >= newStart.toISOString() && startOfDay <= newEnd.toISOString());

// Activity at end of day
const endOfDay = new Date(inputDate + 'T23:59:59.999Z').toISOString();
console.log('  End of day activity:', endOfDay);
console.log('  Old logic includes:', endOfDay >= oldStart.toISOString() && endOfDay <= oldEnd.toISOString());
console.log('  New logic includes:', endOfDay >= newStart.toISOString() && endOfDay <= newEnd.toISOString());

// Activity from next day (should not be included)
const nextDay = new Date(inputDate + 'T00:00:00.000Z');
nextDay.setDate(nextDay.getDate() + 1);
const nextDayActivity = nextDay.toISOString();
console.log('  Next day activity:', nextDayActivity);
console.log('  Old logic includes:', nextDayActivity >= oldStart.toISOString() && nextDayActivity <= oldEnd.toISOString());
console.log('  New logic includes:', nextDayActivity >= newStart.toISOString() && nextDayActivity <= newEnd.toISOString());

console.log('\n✅ Date logic test complete!');