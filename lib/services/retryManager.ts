import { PushNotificationService } from './pushNotificationService';

/**
 * Exponential Backoff Retry Manager
 * Implements Requirements 1.2, 1.3, 6.2, 6.5
 * 
 * Features:
 * - Exponential backoff with configurable jitter strategies
 * - Retry queue for failed notifications
 * - Circuit breaker pattern for external service protection
 * - Comprehensive retry attempt tracking and logging
 * - Support for different jitter strategies (full, equal, decorrelated)
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitterType: 'NONE' | 'FULL' | 'EQUAL' | 'DECORRELATED';
  circuitBreakerThreshold: number;
  circuitBreakerResetTimeoutMs: number;
}

export interface FailedNotification {
  id: string;
  notificationId: string;
  payload: {
    userIds: string[];
    title: string;
    body: string;
    data?: any;
    options?: any;
  };
  error: string;
  originalTimestamp: Date;
  lastAttemptTimestamp: Date;
  attemptCount: number;
  nextRetryAt: Date;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface RetryStatus {
  notificationId: string;
  currentAttempt: number;
  maxAttempts: number;
  nextRetryAt: Date;
  lastError: string;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  totalDelayMs: number;
  jitterApplied: number;
}

export interface ProcessingResult {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
  processingTimeMs: number;
}

/**
 * Circuit Breaker for external service protection
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number,
    private resetTimeoutMs: number
  ) {}

  canExecute(): boolean {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker transitioning to HALF_OPEN state');
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log('✅ Circuit breaker reset to CLOSED state');
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.log(`🚨 Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Retry Manager with exponential backoff and jitter
 */
export class RetryManager {
  private retryQueue: Map<string, FailedNotification> = new Map();
  private circuitBreaker: CircuitBreaker;
  private config: RetryConfig;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private testMode = false; // Add test mode flag

