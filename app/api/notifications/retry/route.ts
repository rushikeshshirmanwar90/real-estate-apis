import { NextRequest, NextResponse } from 'next/server';
import { getRetryManager } from '@/lib/services/retryManager';

/**
 * Retry Management API
 * Provides endpoints for managing notification retries
 * Implements Requirements 5.5, 8.6
 */

/**
 * GET /api/notifications/retry - Get retry queue statistics and status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');

    const retryManager = getRetryManager();

    if (notificationId) {
      // Get status for specific notification
      const status = await retryManager.getRetryStatus(notificationId);
      
      if (!status) {
        return NextResponse.json({
          success: false,
          message: 'Notification not found in retry queue',
          data: null,
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Retry status retrieved successfully',
        data: {
          status,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Get overall queue statistics
      const stats = retryManager.getQueueStatistics();
      
      return NextResponse.json({
        success: true,
        message: 'Retry queue statistics retrieved successfully',
        data: {
          statistics: stats,
          timestamp: new Date().toISOString(),
        },
      });
    }

  } catch (error) {
    console.error('❌ Error getting retry information:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve retry information',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/notifications/retry - Manually trigger retry processing or force retry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notificationId } = body;

    const retryManager = getRetryManager();

    switch (action) {
      case 'process_queue':
        // Manually trigger retry queue processing
        console.log('🔄 Manually triggering retry queue processing...');
        const result = await retryManager.processRetryQueue();
        
        return NextResponse.json({
          success: true,
          message: 'Retry queue processing completed',
          data: {
            result,
            timestamp: new Date().toISOString(),
          },
        });

      case 'force_retry':
        // Force immediate retry of a specific notification (not implemented in current RetryManager)
        if (!notificationId) {
          return NextResponse.json({
            success: false,
            message: 'notificationId is required for force_retry action',
          }, { status: 400 });
        }

        // For now, we can only provide status - force retry would require additional implementation
        const status = await retryManager.getRetryStatus(notificationId);
        
        if (!status) {
          return NextResponse.json({
            success: false,
            message: 'Notification not found in retry queue',
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'Notification found in retry queue (force retry not yet implemented)',
          data: {
            status,
            note: 'Force retry functionality requires additional implementation',
            timestamp: new Date().toISOString(),
          },
        });

      case 'clear_retries':
        // Clear retries for a specific notification
        if (!notificationId) {
          return NextResponse.json({
            success: false,
            message: 'notificationId is required for clear_retries action',
          }, { status: 400 });
        }

        const cleared = retryManager.clearRetries(notificationId);
        
        return NextResponse.json({
          success: true,
          message: `Cleared ${cleared} retries for notification ${notificationId}`,
          data: {
            clearedCount: cleared,
            notificationId,
            timestamp: new Date().toISOString(),
          },
        });

      case 'clear_all':
        // Clear entire retry queue
        const totalCleared = retryManager.clearAllRetries();
        
        return NextResponse.json({
          success: true,
          message: `Cleared entire retry queue (${totalCleared} notifications)`,
          data: {
            clearedCount: totalCleared,
            timestamp: new Date().toISOString(),
          },
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Supported actions: process_queue, force_retry, clear_retries, clear_all',
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error processing retry request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process retry request',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/retry - Update retry configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      maxAttempts,
      initialDelayMs,
      maxDelayMs,
      backoffFactor,
      jitterType,
      circuitBreakerThreshold,
      circuitBreakerResetTimeoutMs,
    } = body;

    // Validate configuration values
    const errors: string[] = [];

    if (maxAttempts !== undefined && (maxAttempts < 1 || maxAttempts > 10)) {
      errors.push('maxAttempts must be between 1 and 10');
    }

    if (initialDelayMs !== undefined && (initialDelayMs < 100 || initialDelayMs > 60000)) {
      errors.push('initialDelayMs must be between 100 and 60000');
    }

    if (maxDelayMs !== undefined && (maxDelayMs < 1000 || maxDelayMs > 300000)) {
      errors.push('maxDelayMs must be between 1000 and 300000');
    }

    if (backoffFactor !== undefined && (backoffFactor < 1.1 || backoffFactor > 5)) {
      errors.push('backoffFactor must be between 1.1 and 5');
    }

    if (jitterType !== undefined && !['NONE', 'FULL', 'EQUAL', 'DECORRELATED'].includes(jitterType)) {
      errors.push('jitterType must be one of: NONE, FULL, EQUAL, DECORRELATED');
    }

    if (circuitBreakerThreshold !== undefined && (circuitBreakerThreshold < 1 || circuitBreakerThreshold > 20)) {
      errors.push('circuitBreakerThreshold must be between 1 and 20');
    }

    if (circuitBreakerResetTimeoutMs !== undefined && (circuitBreakerResetTimeoutMs < 5000 || circuitBreakerResetTimeoutMs > 600000)) {
      errors.push('circuitBreakerResetTimeoutMs must be between 5000 and 600000');
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid configuration values',
        errors,
      }, { status: 400 });
    }

    // Update configuration
    const retryManager = getRetryManager();
    const configUpdate: any = {};

    if (maxAttempts !== undefined) configUpdate.maxAttempts = maxAttempts;
    if (initialDelayMs !== undefined) configUpdate.initialDelayMs = initialDelayMs;
    if (maxDelayMs !== undefined) configUpdate.maxDelayMs = maxDelayMs;
    if (backoffFactor !== undefined) configUpdate.backoffFactor = backoffFactor;
    if (jitterType !== undefined) configUpdate.jitterType = jitterType;
    if (circuitBreakerThreshold !== undefined) configUpdate.circuitBreakerThreshold = circuitBreakerThreshold;
    if (circuitBreakerResetTimeoutMs !== undefined) configUpdate.circuitBreakerResetTimeoutMs = circuitBreakerResetTimeoutMs;

    await retryManager.updateRetryConfiguration(configUpdate);

    return NextResponse.json({
      success: true,
      message: 'Retry configuration updated successfully',
      data: {
        updatedConfig: configUpdate,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Error updating retry configuration:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update retry configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/retry - Clear retries (alternative to POST with clear actions)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');

    const retryManager = getRetryManager();

    if (notificationId) {
      // Clear retries for specific notification
      const cleared = retryManager.clearRetries(notificationId);
      
      return NextResponse.json({
        success: true,
        message: `Cleared ${cleared} retries for notification ${notificationId}`,
        data: {
          clearedCount: cleared,
          notificationId,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Clear entire retry queue
      const totalCleared = retryManager.clearAllRetries();
      
      return NextResponse.json({
        success: true,
        message: `Cleared entire retry queue (${totalCleared} notifications)`,
        data: {
          clearedCount: totalCleared,
          timestamp: new Date().toISOString(),
        },
      });
    }

  } catch (error) {
    console.error('❌ Error clearing retries:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to clear retries',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}