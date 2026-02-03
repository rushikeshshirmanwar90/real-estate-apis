import { PushTokenManager } from './pushTokenManager';
import { PushToken } from '@/lib/models/PushToken';

/**
 * Push Token Maintenance Service
 * Implements Requirements 3.4, 3.6
 * 
 * Features:
 * - Scheduled job for cleaning up inactive tokens older than 30 days
 * - Token health refresh mechanisms
 * - Token usage tracking and analytics
 */

export interface MaintenanceJobResult {
  jobId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  operations: {
    cleanup: {
      executed: boolean;
      result?: any;
      error?: string;
    };
    healthRefresh: {
      executed: boolean;
      result?: any;
      error?: string;
    };
    analytics: {
      executed: boolean;
      result?: any;
      error?: string;
    };
  };
  summary: {
    tokensProcessed: number;
    tokensDeactivated: number;
    tokensDeleted: number;
    healthyTokens: number;
    unhealthyTokens: number;
    errors: string[];
  };
}

export interface TokenUsageAnalytics {
  overview: {
    totalTokens: number;
    activeTokens: number;
    inactiveTokens: number;
    averageValidationScore: number;
    lastMaintenanceRun: Date | null;
  };
  usage: {
    dailyActiveTokens: number;
    weeklyActiveTokens: number;
    monthlyActiveTokens: number;
    tokensUsedToday: number;
    tokensUsedThisWeek: number;
    tokensUsedThisMonth: number;
  };
  health: {
    healthyTokens: number;
    unhealthyTokens: number;
    tokensNeedingCleanup: number;
    duplicateTokens: number;
    expiredTokens: number;
  };
  distribution: {
    byPlatform: Record<string, number>;
    byUserType: Record<string, number>;
    byValidationScore: Record<string, number>;
    byAge: Record<string, number>;
  };
  trends: {
    registrationTrend: Array<{
      date: string;
      count: number;
    }>;
    usageTrend: Array<{
      date: string;
      activeCount: number;
      usageCount: number;
    }>;
    healthTrend: Array<{
      date: string;
      healthyCount: number;
      unhealthyCount: number;
    }>;
  };
}

export interface MaintenanceScheduleConfig {
  enabled: boolean;
  cleanupIntervalHours: number;
  healthRefreshIntervalHours: number;
  maxTokenAgeInDays: number;
  batchSize: number;
  retryAttempts: number;
  alertThresholds: {
    unhealthyTokenPercentage: number;
    failedJobsCount: number;
    processingTimeMinutes: number;
  };
}

/**
 * Push Token Maintenance Service
 */
export class PushTokenMaintenanceService {
  private static instance: PushTokenMaintenanceService;
  private isRunning = false;
  private lastMaintenanceRun: Date | null = null;
  private maintenanceHistory: MaintenanceJobResult[] = [];
  private config: MaintenanceScheduleConfig = {
    enabled: true,
    cleanupIntervalHours: 24, // Run daily
    healthRefreshIntervalHours: 6, // Run every 6 hours
    maxTokenAgeInDays: 30,
    batchSize: 100,
    retryAttempts: 3,
    alertThresholds: {
      unhealthyTokenPercentage: 25,
      failedJobsCount: 3,
      processingTimeMinutes: 10,
    },
  };

  private constructor() {}

  static getInstance(): PushTokenMaintenanceService {
    if (!PushTokenMaintenanceService.instance) {
      PushTokenMaintenanceService.instance = new PushTokenMaintenanceService();
    }
    return PushTokenMaintenanceService.instance;
  }

