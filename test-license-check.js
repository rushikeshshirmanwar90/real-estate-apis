// Test script to verify license checking logic
// Run with: node test-license-check.js

const testCases = [
    { license: -1, isLicenseActive: true, expected: true, desc: "Lifetime license" },
    { license: 365, isLicenseActive: true, expected: true, desc: "Active license with 365 days" },
    { license: 1, isLicenseActive: true, expected: true, desc: "Active license with 1 day" },
    { license: 0, isLicenseActive: false, expected: false, desc: "Expired license (0 days)" },
    { license: 0, isLicenseActive: true, expected: false, desc: "0 days but active flag true" },
    { license: 100, isLicenseActive: false, expected: false, desc: "100 days but inactive flag" },
];

function checkLicenseLogic(license, isLicenseActive) {
    // This is the logic from projectLicenseFilter.ts
    const hasAccess = license === -1 || (license > 0 && isLicenseActive);
    return hasAccess;
}

console.log('🧪 Testing License Check Logic\n');

testCases.forEach((test, index) => {
    const result = checkLicenseLogic(test.license, test.isLicenseActive);
    const passed = result === test.expected;
    
    console.log(`Test ${index + 1}: ${test.desc}`);
    console.log(`  License: ${test.license}, Active: ${test.isLicenseActive}`);
    console.log(`  Expected: ${test.expected}, Got: ${result}`);
    console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log('\n📋 Summary:');
console.log('- license === -1: Always has access (lifetime)');
console.log('- license === 0: No access (expired)');
console.log('- license > 0 && isLicenseActive: Has access');
console.log('- license > 0 && !isLicenseActive: No access');
