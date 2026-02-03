#!/usr/bin/env node

/**
 * Push Token Maintenance Cron Job
 * Implements Requirements 3.4, 3.6
 * 
 * This script can be run by external cron services to trigger maintenance jobs.
 * It can be used with:
 * - System cron (crontab)
 * - GitHub Actions
 * - Vercel Cron
 * - AWS EventBridge
 * - Any other scheduling service
 * 
 * Usage:
 *   node scripts/maintenance-cron.js [job-type] [options]
 * 
 * Examples:
 *   node scripts/maintenance-cron.js full
 *   node scripts/maintenance-cron.js cleanup --max-age=30
 *   node scripts/maintenance-cron.js health --force
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  cronSecret: process.env.CRON_SECRET || 'default-secret',
  timeout: 300000, // 5 minutes
};

// Parse command line arguments
const args = process.argv.slice(2);
const jobType = args[0] || 'full';
const options = {};

// Parse options
args.slice(1).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    if (key === 'max-age') {
      options.maxAgeInDays = parseInt(value) || 30;
    } else if (key === 'force') {
      options.force = true;
    }
  }
});

/**
 * Make HTTP request
 */
function makeRequest(url, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.cronSecret}`,
      },
      timeout: config.timeout,
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(requestOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Run maintenance job
 */
async function runMaintenanceJob() {
  try {
    console.log(`🔧 Starting maintenance job: ${jobType}`);
    console.log(`⚙️ Options:`, options);
    console.log(`🌐 API URL: ${config.baseUrl}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    const url = `${config.baseUrl}/api/push-token/maintenance/schedule`;
    const payload = {
      jobType,
      ...options,
    };

    const response = await makeRequest(url, 'POST', payload);

    console.log(`📡 Response Status: ${response.statusCode}`);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ Maintenance job completed successfully');
      
      if (response.data && response.data.data) {
        const { job, summary, operations, alerts } = response.data.data;
        
        console.log('📊 Job Summary:');
        console.log(`  - Job ID: ${job.id}`);
        console.log(`  - Success: ${job.success}`);
        console.log(`  - Duration: ${Math.round(job.duration / 1000)}s`);
        console.log(`  - Tokens Processed: ${summary.tokensProcessed}`);
        console.log(`  - Tokens Deactivated: ${summary.tokensDeactivated}`);
        console.log(`  - Tokens Deleted: ${summary.tokensDeleted}`);
        console.log(`  - Healthy Tokens: ${summary.healthyTokens}`);
        console.log(`  - Unhealthy Tokens: ${summary.unhealthyTokens}`);
        console.log(`  - Errors: ${summary.errorCount}`);

        console.log('🔧 Operations:');
        console.log(`  - Cleanup: ${operations.cleanup.executed ? (operations.cleanup.success ? '✅' : '❌') : '⏭️'}`);
        console.log(`  - Health Refresh: ${operations.healthRefresh.executed ? (operations.healthRefresh.success ? '✅' : '❌') : '⏭️'}`);
        console.log(`  - Analytics: ${operations.analytics.executed ? (operations.analytics.success ? '✅' : '❌') : '⏭️'}`);

        if (alerts && alerts.length > 0) {
          console.log('🚨 Alerts:');
          alerts.forEach(alert => console.log(`  - ${alert}`));
        }

        // Exit with error code if job failed
        if (!job.success) {
          console.error('❌ Maintenance job failed');
          process.exit(1);
        }
      }

    } else if (response.statusCode === 409) {
      console.log('⏸️ Maintenance job already running');
      process.exit(0);
    } else if (response.statusCode === 429) {
      console.log('⏭️ Maintenance job not due yet');
      if (response.data && response.data.data) {
        console.log(`  - Last Run: ${response.data.data.lastRun}`);
        console.log(`  - Next Scheduled: ${response.data.data.nextScheduledRun}`);
      }
      process.exit(0);
    } else {
      console.error(`❌ Maintenance job failed with status ${response.statusCode}`);
      console.error('Response:', response.data);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error running maintenance job:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

/**
 * Get maintenance status
 */
async function getMaintenanceStatus() {
  try {
    console.log('📊 Getting maintenance status...');

    const url = `${config.baseUrl}/api/push-token/maintenance/schedule`;
    const response = await makeRequest(url, 'GET');

    console.log(`📡 Response Status: ${response.statusCode}`);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.data && response.data.data) {
        const { status, config: maintenanceConfig, statistics, health } = response.data.data;
        
        console.log('📊 Maintenance Status:');
        console.log(`  - Running: ${status.isRunning}`);
        console.log(`  - Last Run: ${status.lastRun || 'Never'}`);
        console.log(`  - Next Scheduled: ${status.nextScheduledRun || 'Not scheduled'}`);
        console.log(`  - Should Run: ${status.shouldRun}`);
        console.log(`  - Enabled: ${maintenanceConfig.enabled}`);

        console.log('📈 Statistics:');
        console.log(`  - Recent Jobs: ${statistics.recentJobsCount}`);
        console.log(`  - Success Rate: ${statistics.successRate}%`);
        console.log(`  - Average Duration: ${Math.round(statistics.averageDuration / 1000)}s`);
        console.log(`  - Last Successful: ${statistics.lastSuccessfulRun || 'Never'}`);
        console.log(`  - Last Failed: ${statistics.lastFailedRun || 'Never'}`);

        console.log('🏥 Health:');
        console.log(`  - System Healthy: ${health.systemHealthy ? '✅' : '❌'}`);
        if (health.alerts && health.alerts.length > 0) {
          console.log('  - Alerts:');
          health.alerts.forEach(alert => console.log(`    - ${alert}`));
        }
      }
    } else {
      console.error(`❌ Failed to get status with code ${response.statusCode}`);
      console.error('Response:', response.data);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error getting maintenance status:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log('🚀 Push Token Maintenance Cron Job');
  console.log('=====================================');

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/maintenance-cron.js [job-type] [options]');
    console.log('');
    console.log('Job Types:');
    console.log('  full      - Run all maintenance operations (default)');
    console.log('  cleanup   - Run only token cleanup');
    console.log('  health    - Run only health refresh');
    console.log('  analytics - Run only analytics update');
    console.log('  status    - Get maintenance status');
    console.log('');
    console.log('Options:');
    console.log('  --max-age=N  - Set maximum token age in days (default: 30)');
    console.log('  --force      - Force run even if not scheduled');
    console.log('  --help, -h   - Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  NEXT_PUBLIC_API_URL - API base URL (default: http://localhost:8080)');
    console.log('  CRON_SECRET         - Authentication secret for cron jobs');
    process.exit(0);
  }

  // Handle status command
  if (jobType === 'status') {
    await getMaintenanceStatus();
    return;
  }

  // Validate job type
  const validJobTypes = ['full', 'cleanup', 'health', 'analytics'];
  if (!validJobTypes.includes(jobType)) {
    console.error(`❌ Invalid job type: ${jobType}`);
    console.error(`Valid types: ${validJobTypes.join(', ')}`);
    process.exit(1);
  }

  // Run maintenance job
  await runMaintenanceJob();
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, exiting...');
  process.exit(0);
});

// Run main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});