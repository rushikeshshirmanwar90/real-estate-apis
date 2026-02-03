# RetryManager Usage Guide

## Overview

The RetryManager implements exponential backoff retry logic with jitter strategies and circuit breaker patterns for failed notification deliveries. It provides robust retry mechanisms to ensure reliable notification delivery while protecting external services from being overwhelmed.

## Features

- **Exponential Backoff**: Delays increase exponentially with each retry attempt
- **Jitter Strategies**: Four different jitter types to prevent thundering herd problems
- **Circuit Breaker**: Protects external services by temporarily stopping retries when failure threshold is reached
- **Retry Queue**: Manages failed notifications and schedules retries automatically
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Configurable**: All retry parameters can be customized

## Basic Usage

### Creating a RetryManager

```typescript
import { getRetryManager, RetryConfig } from '@/lib/services/retryManager';

// Get the global retry manager with default configuration
const retryManager = getRetryManager();

// Or create with custom configuration
const customConfig: Partial<RetryConfig> = {
  maxAttempts: 5,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffFactor: 2.5,
  jitterType: 'EQUAL',
  circuitBreakerThreshold: 10,
  circuitBreakerResetTimeoutMs: 60000,
};

const customRetryManager = getRetryManager(customConfig);
```

### Scheduling Failed Notifications for Retry

```typescript
import { createFailedNotification } from '@/lib/services/retryManager';

// Create a failed notification
const failedNotification = createFailedNotification(
  'notification-123',           // Notification ID
  ['user1', 'user2'],          // User IDs that failed
  'Important Notification',     // Title
  'This is an important message', // Body
  'Expo service unavailable',   // Error message
  { activityId: 'activity-456' }, // Data payload
  { priority: 'high' }          // Options
);

// Schedule for retry
await retryManager.scheduleRetry(failedNotification);
```

### Monitoring Retry Status

```typescript
// Get status for a specific notification
const status = await retryManager.getRetryStatus('notification-123');
console.log('Retry Status:', {
  notificationId: status?.notificationId,
  currentAttempt: status?.currentAttempt,
  maxAttempts: status?.maxAttempts,
  nextRetryAt: status?.nextRetryAt,
  lastError: status?.lastError,
  circuitBreakerState: status?.circuitBreakerState,
});

// Get overall queue statistics
const stats = retryManager.getQueueStatistics();
console.log('Queue Statistics:', {
  totalInQueue: stats.totalInQueue,
  readyForRetry: stats.readyForRetry,
  byAttemptCount: stats.byAttemptCount,
  circuitBreakerState: stats.circuitBreakerState,
});
```

### Manual Queue Processing

```typescript
// Manually trigger retry queue processing
const result = await retryManager.processRetryQueue();
console.log('Processing Result:', {
  processed: result.processed,
  successful: result.successful,
  failed: result.failed,
  skipped: result.skipped,
  errors: result.errors,
});
```

## Configuration Options

### RetryConfig Interface

```typescript
interface RetryConfig {
  maxAttempts: number;                    // Maximum retry attempts (default: 3)
  initialDelayMs: number;                 // Initial delay in milliseconds (default: 1000)
  maxDelayMs: number;                     // Maximum delay cap (default: 16000)
  backoffFactor: number;                  // Exponential backoff multiplier (default: 2)
  jitterType: 'NONE' | 'FULL' | 'EQUAL' | 'DECORRELATED'; // Jitter strategy (default: 'FULL')
  circuitBreakerThreshold: number;        // Failures before circuit opens (default: 5)
  circuitBreakerResetTimeoutMs: number;   // Time before circuit reset attempt (default: 30000)
}
```

### Jitter Strategies

1. **NONE**: No jitter applied, uses exact exponential backoff
2. **FULL**: Random delay between 0 and calculated backoff time
3. **EQUAL**: Half the backoff time plus random half
4. **DECORRELATED**: Random delay between initial delay and 3x previous delay

### Updating Configuration

```typescript
await retryManager.updateRetryConfiguration({
  maxAttempts: 5,
  jitterType: 'DECORRELATED',
  circuitBreakerThreshold: 8,
});
```

## Integration with Notification Service

