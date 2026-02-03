import { PushTokenManager, TokenValidationResult, PushTokenResult, CleanupResult, HealthResult } from './pushTokenManager';
import { PushToken } from '@/lib/models/PushToken';

// Mock the PushToken model
jest.mock('@/lib/models/PushToken');

describe('PushTokenManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear validation cache
    (PushTokenManager as any).VALIDATION_CACHE.clear();
  });

  describe('validateToken', () => {
    it('should validate valid Expo legacy tokens', async () => {
      const token = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('EXPO');
      expect(result.metadata?.isLegacy).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid Expo modern tokens', async () => {
      const token = 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('EXPO');
      expect(result.metadata?.isLegacy).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid FCM Android tokens', async () => {
      const token = 'a'.repeat(150); // FCM tokens are typically 140+ characters
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('FCM');
      expect(result.metadata?.platform).toBe('android');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid FCM Web tokens', async () => {
      const token = 'a'.repeat(160); // FCM web tokens are typically 152+ characters
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('FCM');
      expect(result.metadata?.platform).toBe('web');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid APNS tokens', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('APNS');
      expect(result.metadata?.platform).toBe('ios');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or undefined tokens', async () => {
      const results = await Promise.all([
        PushTokenManager.validateToken(null as any),
        PushTokenManager.validateToken(undefined as any),
        PushTokenManager.validateToken(''),
      ]);

      results.forEach(result => {
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('UNKNOWN');
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject tokens that are too short', async () => {
      const token = 'short';
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(false);
      expect(result.format).toBe('UNKNOWN');
      expect(result.errors).toContain('Token too short (minimum 10 characters)');
    });

    it('should reject tokens that are too long', async () => {
      const token = 'a'.repeat(5000);
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(false);
      expect(result.format).toBe('UNKNOWN');
      expect(result.errors).toContain('Token too long (maximum 4096 characters)');
    });

    it('should reject tokens with invalid characters', async () => {
      const token = 'ExponentPushToken[invalid@#$%characters]';
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(false);
      expect(result.format).toBe('UNKNOWN');
      expect(result.errors).toContain('Token contains invalid characters');
    });

    it('should reject unregistered Expo tokens', async () => {
      const token = 'ExponentPushToken[UNREGISTERED]';
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Token is unregistered');
    });

    it('should cache validation results', async () => {
      const token = 'ExpoPushToken[validtokenhere123456]';
      
      // First call
      const result1 = await PushTokenManager.validateToken(token);
      // Second call should use cache
      const result2 = await PushTokenManager.validateToken(token);
      
      expect(result1).toEqual(result2);
      expect(result1.isValid).toBe(true);
    });
  });

  describe('getActiveTokensForUsers', () => {
    it('should return empty result for empty user list', async () => {
      const result = await PushTokenManager.getActiveTokensForUsers([]);
      
      expect(result.tokens).toHaveLength(0);
      expect(result.invalidTokens).toHaveLength(0);
      expect(result.missingUsers).toHaveLength(0);
      expect(result.stats.totalRequested).toBe(0);
    });

    it('should fetch and validate tokens for users', async () => {
      const mockTokens = [
        {
          userId: 'user1',
          token: 'ExpoPushToken[validtoken1]',
          platform: 'ios',
          isActive: true,
          lastUsed: new Date(),
          userType: 'admin',
          createdAt: new Date(),
        },
        {
          userId: 'user2',
          token: 'invalid-token',
          platform: 'android',
          isActive: true,
          lastUsed: new Date(),
          userType: 'staff',
          createdAt: new Date(),
        },
      ];

      (PushToken.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTokens),
      });

      const result = await PushTokenManager.getActiveTokensForUsers(['user1', 'user2']);
      
      expect(result.tokens).toHaveLength(1); // Only valid token
      expect(result.invalidTokens).toHaveLength(1); // Invalid token
      expect(result.stats.validTokensFound).toBe(1);
      expect(result.stats.invalidTokensFound).toBe(1);
    });

    it('should handle users with no tokens', async () => {
      (PushToken.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await PushTokenManager.getActiveTokensForUsers(['user1', 'user2']);
      
      expect(result.missingUsers).toEqual(['user1', 'user2']);
      expect(result.stats.missingUsers).toBe(2);
    });

    it('should support multiple tokens per user', async () => {
      const mockTokens = [
        {
          userId: 'user1',
          token: 'ExpoPushToken[token1]',
          platform: 'ios',
          isActive: true,
          lastUsed: new Date(),
          userType: 'admin',
          createdAt: new Date(),
        },
        {
          userId: 'user1',
          token: 'ExpoPushToken[token2]',
          platform: 'android',
          isActive: true,
          lastUsed: new Date(),
          userType: 'admin',
          createdAt: new Date(),
        },
      ];

      (PushToken.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTokens),
      });

      const result = await PushTokenManager.getActiveTokensForUsers(['user1']);
      
      expect(result.tokens).toHaveLength(2); // Both tokens for user1
      expect(result.tokens.every(t => t.userId === 'user1')).toBe(true);
    });
  });

  describe('markTokenInvalid', () => {
    it('should mark token as inactive with reason', async () => {
      const mockUpdateResult = { modifiedCount: 1 };
      (PushToken.updateOne as jest.Mock).mockResolvedValue(mockUpdateResult);

      await PushTokenManager.markTokenInvalid('invalid-token', 'Token expired');

      expect(PushToken.updateOne).toHaveBeenCalledWith(
        { token: 'invalid-token' },
        {
          isActive: false,
          $push: {
            validationErrors: {
              error: 'Token expired',
              timestamp: expect.any(Date),
            }
          }
        }
      );
    });

    it('should handle database errors gracefully', async () => {
      (PushToken.updateOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(PushTokenManager.markTokenInvalid('token', 'reason')).resolves.toBeUndefined();
    });
  });

  describe('cleanupInvalidTokens', () => {
    it('should clean up expired and invalid tokens', async () => {
      const mockTokens = [
        {
          _id: 'token1',
          token: 'ExpoPushToken[old]',
          isActive: false,
          lastUsed: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
          updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        },
        {
          _id: 'token2',
          token: 'invalid-format',
          isActive: true,
          lastUsed: new Date(),
          updatedAt: new Date(),
        },
      ];

      (PushToken.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTokens),
      });
      (PushToken.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
      (PushToken.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 });

      const result = await PushTokenManager.cleanupInvalidTokens(30);

      expect(result.totalProcessed).toBe(2);
      expect(result.tokensDeleted).toBe(5);
      expect(result.cleanupStats.expiredTokens).toBeGreaterThan(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      (PushToken.find as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await PushTokenManager.cleanupInvalidTokens();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Cleanup failed');
    });
  });

  describe('refreshTokenHealth', () => {
    it('should refresh health for all active tokens', async () => {
      const mockTokens = [
        {
          _id: 'token1',
          token: 'ExpoPushToken[valid]',
          platform: 'ios',
          userType: 'admin',
          createdAt: new Date(),
          lastUsed: new Date(),
        },
      ];

      (PushToken.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTokens),
      });
      (PushToken.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await PushTokenManager.refreshTokenHealth();

      expect(result.totalTokens).toBe(1);
      expect(result.tokensRefreshed).toBe(1);
      expect(result.healthyTokens).toBeGreaterThan(0);
    });

    it('should handle health refresh errors', async () => {
      (PushToken.find as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await PushTokenManager.refreshTokenHealth();

      expect(result.errors).toHaveLength(1);
      expect(result.totalTokens).toBe(0);
    });
  });

  describe('batchValidateTokens', () => {
    it('should validate multiple tokens in batches', async () => {
      const tokens = [
        'ExpoPushToken[valid1]',
        'ExpoPushToken[valid2]',
        'invalid-token',
      ];

      const results = await PushTokenManager.batchValidateTokens(tokens);

      expect(results.size).toBe(3);
      expect(results.get('ExpoPushToken[valid1]')?.isValid).toBe(true);
      expect(results.get('ExpoPushToken[valid2]')?.isValid).toBe(true);
      expect(results.get('invalid-token')?.isValid).toBe(false);
    });

    it('should handle empty token list', async () => {
      const results = await PushTokenManager.batchValidateTokens([]);
      expect(results.size).toBe(0);
    });

    it('should handle validation errors in batch', async () => {
      const tokens = ['ExpoPushToken[valid]', null as any];

      const results = await PushTokenManager.batchValidateTokens(tokens);

      expect(results.size).toBe(2);
      expect(results.get('ExpoPushToken[valid]')?.isValid).toBe(true);
      expect(results.get(null)?.isValid).toBe(false);
    });
  });

  describe('getTokenStatistics', () => {
    it('should return comprehensive token statistics', async () => {
      // Mock aggregation results
      (PushToken.countDocuments as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(20); // inactive

      (PushToken.aggregate as jest.Mock)
        .mockResolvedValueOnce([
          { _id: 'ios', count: 40 },
          { _id: 'android', count: 35 },
          { _id: 'web', count: 5 },
        ])
        .mockResolvedValueOnce([
          { _id: 'admin', count: 30 },
          { _id: 'staff', count: 40 },
          { _id: 'client', count: 10 },
        ])
        .mockResolvedValueOnce([
          { _id: 76, count: 50 },
          { _id: 51, count: 20 },
          { _id: 26, count: 8 },
          { _id: 10, count: 2 },
        ])
        .mockResolvedValueOnce([{ _id: null, avgScore: 75 }])
        .mockResolvedValueOnce([{ duplicates: 3 }]);

      const stats = await PushTokenManager.getTokenStatistics();

      expect(stats.overview.totalTokens).toBe(100);
      expect(stats.overview.activeTokens).toBe(80);
      expect(stats.overview.inactiveTokens).toBe(20);
      expect(stats.overview.averageValidationScore).toBe(75);
      expect(stats.byPlatform.ios).toBe(40);
      expect(stats.byUserType.admin).toBe(30);
      expect(stats.healthMetrics.duplicateTokens).toBe(3);
    });

    it('should handle statistics errors', async () => {
      (PushToken.countDocuments as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(PushTokenManager.getTokenStatistics()).rejects.toThrow('Failed to get token statistics');
    });
  });

  describe('validation score calculation', () => {
    it('should calculate higher scores for newer, recently used tokens', () => {
      const recentToken = {
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        lastUsed: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        deviceId: 'device123',
        deviceName: 'iPhone',
      };

      const validation = { isValid: true, metadata: { isLegacy: false } };
      const score = (PushTokenManager as any).calculateValidationScore(recentToken, validation);

      expect(score).toBeGreaterThan(80); // Should be high score
    });

    it('should calculate lower scores for old, unused tokens', () => {
      const oldToken = {
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
        lastUsed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      };

      const validation = { isValid: true, metadata: { isLegacy: true } };
      const score = (PushTokenManager as any).calculateValidationScore(oldToken, validation);

      expect(score).toBeLessThan(50); // Should be low score
    });

    it('should give zero score for invalid tokens', () => {
      const token = {
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      const validation = { isValid: false };
      const score = (PushTokenManager as any).calculateValidationScore(token, validation);

      expect(score).toBeLessThan(40); // Should be very low without base validation score
    });
  });

  describe('error handling and resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      (PushToken.find as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await PushTokenManager.getActiveTokensForUsers(['user1']);

      expect(result.tokens).toHaveLength(0);
      // Should not throw, should handle gracefully
    });

    it('should handle partial batch failures', async () => {
      const tokens = ['ExpoPushToken[valid]', 'ExpoPushToken[valid2]'];
      
      // Mock one validation to fail
      jest.spyOn(PushTokenManager, 'validateToken')
        .mockResolvedValueOnce({ isValid: true, format: 'EXPO', errors: [] })
        .mockRejectedValueOnce(new Error('Validation error'));

      const results = await PushTokenManager.batchValidateTokens(tokens);

      expect(results.size).toBe(2);
      expect(results.get(tokens[0])?.isValid).toBe(true);
      expect(results.get(tokens[1])?.isValid).toBe(false);
      expect(results.get(tokens[1])?.errors).toContain('Batch validation error: Validation error');
    });
  });

  describe('performance and caching', () => {
    it('should cache validation results to improve performance', async () => {
      const token = 'ExpoPushToken[cached]';
      
      // First call
      await PushTokenManager.validateToken(token);
      // Second call should use cache
      const result = await PushTokenManager.validateToken(token);
      
      expect(result.isValid).toBe(true);
      // Verify cache is working by checking metadata timestamp
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should process large batches efficiently', async () => {
      const largeTokenList = Array.from({ length: 100 }, (_, i) => `ExpoPushToken[token${i}]`);
      
      const startTime = Date.now();
      const results = await PushTokenManager.batchValidateTokens(largeTokenList);
      const endTime = Date.now();
      
      expect(results.size).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});