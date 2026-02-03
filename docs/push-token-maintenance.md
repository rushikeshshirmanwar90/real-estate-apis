# Push Token Maintenance Service

## Overview

The Push Token Maintenance Service implements automated cleanup and health monitoring for push notification tokens. This service ensures the notification system stays clean and performant by automatically removing inactive tokens and providing comprehensive analytics.

## Features

### 🧹 Automated Cleanup
- **Scheduled Jobs**: Automatically clean up inactive tokens older than 30 days
- **Duplicate Removal**: Identify and remove duplicate tokens
- **Format Validation**: Remove tokens with invalid formats
- **Batch Processing**: Process tokens in configurable batches for performance

### 🔄 Health Monitoring
- **Token Health Refresh**: Regularly validate and update token health status
- **Validation Scoring**: Score tokens based on age, usage, and format
- **Automatic Deactivation**: Auto-deactivate tokens with repeated failures
- **Health Metrics**: Track success/failure rates for each token

### 📊 Usage Analytics
- **Comprehensive Statistics**: Track token usage patterns and trends
- **Platform Distribution**: Monitor token distribution across iOS, Android, and Web
- **User Type Analysis**: Analyze token usage by client, staff, and admin users
- **Trend Analysis**: Historical data for registration and usage patterns

## API Endpoints

### Manual Maintenance
```
POST /api/push-token/maintenance
```
Run maintenance job manually with options:
- `includeCleanup`: Run token cleanup (default: true)
- `includeHealthRefresh`: Run health refresh (default: true)
- `includeAnalytics`: Update analytics (default: true)
- `maxAgeInDays`: Maximum token age for cleanup (default: 30)
- `force`: Force run even if not scheduled (default: false)

### Maintenance Status
```
GET /api/push-token/maintenance
```
Get current maintenance status and analytics:
- `includeAnalytics`: Include usage analytics (default: true)
- `includeHistory`: Include job history (default: true)
- `historyLimit`: Number of historical jobs to return (default: 10)

### Configuration Update
```
PUT /api/push-token/maintenance
```
Update maintenance configuration:
- `enabled`: Enable/disable maintenance (default: true)
- `cleanupIntervalHours`: Hours between cleanup runs (default: 24)
- `healthRefreshIntervalHours`: Hours between health refreshes (default: 6)
- `maxTokenAgeInDays`: Maximum token age before cleanup (default: 30)
- `batchSize`: Batch size for processing (default: 100)
- `retryAttempts`: Number of retry attempts (default: 3)
- `alertThresholds`: Alert configuration

### Scheduled Maintenance
```
POST /api/push-token/maintenance/schedule
```
Endpoint for automated scheduling (requires authentication):
- `jobType`: Type of job to run ('full', 'cleanup', 'health', 'analytics')
- `maxAgeInDays`: Maximum token age for cleanup
- `force`: Force run even if not scheduled

## Scheduling

### Vercel Cron
The service includes Vercel cron configuration in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/push-token/maintenance/schedule",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Manual Cron Script
Use the provided Node.js script for external scheduling:
```bash
# Run full maintenance
node scripts/maintenance-cron.js full

# Run only cleanup
node scripts/maintenance-cron.js cleanup --max-age=30

# Force run maintenance
node scripts/maintenance-cron.js full --force

# Get maintenance status
node scripts/maintenance-cron.js status
```

### System Cron
Add to system crontab for daily maintenance at 2 AM:
```bash
0 2 * * * cd /path/to/app && node scripts/maintenance-cron.js full
```

## Configuration

### Environment Variables
- `CRON_SECRET`: Secret key for scheduled job authentication
- `NEXT_PUBLIC_API_URL`: API base URL for cron script

### Default Configuration
```javascript
{
  enabled: true,
  cleanupIntervalHours: 24,        // Run daily
  healthRefreshIntervalHours: 6,   // Run every 6 hours
  maxTokenAgeInDays: 30,
  batchSize: 100,
  retryAttempts: 3,
  alertThresholds: {
    unhealthyTokenPercentage: 25,
    failedJobsCount: 3,
    processingTimeMinutes: 10,
  },
}
```

## Usage Examples

