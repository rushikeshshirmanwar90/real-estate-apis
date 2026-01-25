import { NextRequest, NextResponse } from 'next/server';
import { PushNotificationService } from '@/lib/services/pushNotificationService';

// Rate limiting for notification APIs
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export interface NotificationRateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
}

/**
 * Rate limiting middleware for notification endpoints
 */
export function createNotificationRateLimit(config: NotificationRateLimitConfig) {
  return async (req: NextRequest) => {
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const key = `${clientIp}:${req.nextUrl.pathname}`;
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) {
        rateLimitMap.delete(k);
      }
    }
    
    // Get or create rate limit entry
    let entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitMap.set(key, entry);
    }
    
    // Check rate limit
    if (entry.count >= config.maxRequests) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many requests',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
        { status: 429 }
      );
    }
    
    // Increment counter
    entry.count++;
    
    return null; // Continue to next middleware/handler
  };
}

/**
 * Notification logging middleware
 */
export async function notificationLogger(
  req: NextRequest,
  operation: string,
  data: any,
  result: any
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    data: {
      ...data,
      // Sanitize sensitive data
      token: data.token ? `${data.token.substring(0, 10)}...` : undefined,
    },
    result: {
      success: result.success,
      messagesSent: result.messagesSent,
      errors: result.errors?.length || 0,
    },
    duration: Date.now() - (req as any).startTime,
  };
  
  // Log to console (in production, you'd send to logging service)
  console.log('📊 Notification Log:', JSON.stringify(logEntry, null, 2));
  
  // In production, send to logging service like:
  // - Winston
  // - Datadog
  // - New Relic
  // - CloudWatch
  
  return logEntry;
}

/**
 * Error handling middleware for notifications
 */
export function handleNotificationError(error: unknown, operation: string) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    operation,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
    },
  };
  
  // Log error
  console.error('❌ Notification Error:', JSON.stringify(errorInfo, null, 2));
  
  // In production, send to error tracking service like:
  // - Sentry
  // - Bugsnag
  // - Rollbar
  
  return errorInfo;
}

/**
 * Notification metrics collection
 */
export class NotificationMetrics {
  private static metrics = {
    totalNotificationsSent: 0,
    totalNotificationsFailed: 0,
    totalTokensRegistered: 0,
    totalTokensDeactivated: 0,
    averageResponseTime: 0,
    lastResetTime: Date.now(),
  };
  
  static recordNotificationSent(count: number, responseTime: number) {
    this.metrics.totalNotificationsSent += count;
    this.updateAverageResponseTime(responseTime);
  }
  
  static recordNotificationFailed(count: number) {
    this.metrics.totalNotificationsFailed += count;
  }
  
  static recordTokenRegistered() {
    this.metrics.totalTokensRegistered++;
  }
  
  static recordTokenDeactivated(count: number) {
    this.metrics.totalTokensDeactivated += count;
  }
  
  private static updateAverageResponseTime(newTime: number) {
    const total = this.metrics.totalNotificationsSent + this.metrics.totalNotificationsFailed;
    if (total > 0) {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (total - 1) + newTime) / total;
    }
  }
  
  static getMetrics() {
    return {
      ...this.metrics,
      successRate: this.getSuccessRate(),
      uptime: Date.now() - this.metrics.lastResetTime,
    };
  }
  
  static getSuccessRate(): number {
    const total = this.metrics.totalNotificationsSent + this.metrics.totalNotificationsFailed;
    return total > 0 ? (this.metrics.totalNotificationsSent / total) * 100 : 100;
  }
  
  static resetMetrics() {
    this.metrics = {
      totalNotificationsSent: 0,
      totalNotificationsFailed: 0,
      totalTokensRegistered: 0,
      totalTokensDeactivated: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now(),
    };
  }
}

/**
 * Notification queue for handling high-volume scenarios
 */
export class NotificationQueue {
  private static queue: Array<{
    id: string;
    userIds: string[];
    title: string;
    body: string;
    data?: any;
    options?: any;
    priority: 'low' | 'normal' | 'high';
    createdAt: number;
    retries: number;
  }> = [];
  
  private static processing = false;
  private static maxRetries = 3;
  
  static async addToQueue(
    userIds: string[],
    title: string,
    body: string,
    data?: any,
    options?: any,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.queue.push({
      id,
      userIds,
      title,
      body,
      data,
      options,
      priority,
      createdAt: Date.now(),
      retries: 0,
    });
    
    // Sort by priority (high -> normal -> low)
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    console.log(`📬 Added notification to queue: ${id} (Priority: ${priority})`);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return id;
  }
  
  private static async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    console.log(`🔄 Processing notification queue: ${this.queue.length} items`);
    
    while (this.queue.length > 0) {
      const notification = this.queue.shift()!;
      
      try {
        const startTime = Date.now();
        const result = await PushNotificationService.sendToUsers(
          notification.userIds,
          notification.title,
          notification.body,
          notification.data,
          notification.options
        );
        
        const duration = Date.now() - startTime;
        
        if (result.success) {
          NotificationMetrics.recordNotificationSent(result.messagesSent, duration);
          console.log(`✅ Queue notification sent: ${notification.id}`);
        } else {
          throw new Error(`Failed to send: ${result.errors.join(', ')}`);
        }
        
      } catch (error) {
        console.error(`❌ Queue notification failed: ${notification.id}`, error);
        
        // Retry logic
        if (notification.retries < this.maxRetries) {
          notification.retries++;
          notification.createdAt = Date.now(); // Reset timestamp for retry
          this.queue.push(notification); // Add back to queue
          console.log(`🔄 Retrying notification: ${notification.id} (Attempt ${notification.retries})`);
        } else {
          NotificationMetrics.recordNotificationFailed(1);
          console.error(`💀 Notification permanently failed: ${notification.id}`);
        }
      }
      
      // Small delay between notifications to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
    console.log('✅ Queue processing completed');
  }
  
  static getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      oldestItem: this.queue.length > 0 ? this.queue[this.queue.length - 1].createdAt : null,
    };
  }
  
  static clearQueue() {
    this.queue = [];
    console.log('🗑️ Notification queue cleared');
  }
}