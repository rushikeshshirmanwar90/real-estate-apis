#!/usr/bin/env node

/**
 * Check what the API_BEARER_TOKEN environment variable contains
 */

require('dotenv').config();

const token = process.env.API_BEARER_TOKEN;

console.log('🔍 Environment Variable Check');
console.log('================================\n');

if (!token) {
  console.log('❌ API_BEARER_TOKEN is not set!');
  process.exit(1);
}

console.log('✅ API_BEARER_TOKEN is set');
console.log('Length:', token.length);
console.log('Value:', token);
console.log('First 20 chars:', token.substring(0, 20));
console.log('Last 10 chars:', token.substring(token.length - 10));
console.log('\nHex representation (first 50 bytes):');
console.log(Buffer.from(token).toString('hex').substring(0, 100));

console.log('\nChecking for whitespace/newlines:');
console.log('Has newline:', token.includes('\n'));
console.log('Has carriage return:', token.includes('\r'));
console.log('Has tab:', token.includes('\t'));
console.log('Starts with space:', token.startsWith(' '));
console.log('Ends with space:', token.endsWith(' '));

console.log('\nExpected token:');
const expected = 'eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9.';
console.log('Value:', expected);
console.log('Length:', expected.length);

console.log('\nComparison:');
console.log('Tokens match:', token === expected);
console.log('Trimmed tokens match:', token.trim() === expected.trim());

if (token !== expected) {
  console.log('\n❌ MISMATCH DETECTED!');
  console.log('Difference at character:');
  for (let i = 0; i < Math.max(token.length, expected.length); i++) {
    if (token[i] !== expected[i]) {
      console.log(`  Position ${i}: got '${token[i]}' (${token.charCodeAt(i)}), expected '${expected[i]}' (${expected.charCodeAt(i)})`);
      break;
    }
  }
} else {
  console.log('\n✅ Token matches expected value!');
}