### Manual Maintenance
```javascript
import { PushTokenMaintenanceService } from '@/lib/services/pushTokenMaintenanceService';

const maintenanceService = PushTokenMaintenanceService.getInstance();

// Run full maintenance
const result = await maintenanceService.runMaintenanceJob();
console.log('Maintenance completed:', result.success);

// Run selective maintenance
const cleanupResult = await maintenanceService.runMaintenanceJob({
  includeCleanup: true,
  includeHealthRefresh: false,
  includeAnalytics: false,
  maxAgeInDays: 60,
});

// Force run maintenance
const forceResult = await maintenanceService.forceRunMaintenance();
```

### Analytics Generation
```javascript
// Generate usage analytics
const analytics = await maintenanceService.generateUsageAnalytics();

console.log('Total tokens:', analytics.overview.totalTokens);
console.log('Active tokens:', analytics.overview.activeTokens);
console.log('Healthy tokens:', analytics.health.healthyTokens);
console.log('Platform distribution:', analytics.distribution.byPlatform);
```

### Token Usage Tracking
```javascript
// Track successful token usage
await maintenanceService.trackTokenUsage('token123', {
  notificationId: 'notif123',
  activityId: 'activity123',
  deliveryStatus: 'success',
});

// Track failed token usage
await maintenanceService.trackTokenUsage('token456', {
  notificationId: 'notif456',
  deliveryStatus: 'failure',
  errorMessage: 'Token expired',
});
```

### Configuration Management
```javascript
// Update configuration
maintenanceService.updateConfig({
  cleanupIntervalHours: 12,  // Run twice daily
  maxTokenAgeInDays: 60,     // Keep tokens for 60 days
  enabled: true,
});

// Get current status
const status = maintenanceService.getMaintenanceStatus();
console.log('Is running:', status.isRunning);
console.log('Last run:', status.lastRun);
console.log('Next scheduled:', status.nextScheduledRun);
```

## Monitoring and Alerts

### Health Checks
The service provides comprehensive health monitoring:
- **System Health**: Overall system status based on success rates and processing times
- **Token Health**: Individual token health scores and validation status
- **Job History**: Historical maintenance job results and performance metrics

### Alert Conditions
Alerts are triggered when:
- Unhealthy token percentage exceeds threshold (default: 25%)
- Multiple consecutive maintenance jobs fail (default: 3)
- Processing time exceeds threshold (default: 10 minutes)
- Maintenance is overdue by more than 2x the scheduled interval

### Metrics
Key metrics tracked:
- Token counts by platform, user type, and validation score
- Usage patterns (daily, weekly, monthly active tokens)
- Health trends over time
- Maintenance job success rates and processing times

## Security

### Authentication
- Scheduled endpoints require `CRON_SECRET` authentication
- Manual endpoints should be protected by application authentication
- Rate limiting recommended for public endpoints

### Data Privacy
- Token values are not logged in plain text
- Sensitive information excluded from analytics
- Error messages sanitized to prevent information leakage

## Performance

### Optimization Features
- **Batch Processing**: Process tokens in configurable batches
- **Connection Pooling**: Efficient database connection management
- **Caching**: Validation result caching to reduce redundant operations
- **Async Processing**: Non-blocking maintenance operations

### Scalability
- Designed to handle thousands of tokens efficiently
- Configurable batch sizes for different system capacities
- Graceful degradation under high load
- Memory-efficient processing with streaming where possible

## Troubleshooting

### Common Issues

1. **Maintenance Not Running**
   - Check if maintenance is enabled in configuration
   - Verify cron job authentication (CRON_SECRET)
   - Check system logs for errors

2. **High Processing Times**
   - Reduce batch size in configuration
   - Check database performance and indexes
   - Monitor system resources during maintenance

3. **Token Cleanup Issues**
   - Verify database connectivity
   - Check token validation logic
   - Review cleanup criteria and thresholds

### Debugging
Enable detailed logging by setting appropriate log levels:
```javascript
// Enable debug logging
console.log('🔧 Maintenance debug info:', {
  config: maintenanceService.getMaintenanceStatus().config,
  shouldRun: maintenanceService.shouldRunMaintenance(),
  history: maintenanceService.getMaintenanceHistory(5),
});
```

## Requirements Fulfilled

This implementation fulfills the following requirements:

- **Requirement 3.4**: ✅ Clean up inactive push tokens older than 30 days
- **Requirement 3.6**: ✅ Support multiple push tokens per user for multiple devices
- **Requirement 3.6**: ✅ Implement token usage tracking and analytics

The service provides a comprehensive solution for push token lifecycle management with automated cleanup, health monitoring, and detailed analytics capabilities.