import connect from "@/lib/db";
import { PushTokenMaintenanceService } from "@/lib/services/pushTokenMaintenanceService";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * Scheduled Push Token Maintenance API
 * Implements Requirements 3.4, 3.6
 * 
 * This endpoint is designed to be called by external cron services (like Vercel Cron, GitHub Actions, etc.)
 * or internal scheduling systems to run automated maintenance jobs.
 * 
 * Security: Should be protected with API key or internal-only access
 */

// POST: Run scheduled maintenance job
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    // Basic security check - verify this is an internal/scheduled call
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('🚫 Unauthorized scheduled maintenance attempt');
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const {
      jobType = 'full', // 'full', 'cleanup', 'health', 'analytics'
      maxAgeInDays = 30,
      force = false,
    } = body;

    console.log('⏰ Scheduled maintenance job triggered:', {
      jobType,
      maxAgeInDays,
      force,
      timestamp: new Date().toISOString(),
    });

    const maintenanceService = PushTokenMaintenanceService.getInstance();

    // Check if maintenance should run (unless forced)
    if (!force && !maintenanceService.shouldRunMaintenance()) {
      const status = maintenanceService.getMaintenanceStatus();
      console.log('⏭️ Scheduled maintenance skipped - not due yet:', {
        lastRun: status.lastRun,
        nextScheduledRun: status.nextScheduledRun,
      });
      
      return successResponse(
        {
          skipped: true,
          reason: 'Not due yet',
          lastRun: status.lastRun,
          nextScheduledRun: status.nextScheduledRun,
        },
        "Scheduled maintenance skipped - not due yet",
        200
      );
    }

    // Determine what operations to run based on job type
    let includeCleanup = true;
    let includeHealthRefresh = true;
    let includeAnalytics = true;

    switch (jobType) {
      case 'cleanup':
        includeHealthRefresh = false;
        includeAnalytics = false;
        break;
      case 'health':
        includeCleanup = false;
        includeAnalytics = false;
        break;
      case 'analytics':
        includeCleanup = false;
        includeHealthRefresh = false;
        break;
      case 'full':
      default:
        // All operations included
        break;
    }

    // Run maintenance job
    const startTime = Date.now();
    const result = await maintenanceService.runMaintenanceJob({
      includeCleanup,
      includeHealthRefresh,
      includeAnalytics,
      maxAgeInDays,
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Scheduled maintenance completed: ${result.jobId} (${duration}ms)`);

    // Log summary for monitoring
    console.log('📊 Maintenance Summary:', {
      jobId: result.jobId,
      success: result.success,
      duration: result.duration,
      tokensProcessed: result.summary.tokensProcessed,
      tokensDeactivated: result.summary.tokensDeactivated,
      tokensDeleted: result.summary.tokensDeleted,
      healthyTokens: result.summary.healthyTokens,
      unhealthyTokens: result.summary.unhealthyTokens,
      errorCount: result.summary.errors.length,
    });

    // Check for alerts
    const alerts = await checkMaintenanceAlerts(result, maintenanceService);

    return successResponse(
      {
        job: {
          id: result.jobId,
          success: result.success,
          duration: result.duration,
          startTime: result.startTime,
          endTime: result.endTime,
        },
        summary: {
          tokensProcessed: result.summary.tokensProcessed,
          tokensDeactivated: result.summary.tokensDeactivated,
          tokensDeleted: result.summary.tokensDeleted,
          healthyTokens: result.summary.healthyTokens,
          unhealthyTokens: result.summary.unhealthyTokens,
          errorCount: result.summary.errors.length,
        },
        operations: {
          cleanup: {
            executed: result.operations.cleanup.executed,
            success: !result.operations.cleanup.error,
          },
          healthRefresh: {
            executed: result.operations.healthRefresh.executed,
            success: !result.operations.healthRefresh.error,
          },
          analytics: {
            executed: result.operations.analytics.executed,
            success: !result.operations.analytics.error,
          },
        },
        alerts,
      },
      result.success 
        ? "Scheduled maintenance completed successfully"
        : "Scheduled maintenance completed with errors",
      result.success ? 200 : 207
    );

  } catch (error: unknown) {
    console.error('❌ Error in scheduled maintenance:', error);
    
    // Log error for monitoring
    console.error('🚨 Scheduled Maintenance Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    if (error instanceof Error && error.message.includes('already running')) {
      return errorResponse("Maintenance job is already running", 409);
    }
    
    if (error instanceof Error) {
      return errorResponse("Scheduled maintenance failed", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// GET: Get scheduled maintenance status (for monitoring)
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    // Basic security check
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse("Unauthorized", 401);
    }

    const maintenanceService = PushTokenMaintenanceService.getInstance();
    const status = maintenanceService.getMaintenanceStatus();

    // Get recent job statistics
    const recentJobs = status.recentJobs;
    const successRate = recentJobs.length > 0 
      ? (recentJobs.filter(job => job.success).length / recentJobs.length) * 100
      : 100;

    const averageDuration = recentJobs.length > 0
      ? recentJobs.reduce((sum, job) => sum + job.duration, 0) / recentJobs.length
      : 0;

    return successResponse(
      {
        status: {
          isRunning: status.isRunning,
          lastRun: status.lastRun,
          nextScheduledRun: status.nextScheduledRun,
          shouldRun: maintenanceService.shouldRunMaintenance(),
        },
        config: status.config,
        statistics: {
          recentJobsCount: recentJobs.length,
          successRate: Math.round(successRate),
          averageDuration: Math.round(averageDuration),
          lastSuccessfulRun: recentJobs.find(job => job.success)?.endTime || null,
          lastFailedRun: recentJobs.find(job => !job.success)?.endTime || null,
        },
        health: {
          systemHealthy: successRate >= 80 && averageDuration < 300000, // 5 minutes
          alerts: await checkSystemAlerts(status, maintenanceService),
        },
      },
      "Scheduled maintenance status retrieved",
      200
    );

  } catch (error: unknown) {
    console.error('❌ Error getting scheduled maintenance status:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to get maintenance status", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

/**
 * Check for maintenance alerts based on job results
 */
async function checkMaintenanceAlerts(
  result: any,
  maintenanceService: PushTokenMaintenanceService
): Promise<string[]> {
  const alerts: string[] = [];
  const status = maintenanceService.getMaintenanceStatus();
  const config = status.config;

  try {
    // Check processing time
    if (result.duration > config.alertThresholds.processingTimeMinutes * 60 * 1000) {
      alerts.push(`Maintenance job took ${Math.round(result.duration / 1000)}s (threshold: ${config.alertThresholds.processingTimeMinutes}m)`);
    }

    // Check error count
    if (result.summary.errors.length > 0) {
      alerts.push(`Maintenance job had ${result.summary.errors.length} errors`);
    }

    // Check unhealthy token percentage
    const totalTokens = result.summary.healthyTokens + result.summary.unhealthyTokens;
    if (totalTokens > 0) {
      const unhealthyPercentage = (result.summary.unhealthyTokens / totalTokens) * 100;
      if (unhealthyPercentage > config.alertThresholds.unhealthyTokenPercentage) {
        alerts.push(`${Math.round(unhealthyPercentage)}% of tokens are unhealthy (threshold: ${config.alertThresholds.unhealthyTokenPercentage}%)`);
      }
    }

    // Check recent failure count
    const recentJobs = status.recentJobs.slice(0, 10);
    const failedJobs = recentJobs.filter(job => !job.success).length;
    if (failedJobs >= config.alertThresholds.failedJobsCount) {
      alerts.push(`${failedJobs} of last ${recentJobs.length} maintenance jobs failed (threshold: ${config.alertThresholds.failedJobsCount})`);
    }

  } catch (error) {
    console.error('❌ Error checking maintenance alerts:', error);
    alerts.push('Error checking maintenance alerts');
  }

  return alerts;
}

/**
 * Check for system-level alerts
 */
async function checkSystemAlerts(
  status: any,
  maintenanceService: PushTokenMaintenanceService
): Promise<string[]> {
  const alerts: string[] = [];

  try {
    // Check if maintenance is overdue
    if (status.shouldRun && status.lastRun) {
      const overdueDuration = Date.now() - status.lastRun.getTime();
      const expectedInterval = status.config.cleanupIntervalHours * 60 * 60 * 1000;
      
      if (overdueDuration > expectedInterval * 2) {
        alerts.push(`Maintenance is overdue by ${Math.round(overdueDuration / (60 * 60 * 1000))} hours`);
      }
    }

    // Check if maintenance has never run
    if (!status.lastRun) {
      alerts.push('Maintenance has never been run');
    }

    // Check if maintenance is disabled
    if (!status.config.enabled) {
      alerts.push('Maintenance is disabled');
    }

  } catch (error) {
    console.error('❌ Error checking system alerts:', error);
    alerts.push('Error checking system alerts');
  }

  return alerts;
}