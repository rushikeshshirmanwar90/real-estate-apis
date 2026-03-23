#!/usr/bin/env node

/**
 * Daily License Decrement Script
 * 
 * This script should be run daily via cron job to decrement all client licenses by 1 day.
 * It will automatically expire licenses when they reach 0 and deactivate client access.
 * 
 * Usage:
 * - Add to crontab: 0 0 * * * /path/to/node /path/to/this/script.js
 * - Or run manually: node daily-license-decrement.js
 * 
 * Environment Variables Required:
 * - MONGODB_URI: MongoDB connection string
 * - NEXT_PUBLIC_DOMAIN: Domain for API calls (optional, defaults to localhost)
 */

const axios = require('axios');
const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';
const API_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';
const USE_API = process.env.USE_API === 'true'; // Set to 'true' to use API endpoint instead of direct DB

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toISOString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

async function decrementLicensesViaAPI() {
    try {
        log('🚀 Starting license decrement via API...', 'blue');
        
        const response = await axios.post(`${API_DOMAIN}/api/license/decrement`);
        
        if (response.data.success) {
            const { processed, expired, stillActive, errors } = response.data.data;
            
            log(`✅ License decrement completed successfully!`, 'green');
            log(`📊 Results: ${processed} processed, ${expired} expired, ${stillActive} still active, ${errors} errors`, 'cyan');
            
            if (errors > 0) {
                log(`⚠️ ${errors} errors occurred during processing`, 'yellow');
            }
            
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'API call failed');
        }
    } catch (error) {
        log(`❌ API call failed: ${error.message}`, 'red');
        if (error.response) {
            log(`📄 Response status: ${error.response.status}`, 'red');
            log(`📄 Response data: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
        }
        throw error;
    }
}

async function decrementLicensesDirectDB() {
    let client;
    
    try {
        log('🔗 Connecting to MongoDB...', 'blue');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db();
        const clientsCollection = db.collection('clients');
        
        log('🔍 Finding clients with active licenses...', 'blue');
        
        // Find all clients with active licenses (license > 0, excluding lifetime -1)
        const clientsWithActiveLicense = await clientsCollection.find({
            license: { $gt: 0 }, // Greater than 0 (excludes expired 0 and lifetime -1)
            isLicenseActive: true
        }).toArray();
        
        log(`📊 Found ${clientsWithActiveLicense.length} clients with active licenses`, 'cyan');
        
        const results = {
            processed: 0,
            expired: 0,
            stillActive: 0,
            errors: 0,
            details: []
        };
        
        // Process each client
        for (const clientDoc of clientsWithActiveLicense) {
            try {
                const newLicenseValue = clientDoc.license - 1;
                const isNowExpired = newLicenseValue <= 0;
                
                // Update the client
                const updateData = {
                    license: Math.max(0, newLicenseValue), // Ensure it doesn't go below 0
                    isLicenseActive: !isNowExpired
                };
                
                // Set expiry date if expired
                if (isNowExpired) {
                    updateData.licenseExpiryDate = new Date();
                }
                
                await clientsCollection.updateOne(
                    { _id: clientDoc._id },
                    { $set: updateData }
                );
                
                results.processed++;
                
                if (isNowExpired) {
                    results.expired++;
                    log(`⚠️ Client ${clientDoc.name} (${clientDoc._id}) license expired`, 'yellow');
                } else {
                    results.stillActive++;
                    log(`✅ Client ${clientDoc.name} (${clientDoc._id}) license decremented to ${newLicenseValue} days`, 'green');
                }
                
                results.details.push({
                    clientId: clientDoc._id,
                    clientName: clientDoc.name,
                    clientEmail: clientDoc.email,
                    previousLicense: clientDoc.license,
                    newLicense: Math.max(0, newLicenseValue),
                    isExpired: isNowExpired,
                    status: isNowExpired ? 'expired' : newLicenseValue <= 7 ? 'expiring_soon' : 'active'
                });
                
            } catch (clientError) {
                results.errors++;
                log(`❌ Error processing client ${clientDoc._id}: ${clientError.message}`, 'red');
                
                results.details.push({
                    clientId: clientDoc._id,
                    clientName: clientDoc.name,
                    error: clientError.message
                });
            }
        }
        
        log('✅ Direct DB license decrement completed', 'green');
        log(`📊 Results: ${results.processed} processed, ${results.expired} expired, ${results.stillActive} still active, ${results.errors} errors`, 'cyan');
        
        return results;
        
    } catch (error) {
        log(`❌ Database operation failed: ${error.message}`, 'red');
        throw error;
    } finally {
        if (client) {
            await client.close();
            log('🔗 MongoDB connection closed', 'blue');
        }
    }
}

async function main() {
    try {
        log('🕒 Starting daily license decrement job...', 'bright');
        log(`⚙️ Mode: ${USE_API ? 'API' : 'Direct DB'}`, 'cyan');
        
        let results;
        
        if (USE_API) {
            results = await decrementLicensesViaAPI();
        } else {
            results = await decrementLicensesDirectDB();
        }
        
        // Summary
        log('📋 SUMMARY:', 'bright');
        log(`   • Total processed: ${results.processed}`, 'cyan');
        log(`   • Newly expired: ${results.expired}`, results.expired > 0 ? 'yellow' : 'cyan');
        log(`   • Still active: ${results.stillActive}`, 'cyan');
        log(`   • Errors: ${results.errors}`, results.errors > 0 ? 'red' : 'cyan');
        
        // Show expiring soon clients
        const expiringSoon = results.details.filter(d => d.status === 'expiring_soon' && !d.error);
        if (expiringSoon.length > 0) {
            log(`⚠️ Clients expiring soon (≤7 days):`, 'yellow');
            expiringSoon.forEach(client => {
                log(`   • ${client.clientName}: ${client.newLicense} days left`, 'yellow');
            });
        }
        
        // Show newly expired clients
        const newlyExpired = results.details.filter(d => d.isExpired && !d.error);
        if (newlyExpired.length > 0) {
            log(`🚨 Newly expired clients:`, 'red');
            newlyExpired.forEach(client => {
                log(`   • ${client.clientName} (${client.clientEmail})`, 'red');
            });
        }
        
        log('✅ Daily license decrement job completed successfully!', 'green');
        process.exit(0);
        
    } catch (error) {
        log(`❌ Daily license decrement job failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Handle process signals
process.on('SIGINT', () => {
    log('🛑 Received SIGINT, shutting down gracefully...', 'yellow');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('🛑 Received SIGTERM, shutting down gracefully...', 'yellow');
    process.exit(0);
});

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main, decrementLicensesViaAPI, decrementLicensesDirectDB };