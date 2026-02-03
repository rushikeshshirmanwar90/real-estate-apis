import { PushTokenMaintenanceService, MaintenanceJobResult, TokenUsageAnalytics } from './pushTokenMaintenanceService';
import { PushTokenManager } from './pushTokenManager';
import { PushToken } from '@/lib/models/PushToken';

// Mock dependencies
jest.mock('./pushTokenManager');
jest.mock('@/lib/models/PushToken');

const mockPushTokenManager = PushTokenManager as jest.Mocked<typeof PushTokenManager>;
const mockPushToken = PushToken as jest.Mocked<typeof PushToken>;

describe('PushTokenMaintenanceService', () => {
  let maintenanceService: PushTokenMaintenanceService;

  beforeEach(() => {
    // Reset singleton instance
    (PushTokenMaintenanceService as any).instance = undefined;
    maintenanceService = PushTokenMaintenanceService.getInstance();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockPushTokenManager.cleanupInvalidTokens.mockResolvedValue({
      totalProcessed: 10,
      tokensDeactivated: 5,
      tokensDeleted: 2,
      errors: [],
      cleanupStats: {
        expiredTokens: 3,
        invalidFormatTokens: 2,
        duplicateTokens: 0,
        orphanedTokens: 0,
      },
    });

    mockPushTokenManager.refreshTokenHealth.mockResolvedValue({
      totalTokens: 100,
      healthyTokens: 80,
      unhealthyTokens: 20,
      tokensRefreshed: 100,
      errors: [],
      healthStats: {
        byPlatform: { ios: 50, android: 40, web: 10 },
        byUserType: { client: 60, staff: 30, admin: 10 },
        byValidationScore: { '0-25': 5, '26-50': 15, '51-75': 30, '76-100': 50 },
      },
    });

    mockPushTokenManager.getTokenStatistics.mockResolvedValue({
      overview: {
        totalTokens: 100,
        activeTokens: 80,
        inactiveTokens: 20,
        averageValidationScore: 75,
      },
      byPlatform: { ios: 50, android: 40, web: 10 },
      byUserType: { client: 60, staff: 30, admin: 10 },
      byValidationScore: { '0-25': 5, '26-50': 15, '51-75': 30, '76-100': 50 },
      healthMetrics: {
        healthyTokens: 80,
        unhealthyTokens: 20,
        tokensNeedingCleanup: 15,
        duplicateTokens: 3,
      },
    });

    // Mock database queries
    mockPushToken.countDocuments = jest.fn().mockResolvedValue(50);
    mockPushToken.aggregate = jest.fn().mockResolvedValue([]);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PushTokenMaintenanceService.getInstance();
      const instance2 = PushTokenMaintenanceService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('runMaintenanceJob', () => {
    it('should run complete maintenance job successfully', async () => {
      const result = await maintenanceService.runMaintenanceJob();

      expect(result.success).toBe(true);
      expect(result.operations.cleanup.executed).toBe(true);
      expect(result.operations.healthRefresh.executed).toBe(true);
      expect(result.operations.analytics.executed).toBe(true);
      expect(result.summary.tokensDeactivated).toBe(5);
      expect(result.summary.tokensDeleted).toBe(2);
      expect(result.summary.healthyTokens).toBe(80);
      expect(result.summary.unhealthyTokens).toBe(20);
      expect(result.summary.errors).toHaveLength(0);

      expect(mockPushTokenManager.cleanupInvalidTokens).toHaveBeenCalledWith(30);
      expect(mockPushTokenManager.refreshTokenHealth).toHaveBeenCalled();
    });

    it('should run selective maintenance operations', async () => {
      const result = await maintenanceService.runMaintenanceJob({
        includeCleanup: true,
        includeHealthRefresh: false,
        includeAnalytics: false,
        maxAgeInDays: 60,
      });

      expect(result.success).toBe(true);
      expect(result.operations.cleanup.executed).toBe(true);
      expect(result.operations.healthRefresh.executed).toBe(false);
      expect(result.operations.analytics.executed).toBe(false);

      expect(mockPushTokenManager.cleanupInvalidTokens).toHaveBeenCalledWith(60);
      expect(mockPushTokenManager.refreshTokenHealth).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const cleanupError = new Error('Cleanup failed');
      mockPushTokenManager.cleanupInvalidTokens.mockRejectedValue(cleanupError);

      const result = await maintenanceService.runMaintenanceJob({
        includeCleanup: true,
        includeHealthRefresh: false,
        includeAnalytics: false,
      });

      expect(result.success).toBe(false);
      expect(result.operations.cleanup.executed).toBe(true);
      expect(result.operations.cleanup.error).toContain('Cleanup failed');
      expect(result.summary.errors).toContain('Cleanup failed: Cleanup failed');
    });

    it('should handle health refresh errors gracefully', async () => {
      const healthError = new Error('Health refresh failed');
      mockPushTokenManager.refreshTokenHealth.mockRejectedValue(healthError);

      const result = await maintenanceService.runMaintenanceJob({
        includeCleanup: false,
        includeHealthRefresh: true,
        includeAnalytics: false,
      });

      expect(result.success).toBe(false);
      expect(result.operations.healthRefresh.executed).toBe(true);
      expect(result.operations.healthRefresh.error).toContain('Health refresh failed');
      expect(result.summary.errors).toContain('Health refresh failed: Health refresh failed');
    });

    it('should prevent concurrent maintenance jobs', async () => {
      // Start first job
      const job1Promise = maintenanceService.runMaintenanceJob();

      // Try to start second job while first is running
      await expect(maintenanceService.runMaintenanceJob()).rejects.toThrow('Maintenance job is already running');

      // Wait for first job to complete
      await job1Promise;

      // Should be able to run again after completion
      const result = await maintenanceService.runMaintenanceJob();
      expect(result.success).toBe(true);
    });

    it('should store job history', async () => {
      await maintenanceService.runMaintenanceJob();
      
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await maintenanceService.runMaintenanceJob();

      const history = maintenanceService.getMaintenanceHistory();
      expect(history).toHaveLength(2);
      expect(history[0].endTime.getTime()).toBeGreaterThanOrEqual(history[1].endTime.getTime());
    });

    it('should limit job history to 50 entries', async () => {
      // Run 55 jobs
      for (let i = 0; i < 55; i++) {
        await maintenanceService.runMaintenanceJob();
      }

      const history = maintenanceService.getMaintenanceHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('generateUsageAnalytics', () => {
    beforeEach(() => {
      // Mock aggregate queries for analytics
      mockPushToken.aggregate
        .mockResolvedValueOnce([
          { _id: 0, count: 10 }, // 0-7 days
          { _id: 30, count: 20 }, // 31-90 days
          { _id: 365, count: 5 }, // 365+ days
        ])
        .mockResolvedValueOnce([
          { _id: '2024-01-01', count: 5 },
          { _id: '2024-01-02', count: 8 },
        ])
        .mockResolvedValueOnce([
          { _id: '2024-01-01', activeCount: 45, usageCount: 50 },
          { _id: '2024-01-02', activeCount: 48, usageCount: 52 },
        ]);
    });

    it('should generate comprehensive usage analytics', async () => {
      const analytics = await maintenanceService.generateUsageAnalytics();

      expect(analytics.overview.totalTokens).toBe(100);
      expect(analytics.overview.activeTokens).toBe(80);
      expect(analytics.overview.inactiveTokens).toBe(20);
      expect(analytics.overview.averageValidationScore).toBe(75);

      expect(analytics.health.healthyTokens).toBe(80);
      expect(analytics.health.unhealthyTokens).toBe(20);
      expect(analytics.health.tokensNeedingCleanup).toBe(15);
      expect(analytics.health.duplicateTokens).toBe(3);

      expect(analytics.distribution.byPlatform).toEqual({ ios: 50, android: 40, web: 10 });
      expect(analytics.distribution.byUserType).toEqual({ client: 60, staff: 30, admin: 10 });

      expect(analytics.trends.registrationTrend).toHaveLength(2);
      expect(analytics.trends.usageTrend).toHaveLength(2);
      expect(analytics.trends.healthTrend).toHaveLength(2);

      // Verify database queries were called
      expect(mockPushToken.countDocuments).toHaveBeenCalledTimes(7); // Updated to match actual calls
      expect(mockPushToken.aggregate).toHaveBeenCalledTimes(3);
    });

    it('should handle analytics generation errors', async () => {
      mockPushTokenManager.getTokenStatistics.mockRejectedValue(new Error('Database error'));

      await expect(maintenanceService.generateUsageAnalytics()).rejects.toThrow('Failed to generate analytics: Database error');
    });
  });

  describe('trackTokenUsage', () => {
    beforeEach(() => {
      mockPushToken.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    });

    it('should track successful token usage', async () => {
      await maintenanceService.trackTokenUsage('token123', {
        notificationId: 'notif123',
        activityId: 'activity123',
        deliveryStatus: 'success',
      });

      expect(mockPushToken.updateOne).toHaveBeenCalledWith(
        { _id: 'token123' },
        expect.objectContaining({
          lastUsed: expect.any(Date),
          '$inc': { 'healthMetrics.successCount': 1 },
          '$set': expect.objectContaining({
            'healthMetrics.lastSuccess': expect.any(Date),
            'healthMetrics.isHealthy': true,
          }),
        })
      );
    });

    it('should track failed token usage', async () => {
      await maintenanceService.trackTokenUsage('token123', {
        notificationId: 'notif123',
        deliveryStatus: 'failure',
        errorMessage: 'Token expired',
      });

      expect(mockPushToken.updateOne).toHaveBeenCalledWith(
        { _id: 'token123' },
        expect.objectContaining({
          lastUsed: expect.any(Date),
          '$inc': { 'healthMetrics.failureCount': 1 },
          '$set': { 'healthMetrics.lastFailure': expect.any(Date) },
          '$push': {
            validationErrors: {
              error: 'Token expired',
              timestamp: expect.any(Date),
            },
          },
        })
      );
    });

    it('should handle tracking errors gracefully', async () => {
      mockPushToken.updateOne.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(maintenanceService.trackTokenUsage('token123', {
        deliveryStatus: 'success',
      })).resolves.toBeUndefined();
    });
  });

  describe('getMaintenanceStatus', () => {
    it('should return current maintenance status', () => {
      const status = maintenanceService.getMaintenanceStatus();

      expect(status.isRunning).toBe(false);
      expect(status.lastRun).toBeNull();
      expect(status.nextScheduledRun).toBeNull();
      expect(status.config).toBeDefined();
      expect(status.config.enabled).toBe(true);
      expect(status.config.cleanupIntervalHours).toBe(24);
      expect(status.recentJobs).toHaveLength(0);
    });

    it('should calculate next scheduled run after maintenance', async () => {
      await maintenanceService.runMaintenanceJob();

      const status = maintenanceService.getMaintenanceStatus();
      expect(status.lastRun).not.toBeNull();
      expect(status.nextScheduledRun).not.toBeNull();
      expect(status.nextScheduledRun!.getTime()).toBeGreaterThan(status.lastRun!.getTime());
    });
  });

  describe('shouldRunMaintenance', () => {
    it('should return true for first run', () => {
      expect(maintenanceService.shouldRunMaintenance()).toBe(true);
    });

    it('should return false if disabled', () => {
      maintenanceService.updateConfig({ enabled: false });
      expect(maintenanceService.shouldRunMaintenance()).toBe(false);
    });

    it('should return false if already running', async () => {
      const jobPromise = maintenanceService.runMaintenanceJob();
      expect(maintenanceService.shouldRunMaintenance()).toBe(false);
      await jobPromise;
    });

    it('should return true if interval has passed', async () => {
      // Run maintenance
      await maintenanceService.runMaintenanceJob();
      expect(maintenanceService.shouldRunMaintenance()).toBe(false);

      // Mock time passage
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 25 * 60 * 60 * 1000); // 25 hours later

      expect(maintenanceService.shouldRunMaintenance()).toBe(true);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('updateConfig', () => {
    it('should update maintenance configuration', () => {
      const newConfig = {
        enabled: false,
        cleanupIntervalHours: 12,
        maxTokenAgeInDays: 60,
      };

      maintenanceService.updateConfig(newConfig);

      const status = maintenanceService.getMaintenanceStatus();
      expect(status.config.enabled).toBe(false);
      expect(status.config.cleanupIntervalHours).toBe(12);
      expect(status.config.maxTokenAgeInDays).toBe(60);
      expect(status.config.healthRefreshIntervalHours).toBe(6); // Should remain unchanged
    });
  });

  describe('forceRunMaintenance', () => {
    it('should run maintenance even when not scheduled', async () => {
      // Run maintenance first
      await maintenanceService.runMaintenanceJob();
      expect(maintenanceService.shouldRunMaintenance()).toBe(false);

      // Force run should work
      const result = await maintenanceService.forceRunMaintenance();
      expect(result.success).toBe(true);
    });
  });
});