The RetryManager is automatically integrated with the notification service. When notifications fail, they are automatically scheduled for retry:

```typescript
// In notificationService.ts
import { getRetryManager, createFailedNotification } from './retryManager';

async function sendNotificationWithErrorHandling(context, userIds, payload, target) {
  try {
    const result = await PushNotificationService.sendToUsers(userIds, payload.title, payload.body, payload.data);
    
    if (!result.success && result.errors.length > 0) {
      // Schedule failed notifications for retry
      const retryManager = getRetryManager();
      const failedNotification = createFailedNotification(
        `${context.activityId}_${target}_${Date.now()}`,
        userIds,
        payload.title,
        payload.body,
        result.errors.join('; '),
        payload.data
      );
      
      await retryManager.scheduleRetry(failedNotification);
    }
  } catch (error) {
    // Handle critical errors
  }
}
```

## API Endpoints

### GET /api/notifications/retry

Get retry queue statistics or status for a specific notification:

```bash
# Get overall statistics
curl http://localhost:8080/api/notifications/retry

# Get status for specific notification
curl "http://localhost:8080/api/notifications/retry?notificationId=notification-123"
```

### POST /api/notifications/retry

Trigger manual retry processing or manage retries:

```bash
# Process retry queue manually
curl -X POST http://localhost:8080/api/notifications/retry \
  -H "Content-Type: application/json" \
  -d '{"action": "process_queue"}'

# Clear retries for specific notification
curl -X POST http://localhost:8080/api/notifications/retry \
  -H "Content-Type: application/json" \
  -d '{"action": "clear_retries", "notificationId": "notification-123"}'

# Clear entire retry queue
curl -X POST http://localhost:8080/api/notifications/retry \
  -H "Content-Type: application/json" \
  -d '{"action": "clear_all"}'
```

### PUT /api/notifications/retry

Update retry configuration:

```bash
curl -X PUT http://localhost:8080/api/notifications/retry \
  -H "Content-Type: application/json" \
  -d '{
    "maxAttempts": 5,
    "initialDelayMs": 2000,
    "jitterType": "EQUAL",
    "circuitBreakerThreshold": 8
  }'
```

## Circuit Breaker Behavior

The circuit breaker protects external services by temporarily stopping retry attempts when failures exceed the threshold:

1. **CLOSED**: Normal operation, retries are processed
2. **OPEN**: Too many failures, retries are skipped
3. **HALF_OPEN**: Testing if service has recovered

### Circuit Breaker States

- **CLOSED → OPEN**: When failure count reaches threshold
- **OPEN → HALF_OPEN**: After reset timeout expires
- **HALF_OPEN → CLOSED**: When a retry succeeds
- **HALF_OPEN → OPEN**: When a retry fails

## Monitoring and Logging

The RetryManager provides comprehensive logging for monitoring:

```
🔄 Scheduled retry for notification notification-123:
  attempt: 2
  maxAttempts: 3
  nextRetryAt: 2024-01-15T10:30:45.123Z
  baseDelayMs: 2000
  jitteredDelayMs: 1847
  jitterType: FULL
  circuitBreakerState: CLOSED

🔄 Processing 5 notifications ready for retry (12 total in queue)

✅ Retry successful for notification-123: 2 messages sent

❌ Max attempts (3) exceeded for notification-456

🚨 Circuit breaker OPENED after 5 failures
```

## Best Practices

1. **Monitor Queue Size**: Keep an eye on retry queue statistics to detect systemic issues
2. **Adjust Configuration**: Tune retry parameters based on your service's characteristics
3. **Circuit Breaker Tuning**: Set appropriate thresholds to balance reliability and protection
4. **Error Analysis**: Review retry errors to identify patterns and root causes
5. **Performance Impact**: Consider the impact of retries on system resources

## Error Handling

The RetryManager handles various error scenarios:

- **Transient Errors**: Network timeouts, temporary service unavailability
- **Permanent Errors**: Invalid tokens, authentication failures
- **System Errors**: Database issues, memory exhaustion

Failed notifications are automatically categorized and handled appropriately, with permanent errors not being retried and transient errors scheduled for retry with exponential backoff.