  // Default configuration
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 16000,
    backoffFactor: 2,
    jitterType: 'FULL',
    circuitBreakerThreshold: 5,
    circuitBreakerResetTimeoutMs: 30000,
  };

  constructor(config?: Partial<RetryConfig>, testMode = false) {
    this.config = { ...RetryManager.DEFAULT_CONFIG, ...config };
    this.testMode = testMode;
    this.circuitBreaker = new CircuitBreaker(
      this.config.circuitBreakerThreshold,
      this.config.circuitBreakerResetTimeoutMs
    );

    // Only start automatic processing if not in test mode
    if (!testMode) {
      this.startProcessing();
    }
  }

  /**
   * Schedule a failed notification for retry
   * Implements Requirements 1.2, 6.2
   */
  async scheduleRetry(notification: FailedNotification): Promise<void> {
    try {
      const now = new Date();
      const retryId = `${notification.notificationId}_${now.getTime()}`;

      // Calculate next retry delay with exponential backoff and jitter
      const baseDelay = Math.min(
        this.config.initialDelayMs * Math.pow(this.config.backoffFactor, notification.attemptCount),
        this.config.maxDelayMs
      );

      const jitteredDelay = this.applyJitter(baseDelay, this.config.jitterType);
      
      // In test mode, make retries immediately available
      const nextRetryAt = this.testMode 
        ? new Date(now.getTime() - 1000) // Past time for immediate processing
        : new Date(now.getTime() + jitteredDelay);

      const failedNotification: FailedNotification = {
        ...notification,
        id: retryId,
        lastAttemptTimestamp: now,
        nextRetryAt,
        circuitBreakerState: this.circuitBreaker.getState(),
      };

      this.retryQueue.set(retryId, failedNotification);

      console.log(`🔄 Scheduled retry for notification ${notification.notificationId}:`, {
        attempt: notification.attemptCount + 1,
        maxAttempts: this.config.maxAttempts,
        nextRetryAt: nextRetryAt.toISOString(),
        baseDelayMs: baseDelay,
        jitteredDelayMs: jitteredDelay,
        jitterType: this.config.jitterType,
        circuitBreakerState: this.circuitBreaker.getState(),
        testMode: this.testMode,
      });

    } catch (error) {
      console.error('❌ Error scheduling retry:', error);
      throw error;
    }
  }

  /**
   * Apply jitter to delay based on strategy
   * Implements different jitter strategies: full, equal, decorrelated
   */
  private applyJitter(baseDelay: number, jitterType: string): number {
    switch (jitterType) {
      case 'NONE':
        return baseDelay;

      case 'FULL':
        // Full jitter: random delay between 0 and baseDelay
        return Math.random() * baseDelay;

      case 'EQUAL':
        // Equal jitter: baseDelay/2 + random(0, baseDelay/2)
        return baseDelay / 2 + Math.random() * (baseDelay / 2);

      case 'DECORRELATED':
        // Decorrelated jitter: random between initialDelay and 3 * previous delay
        const minDelay = this.config.initialDelayMs;
        const maxDelay = Math.min(baseDelay * 3, this.config.maxDelayMs);
        return minDelay + Math.random() * (maxDelay - minDelay);

      default:
        console.warn(`⚠️ Unknown jitter type: ${jitterType}, using FULL jitter`);
        return Math.random() * baseDelay;
    }
  }

  /**
   * Process the retry queue
   * Implements Requirements 1.3, 6.5
   */
  async processRetryQueue(): Promise<ProcessingResult> {
    if (this.isProcessing) {
      console.log('⏳ Retry queue processing already in progress, skipping...');
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: ['Processing already in progress'],
        processingTimeMs: 0,
      };
    }

    const startTime = Date.now();
    this.isProcessing = true;

    const result: ProcessingResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      processingTimeMs: 0,
    };

    try {
      const now = new Date();
      const readyForRetry = Array.from(this.retryQueue.values())
        .filter(notification => notification.nextRetryAt <= now)
        .sort((a, b) => a.nextRetryAt.getTime() - b.nextRetryAt.getTime());

      console.log(`🔄 Processing ${readyForRetry.length} notifications ready for retry (${this.retryQueue.size} total in queue)`);

      for (const notification of readyForRetry) {
        result.processed++;

        try {
          // Check circuit breaker before attempting retry
          if (!this.circuitBreaker.canExecute()) {
            console.log(`🚨 Circuit breaker OPEN, skipping retry for ${notification.notificationId}`);
            result.skipped++;
            continue;
          }

          // Check if we've exceeded max attempts
          if (notification.attemptCount >= this.config.maxAttempts) {
            console.log(`❌ Max attempts (${this.config.maxAttempts}) exceeded for ${notification.notificationId}`);
            this.retryQueue.delete(notification.id);
            result.failed++;
            result.errors.push(`Max attempts exceeded for ${notification.notificationId}`);
            continue;
          }

          // Attempt to resend the notification
          console.log(`🔄 Retrying notification ${notification.notificationId} (attempt ${notification.attemptCount + 1}/${this.config.maxAttempts})`);

          const retryResult = await PushNotificationService.sendToUsers(
            notification.payload.userIds,
            notification.payload.title,
            notification.payload.body,
            notification.payload.data,
            notification.payload.options
          );

          if (retryResult.success && retryResult.messagesSent > 0) {
            // Success - remove from queue and record circuit breaker success
            console.log(`✅ Retry successful for ${notification.notificationId}: ${retryResult.messagesSent} messages sent`);
            this.retryQueue.delete(notification.id);
            this.circuitBreaker.recordSuccess();
            result.successful++;
          } else {
            // Failed - schedule another retry if attempts remain
            console.log(`❌ Retry failed for ${notification.notificationId}:`, retryResult.errors);
            this.circuitBreaker.recordFailure();

            const updatedNotification: FailedNotification = {
              ...notification,
              attemptCount: notification.attemptCount + 1,
              error: retryResult.errors.join('; '),
              lastAttemptTimestamp: new Date(),
            };

            // Remove current entry and schedule new retry if attempts remain
            this.retryQueue.delete(notification.id);

            if (updatedNotification.attemptCount < this.config.maxAttempts) {
              await this.scheduleRetry(updatedNotification);
            } else {
              console.log(`❌ Giving up on ${notification.notificationId} after ${this.config.maxAttempts} attempts`);
              result.failed++;
              result.errors.push(`Failed after ${this.config.maxAttempts} attempts: ${updatedNotification.error}`);
            }
          }

        } catch (retryError) {
          console.error(`❌ Error processing retry for ${notification.notificationId}:`, retryError);
          this.circuitBreaker.recordFailure();
          result.errors.push(`Retry error for ${notification.notificationId}: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
          
          // Update attempt count and reschedule if attempts remain
          const updatedNotification: FailedNotification = {
            ...notification,
            attemptCount: notification.attemptCount + 1,
            error: retryError instanceof Error ? retryError.message : 'Unknown retry error',
            lastAttemptTimestamp: new Date(),
          };

          this.retryQueue.delete(notification.id);

          if (updatedNotification.attemptCount < this.config.maxAttempts) {
            await this.scheduleRetry(updatedNotification);
          } else {
            result.failed++;
          }
        }

        // Add small delay between retries to avoid overwhelming the service
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      result.processingTimeMs = Date.now() - startTime;

      console.log(`🔄 Retry queue processing complete:`, {
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        errors: result.errors.length,
        remainingInQueue: this.retryQueue.size,
        processingTimeMs: result.processingTimeMs,
        circuitBreakerState: this.circuitBreaker.getState(),
      });

      return result;

    } catch (error) {
      result.processingTimeMs = Date.now() - startTime;
      result.errors.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ Error processing retry queue:', error);
      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get retry status for a specific notification
   */
  async getRetryStatus(notificationId: string): Promise<RetryStatus | null> {
    const notification = Array.from(this.retryQueue.values())
      .find(n => n.notificationId === notificationId);

    if (!notification) {
      return null;
    }

    const totalDelayMs = notification.nextRetryAt.getTime() - notification.originalTimestamp.getTime();
    const baseDelay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.backoffFactor, notification.attemptCount),
      this.config.maxDelayMs
    );
    const jitterApplied = totalDelayMs - baseDelay;

    return {
      notificationId: notification.notificationId,
      currentAttempt: notification.attemptCount,
      maxAttempts: this.config.maxAttempts,
      nextRetryAt: notification.nextRetryAt,
      lastError: notification.error,
      circuitBreakerState: notification.circuitBreakerState,
      totalDelayMs,
      jitterApplied,
    };
  }

  /**
   * Update retry configuration
   */
  async updateRetryConfiguration(config: Partial<RetryConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Update circuit breaker if thresholds changed
    if (config.circuitBreakerThreshold !== undefined || config.circuitBreakerResetTimeoutMs !== undefined) {
      this.circuitBreaker = new CircuitBreaker(
        this.config.circuitBreakerThreshold,
        this.config.circuitBreakerResetTimeoutMs
      );
    }

    console.log('⚙️ Retry configuration updated:', {
      old: oldConfig,
      new: this.config,
      queueSize: this.retryQueue.size,
    });
  }

  /**
   * Get current retry queue statistics
   */
  getQueueStatistics(): {
    totalInQueue: number;
    readyForRetry: number;
    byAttemptCount: { [attempt: number]: number };
    oldestRetry: Date | null;
    newestRetry: Date | null;
    circuitBreakerState: string;
    circuitBreakerFailures: number;
  } {
    const now = new Date();
    const notifications = Array.from(this.retryQueue.values());
    
    const readyForRetry = notifications.filter(n => n.nextRetryAt <= now).length;
    
    const byAttemptCount: { [attempt: number]: number } = {};
    notifications.forEach(n => {
      byAttemptCount[n.attemptCount] = (byAttemptCount[n.attemptCount] || 0) + 1;
    });

    const retryTimes = notifications.map(n => n.nextRetryAt).sort((a, b) => a.getTime() - b.getTime());

    return {
      totalInQueue: this.retryQueue.size,
      readyForRetry,
      byAttemptCount,
      oldestRetry: retryTimes.length > 0 ? retryTimes[0] : null,
      newestRetry: retryTimes.length > 0 ? retryTimes[retryTimes.length - 1] : null,
      circuitBreakerState: this.circuitBreaker.getState(),
      circuitBreakerFailures: this.circuitBreaker.getFailureCount(),
    };
  }

  /**
   * Clear all retries for a specific notification
   */
  clearRetries(notificationId: string): number {
    const toRemove = Array.from(this.retryQueue.entries())
      .filter(([_, notification]) => notification.notificationId === notificationId);

    toRemove.forEach(([id]) => this.retryQueue.delete(id));

    console.log(`🗑️ Cleared ${toRemove.length} retries for notification ${notificationId}`);
    return toRemove.length;
  }

  /**
   * Clear entire retry queue
   */
  clearAllRetries(): number {
    const count = this.retryQueue.size;
    this.retryQueue.clear();
    console.log(`🗑️ Cleared entire retry queue (${count} notifications)`);
    return count;
  }

  /**
   * Start automatic queue processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      try {
        await this.processRetryQueue();
      } catch (error) {
        console.error('❌ Error in automatic retry queue processing:', error);
      }
    }, 5000); // Process every 5 seconds

    console.log('🔄 Started automatic retry queue processing (every 5 seconds)');
  }

  /**
   * Stop automatic queue processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏹️ Stopped automatic retry queue processing');
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopProcessing();
    this.clearAllRetries();
    console.log('🧹 RetryManager destroyed');
  }
}

// Global retry manager instance
let globalRetryManager: RetryManager | null = null;

/**
 * Get or create the global retry manager instance
 */
export function getRetryManager(config?: Partial<RetryConfig>): RetryManager {
  if (!globalRetryManager) {
    globalRetryManager = new RetryManager(config);
  }
  return globalRetryManager;
}

/**
 * Helper function to create a failed notification for retry
 */
export function createFailedNotification(
  notificationId: string,
  userIds: string[],
  title: string,
  body: string,
  error: string,
  data?: any,
  options?: any
): FailedNotification {
  const now = new Date();
  
  return {
    id: `${notificationId}_${now.getTime()}`,
    notificationId,
    payload: {
      userIds,
      title,
      body,
      data,
      options,
    },
    error,
    originalTimestamp: now,
    lastAttemptTimestamp: now,
    attemptCount: 0,
    nextRetryAt: now, // Will be recalculated when scheduled
    circuitBreakerState: 'CLOSED',
  };
}