  /**
   * Run complete maintenance job
   * Implements Requirement 3.4: Create scheduled job for cleaning up inactive tokens older than 30 days
   */
  async runMaintenanceJob(options?: {
    includeCleanup?: boolean;
    includeHealthRefresh?: boolean;
    includeAnalytics?: boolean;
    maxAgeInDays?: number;
  }): Promise<MaintenanceJobResult> {
    if (this.isRunning) {
      throw new Error('Maintenance job is already running');
    }

    const jobId = `maintenance_${Date.now()}`;
    const startTime = new Date();
    
    console.log(`🔧 Starting maintenance job: ${jobId}`);
    
    this.isRunning = true;

    const result: MaintenanceJobResult = {
      jobId,
      startTime,
      endTime: new Date(),
      duration: 0,
      success: false,
      operations: {
        cleanup: { executed: false },
        healthRefresh: { executed: false },
        analytics: { executed: false },
      },
      summary: {
        tokensProcessed: 0,
        tokensDeactivated: 0,
        tokensDeleted: 0,
        healthyTokens: 0,
        unhealthyTokens: 0,
        errors: [],
      },
    };

    try {
      const {
        includeCleanup = true,
        includeHealthRefresh = true,
        includeAnalytics = true,
        maxAgeInDays = this.config.maxTokenAgeInDays,
      } = options || {};

      // 1. Token Cleanup
      if (includeCleanup) {
        try {
          console.log('🧹 Running token cleanup...');
          result.operations.cleanup.executed = true;
          
          const cleanupResult = await PushTokenManager.cleanupInvalidTokens(maxAgeInDays);
          result.operations.cleanup.result = cleanupResult;
          
          result.summary.tokensProcessed += cleanupResult.totalProcessed;
          result.summary.tokensDeactivated += cleanupResult.tokensDeactivated;
          result.summary.tokensDeleted += cleanupResult.tokensDeleted;
          result.summary.errors.push(...cleanupResult.errors);
          
          console.log(`✅ Cleanup complete: ${cleanupResult.tokensDeactivated} deactivated, ${cleanupResult.tokensDeleted} deleted`);
        } catch (error) {
          const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.operations.cleanup.error = errorMsg;
          result.summary.errors.push(errorMsg);
          console.error('❌ Cleanup error:', error);
        }
      }

      // 2. Health Refresh
      if (includeHealthRefresh) {
        try {
          console.log('🔄 Running health refresh...');
          result.operations.healthRefresh.executed = true;
          
          const healthResult = await PushTokenManager.refreshTokenHealth();
          result.operations.healthRefresh.result = healthResult;
          
          result.summary.tokensProcessed += healthResult.tokensRefreshed;
          result.summary.healthyTokens = healthResult.healthyTokens;
          result.summary.unhealthyTokens = healthResult.unhealthyTokens;
          result.summary.errors.push(...healthResult.errors);
          
          console.log(`✅ Health refresh complete: ${healthResult.healthyTokens} healthy, ${healthResult.unhealthyTokens} unhealthy`);
        } catch (error) {
          const errorMsg = `Health refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.operations.healthRefresh.error = errorMsg;
          result.summary.errors.push(errorMsg);
          console.error('❌ Health refresh error:', error);
        }
      }

      // 3. Analytics Update
      if (includeAnalytics) {
        try {
          console.log('📊 Updating analytics...');
          result.operations.analytics.executed = true;
          
          const analyticsResult = await this.generateUsageAnalytics();
          result.operations.analytics.result = analyticsResult;
          
          console.log(`✅ Analytics updated: ${analyticsResult.overview.totalTokens} total tokens`);
        } catch (error) {
          const errorMsg = `Analytics update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.operations.analytics.error = errorMsg;
          result.summary.errors.push(errorMsg);
          console.error('❌ Analytics error:', error);
        }
      }

      result.success = result.summary.errors.length === 0;
      this.lastMaintenanceRun = new Date();

    } catch (error) {
      const errorMsg = `Maintenance job failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.summary.errors.push(errorMsg);
      console.error('❌ Maintenance job error:', error);
    } finally {
      this.isRunning = false;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      
      // Store in history (keep last 50 runs)
      this.maintenanceHistory.unshift(result);
      if (this.maintenanceHistory.length > 50) {
        this.maintenanceHistory = this.maintenanceHistory.slice(0, 50);
      }
      
      console.log(`🏁 Maintenance job completed: ${jobId} (${result.duration}ms)`);
    }

    return result;
  }

  /**
   * Generate comprehensive token usage analytics
   * Implements Requirement 3.6: Implement token usage tracking and analytics
   */
  async generateUsageAnalytics(): Promise<TokenUsageAnalytics> {
    try {
      console.log('📊 Generating token usage analytics...');

      // Get basic statistics
      const stats = await PushTokenManager.getTokenStatistics();

      // Calculate usage metrics
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        dailyActiveTokens,
        weeklyActiveTokens,
        monthlyActiveTokens,
        tokensUsedToday,
        tokensUsedThisWeek,
        tokensUsedThisMonth,
        expiredTokens,
        ageDistribution,
        registrationTrend,
        usageTrend,
      ] = await Promise.all([
        // Daily active tokens
        PushToken.countDocuments({
          isActive: true,
          lastUsed: { $gte: oneDayAgo },
        }),
        
        // Weekly active tokens
        PushToken.countDocuments({
          isActive: true,
          lastUsed: { $gte: oneWeekAgo },
        }),
        
        // Monthly active tokens
        PushToken.countDocuments({
          isActive: true,
          lastUsed: { $gte: oneMonthAgo },
        }),
        
        // Tokens used today
        PushToken.countDocuments({
          lastUsed: { $gte: oneDayAgo },
        }),
        
        // Tokens used this week
        PushToken.countDocuments({
          lastUsed: { $gte: oneWeekAgo },
        }),
        
        // Tokens used this month
        PushToken.countDocuments({
          lastUsed: { $gte: oneMonthAgo },
        }),
        
        // Expired tokens
        PushToken.countDocuments({
          lastUsed: { $lt: oneMonthAgo },
        }),
        
        // Age distribution
        PushToken.aggregate([
          {
            $addFields: {
              ageInDays: {
                $divide: [
                  { $subtract: [new Date(), '$createdAt'] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          },
          {
            $bucket: {
              groupBy: '$ageInDays',
              boundaries: [0, 7, 30, 90, 365, Infinity],
              default: 'unknown',
              output: { count: { $sum: 1 } }
            }
          }
        ]),
        
        // Registration trend (last 30 days)
        PushToken.aggregate([
          {
            $match: {
              createdAt: { $gte: oneMonthAgo }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        
        // Usage trend (last 30 days)
        PushToken.aggregate([
          {
            $match: {
              lastUsed: { $gte: oneMonthAgo }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$lastUsed'
                }
              },
              activeCount: {
                $sum: {
                  $cond: [{ $eq: ['$isActive', true] }, 1, 0]
                }
              },
              usageCount: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),
      ]);

      // Process age distribution
      const byAge: Record<string, number> = {
        '0-7 days': 0,
        '8-30 days': 0,
        '31-90 days': 0,
        '91-365 days': 0,
        '365+ days': 0,
      };

      ageDistribution.forEach((bucket: any) => {
        if (bucket._id >= 0 && bucket._id < 7) byAge['0-7 days'] = bucket.count;
        else if (bucket._id >= 7 && bucket._id < 30) byAge['8-30 days'] = bucket.count;
        else if (bucket._id >= 30 && bucket._id < 90) byAge['31-90 days'] = bucket.count;
        else if (bucket._id >= 90 && bucket._id < 365) byAge['91-365 days'] = bucket.count;
        else if (bucket._id >= 365) byAge['365+ days'] = bucket.count;
      });

      // Generate health trend (simulate based on current data)
      const healthTrend = usageTrend.map((trend: any) => ({
        date: trend._id,
        healthyCount: Math.round(trend.activeCount * 0.8), // Estimate 80% healthy
        unhealthyCount: Math.round(trend.activeCount * 0.2), // Estimate 20% unhealthy
      }));

      const analytics: TokenUsageAnalytics = {
        overview: {
          totalTokens: stats.overview.totalTokens,
          activeTokens: stats.overview.activeTokens,
          inactiveTokens: stats.overview.inactiveTokens,
          averageValidationScore: stats.overview.averageValidationScore,
          lastMaintenanceRun: this.lastMaintenanceRun,
        },
        usage: {
          dailyActiveTokens,
          weeklyActiveTokens,
          monthlyActiveTokens,
          tokensUsedToday,
          tokensUsedThisWeek,
          tokensUsedThisMonth,
        },
        health: {
          healthyTokens: stats.healthMetrics.healthyTokens,
          unhealthyTokens: stats.healthMetrics.unhealthyTokens,
          tokensNeedingCleanup: stats.healthMetrics.tokensNeedingCleanup,
          duplicateTokens: stats.healthMetrics.duplicateTokens,
          expiredTokens,
        },
        distribution: {
          byPlatform: stats.byPlatform,
          byUserType: stats.byUserType,
          byValidationScore: stats.byValidationScore,
          byAge,
        },
        trends: {
          registrationTrend: registrationTrend.map((trend: any) => ({
            date: trend._id,
            count: trend.count,
          })),
          usageTrend: usageTrend.map((trend: any) => ({
            date: trend._id,
            activeCount: trend.activeCount,
            usageCount: trend.usageCount,
          })),
          healthTrend,
        },
      };

      console.log('✅ Analytics generated successfully');
      return analytics;

    } catch (error) {
      console.error('❌ Error generating analytics:', error);
      throw new Error(`Failed to generate analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update token usage when token is used for notification
   * Implements Requirement 3.6: Implement token usage tracking
   */
  async trackTokenUsage(tokenId: string, context?: {
    notificationId?: string;
    activityId?: string;
    deliveryStatus?: 'success' | 'failure';
    errorMessage?: string;
  }): Promise<void> {
    try {
      const updateData: any = {
        lastUsed: new Date(),
      };

      // If delivery was successful, update health metrics
      if (context?.deliveryStatus === 'success') {
        updateData['$inc'] = {
          'healthMetrics.successCount': 1,
        };
        updateData['$set'] = {
          'healthMetrics.lastSuccess': new Date(),
          'healthMetrics.isHealthy': true,
        };
      } else if (context?.deliveryStatus === 'failure') {
        updateData['$inc'] = {
          'healthMetrics.failureCount': 1,
        };
        updateData['$set'] = {
          'healthMetrics.lastFailure': new Date(),
        };
        
        // Add error to validation errors if provided
        if (context.errorMessage) {
          updateData['$push'] = {
            validationErrors: {
              error: context.errorMessage,
              timestamp: new Date(),
            },
          };
        }
      }

      await PushToken.updateOne({ _id: tokenId }, updateData);

      console.log(`📊 Token usage tracked: ${tokenId} (${context?.deliveryStatus || 'unknown'})`);

    } catch (error) {
      console.error('❌ Error tracking token usage:', error);
      // Don't throw error to avoid breaking notification flow
    }
  }

  /**
   * Get maintenance job history
   */
  getMaintenanceHistory(limit: number = 10): MaintenanceJobResult[] {
    return this.maintenanceHistory.slice(0, limit);
  }

  /**
   * Get current maintenance status
   */
  getMaintenanceStatus(): {
    isRunning: boolean;
    lastRun: Date | null;
    nextScheduledRun: Date | null;
    config: MaintenanceScheduleConfig;
    recentJobs: MaintenanceJobResult[];
  } {
    const nextScheduledRun = this.lastMaintenanceRun 
      ? new Date(this.lastMaintenanceRun.getTime() + this.config.cleanupIntervalHours * 60 * 60 * 1000)
      : null;

    return {
      isRunning: this.isRunning,
      lastRun: this.lastMaintenanceRun,
      nextScheduledRun,
      config: this.config,
      recentJobs: this.getMaintenanceHistory(5),
    };
  }

  /**
   * Update maintenance configuration
   */
  updateConfig(newConfig: Partial<MaintenanceScheduleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Maintenance configuration updated:', newConfig);
  }

  /**
   * Check if maintenance should run based on schedule
   */
  shouldRunMaintenance(): boolean {
    if (!this.config.enabled || this.isRunning) {
      return false;
    }

    if (!this.lastMaintenanceRun) {
      return true; // First run
    }

    const timeSinceLastRun = Date.now() - this.lastMaintenanceRun.getTime();
    const intervalMs = this.config.cleanupIntervalHours * 60 * 60 * 1000;

    return timeSinceLastRun >= intervalMs;
  }

  /**
   * Force run maintenance job (bypass schedule check)
   */
  async forceRunMaintenance(options?: Parameters<typeof this.runMaintenanceJob>[0]): Promise<MaintenanceJobResult> {
    console.log('🔧 Force running maintenance job...');
    return this.runMaintenanceJob(options);
  }
}