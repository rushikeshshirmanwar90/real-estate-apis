#!/usr/bin/env node

/**
 * Generate Secure Secrets for Environment Variables
 * 
 * Usage: node generate-secrets.js
 * 
 * This script generates cryptographically secure random secrets
 * for use in your .env.local file.
 */

const crypto = require('crypto');

console.log('\n' + '='.repeat(60));
console.log('🔐 SECURE SECRET GENERATOR');
console.log('='.repeat(60) + '\n');

console.log('⚠️  IMPORTANT: Copy these values to your .env.local file\n');
console.log('📋 Generated Secrets:\n');

// JWT Secret (256 bits = 32 bytes)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);
console.log('');

// Cron Secret (192 bits = 24 bytes)
const cronSecret = crypto.randomBytes(24).toString('hex');
console.log('CRON_SECRET=' + cronSecret);
console.log('');

// API Bearer Token (384 bits = 48 bytes, base64 encoded)
const bearerToken = crypto.randomBytes(48).toString('base64');
console.log('API_BEARER_TOKEN=' + bearerToken);
console.log('');

// Authentication Code (256 bits = 32 bytes, base64url encoded)
const authCode = crypto.randomBytes(32).toString('base64url');
console.log('NEXT_PUBLIC_AUTHENTICATION_CODE=' + authCode);
console.log('');

console.log('='.repeat(60));
console.log('✅ Secrets generated successfully!');
console.log('='.repeat(60) + '\n');

console.log('📝 Next Steps:\n');
console.log('1. Copy the values above');
console.log('2. Open .env.local in your editor');
console.log('3. Replace the placeholder values');
console.log('4. Save the file');
console.log('5. Restart your development server\n');

console.log('⚠️  Security Reminders:\n');
console.log('- Never commit .env.local to git');
console.log('- Keep these secrets secure');
console.log('- Rotate secrets every 90-180 days');
console.log('- Use different secrets for production\n');

console.log('🔒 Additional Credentials Needed:\n');
console.log('You still need to manually set:');
console.log('- DB_URL (MongoDB connection string)');
console.log('- MONGO_USERNAME (MongoDB username)');
console.log('- MONGO_PASSWORD (MongoDB password)');
console.log('- REDIS_PASSWORD (Redis password)');
console.log('- SMTP_USER (Email address)');
console.log('- SMTP_PASS (Email app password)\n');

console.log('📚 For more information, see:');
console.log('   ./SECURITY_SETUP.md\n');
