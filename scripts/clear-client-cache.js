#!/usr/bin/env node

/**
 * Script to clear Redis cache for clients
 * Usage:
 *   node scripts/clear-client-cache.js --all
 *   node scripts/clear-client-cache.js --clientId=<client-id>
 */

const args = process.argv.slice(2);

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function clearCache() {
  try {
    let body = {};
    
    if (args.includes('--all')) {
      body = { clearAll: true };
      console.log('🧹 Clearing all client caches...');
    } else {
      const clientIdArg = args.find(arg => arg.startsWith('--clientId='));
      if (!clientIdArg) {
        console.error('❌ Error: Please provide --all or --clientId=<id>');
        console.log('\nUsage:');
        console.log('  node scripts/clear-client-cache.js --all');
        console.log('  node scripts/clear-client-cache.js --clientId=<client-id>');
        process.exit(1);
      }
      
      const clientId = clientIdArg.split('=')[1];
      body = { clientId };
      console.log(`🧹 Clearing cache for client: ${clientId}...`);
    }

    const response = await fetch(`${API_URL}/api/clients/clear-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Success:', data.message);
      console.log('📋 Cleared keys:', data.data.clearedKeys);
    } else {
      console.error('❌ Error:', data.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to clear cache:', error.message);
    process.exit(1);
  }
}

clearCache();
