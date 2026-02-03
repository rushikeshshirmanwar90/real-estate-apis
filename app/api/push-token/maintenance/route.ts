import connect from "@/lib/db";
import { PushTokenMaintenanceService } from "@/lib/services/pushTokenMaintenanceService";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";

/**
 * Push Token Maintenance API
 * Implements Requirements 3.4, 3.6
 * 
 * Endpoints:
 * - POST: Run maintenance job manually
 * - GET: Get maintenance status and analytics
 * - PUT: Update maintenance configuration
 */

// POST: Run maintenance job manually
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const body = await req.json().catch(() => ({}));
    const {
      includeCleanup = true,
      includeHealthRefresh = true,
      includeAnalytics = true,
      maxAgeInDays = 30,
      force = false,
    } = body;

    console.log('🔧 Manual maintenance job requested:', {
      includeCleanup,
      includeHealthRefresh,
      includeAnalytics,
      maxAgeInDays,
      force,
    });

    const maintenanceService = PushTokenMaintenanceService.getInstance();

    // Check if maintenance should run
    if (!force && !maintenanceService.shouldRunMaintenance()) {
      const status = maintenanceService.getMaintenanceStatus();
      return errorResponse(
        "Maintenance job not due yet. Use force=true to override.",
        429,
        {
          lastRun: status.lastRun,
          nextScheduledRun: status.nextScheduledRun,
          isRunning: status.isRunning,
        }
      );
    }

    // Run maintenance job
    const result = force 
      ? await maintenanceService.forceRunMaintenance({
          includeCleanup,
          includeHealthRefresh,
          includeAnalytics,
          maxAgeInDays,
        })
      : await maintenanceService.runMaintenanceJob({
          includeCleanup,
          includeHealthRefresh,
          includeAnalytics,
          maxAgeInDays,
        });

    console.log(`✅ Maintenance job completed: ${result.jobId}`);

    return successResponse(
      {
        job: result,
        summary: {
          success: result.success,
          duration: result.duration,
          tokensProcessed: result.summary.tokensProcessed,
          tokensDeactivated: result.summary.tokensDeactivated,
          tokensDeleted: result.summary.tokensDeleted,
          healthyTokens: result.summary.healthyTokens,
          unhealthyTokens: result.summary.unhealthyTokens,
          errorCount: result.summary.errors.length,
        },
      },
      result.success 
        ? "Maintenance job completed successfully"
        : "Maintenance job completed with errors",
      result.success ? 200 : 207 // 207 Multi-Status for partial success
    );

  } catch (error: unknown) {
    console.error('❌ Error running maintenance job:', error);
    
    if (error instanceof Error && error.message.includes('already running')) {
      return errorResponse("Maintenance job is already running", 409);
    }
    
    if (error instanceof Error) {
      return errorResponse("Failed to run maintenance job", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// GET: Get maintenance status and analytics
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const includeAnalytics = searchParams.get("includeAnalytics") !== "false";
    const includeHistory = searchParams.get("includeHistory") !== "false";
    const historyLimit = parseInt(searchParams.get("historyLimit") || "10");

    console.log('📊 Maintenance status requested:', {
      includeAnalytics,
      includeHistory,
      historyLimit,
    });

    const maintenanceService = PushTokenMaintenanceService.getInstance();
    const status = maintenanceService.getMaintenanceStatus();

    const response: any = {
      status: {
        isRunning: status.isRunning,
        lastRun: status.lastRun,
        nextScheduledRun: status.nextScheduledRun,
        shouldRun: maintenanceService.shouldRunMaintenance(),
      },
      config: status.config,
    };

    // Include analytics if requested
    if (includeAnalytics) {
      try {
        response.analytics = await maintenanceService.generateUsageAnalytics();
      } catch (error) {
        console.error('❌ Error generating analytics:', error);
        response.analyticsError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Include job history if requested
    if (includeHistory) {
      response.history = maintenanceService.getMaintenanceHistory(historyLimit);
    }

    return successResponse(
      response,
      "Maintenance status retrieved successfully",
      200
    );

  } catch (error: unknown) {
    console.error('❌ Error getting maintenance status:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to get maintenance status", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// PUT: Update maintenance configuration
export const PUT = async (req: NextRequest) => {
  try {
    await connect();

    const {
      enabled,
      cleanupIntervalHours,
      healthRefreshIntervalHours,
      maxTokenAgeInDays,
      batchSize,
      retryAttempts,
      alertThresholds,
    } = await req.json();

    console.log('⚙️ Maintenance configuration update requested:', {
      enabled,
      cleanupIntervalHours,
      healthRefreshIntervalHours,
      maxTokenAgeInDays,
      batchSize,
      retryAttempts,
      alertThresholds,
    });

    // Validate configuration values
    const errors: string[] = [];

    if (cleanupIntervalHours !== undefined && (cleanupIntervalHours < 1 || cleanupIntervalHours > 168)) {
      errors.push("cleanupIntervalHours must be between 1 and 168 (1 week)");
    }

    if (healthRefreshIntervalHours !== undefined && (healthRefreshIntervalHours < 1 || healthRefreshIntervalHours > 24)) {
      errors.push("healthRefreshIntervalHours must be between 1 and 24");
    }

    if (maxTokenAgeInDays !== undefined && (maxTokenAgeInDays < 1 || maxTokenAgeInDays > 365)) {
      errors.push("maxTokenAgeInDays must be between 1 and 365");
    }

    if (batchSize !== undefined && (batchSize < 10 || batchSize > 1000)) {
      errors.push("batchSize must be between 10 and 1000");
    }

    if (retryAttempts !== undefined && (retryAttempts < 1 || retryAttempts > 10)) {
      errors.push("retryAttempts must be between 1 and 10");
    }

    if (alertThresholds) {
      if (alertThresholds.unhealthyTokenPercentage !== undefined && 
          (alertThresholds.unhealthyTokenPercentage < 0 || alertThresholds.unhealthyTokenPercentage > 100)) {
        errors.push("alertThresholds.unhealthyTokenPercentage must be between 0 and 100");
      }

      if (alertThresholds.failedJobsCount !== undefined && 
          (alertThresholds.failedJobsCount < 1 || alertThresholds.failedJobsCount > 50)) {
        errors.push("alertThresholds.failedJobsCount must be between 1 and 50");
      }

      if (alertThresholds.processingTimeMinutes !== undefined && 
          (alertThresholds.processingTimeMinutes < 1 || alertThresholds.processingTimeMinutes > 60)) {
        errors.push("alertThresholds.processingTimeMinutes must be between 1 and 60");
      }
    }

    if (errors.length > 0) {
      return errorResponse("Invalid configuration values", 400, errors);
    }

    // Update configuration
    const maintenanceService = PushTokenMaintenanceService.getInstance();
    const configUpdate: any = {};

    if (enabled !== undefined) configUpdate.enabled = enabled;
    if (cleanupIntervalHours !== undefined) configUpdate.cleanupIntervalHours = cleanupIntervalHours;
    if (healthRefreshIntervalHours !== undefined) configUpdate.healthRefreshIntervalHours = healthRefreshIntervalHours;
    if (maxTokenAgeInDays !== undefined) configUpdate.maxTokenAgeInDays = maxTokenAgeInDays;
    if (batchSize !== undefined) configUpdate.batchSize = batchSize;
    if (retryAttempts !== undefined) configUpdate.retryAttempts = retryAttempts;
    if (alertThresholds !== undefined) configUpdate.alertThresholds = { ...alertThresholds };

    maintenanceService.updateConfig(configUpdate);

    const updatedStatus = maintenanceService.getMaintenanceStatus();

    console.log('✅ Maintenance configuration updated successfully');

    return successResponse(
      {
        config: updatedStatus.config,
        nextScheduledRun: updatedStatus.nextScheduledRun,
      },
      "Maintenance configuration updated successfully",
      200
    );

  } catch (error: unknown) {
    console.error('❌ Error updating maintenance configuration:', error);
    if (error instanceof Error) {
      return errorResponse("Failed to update maintenance configuration", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};