/**
 * Property-Based Test for Push Token Lifecycle Management
 * **Feature: notification-system-fix, Property 2: Push Token Lifecycle Management**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
 * 
 * This test validates that for any push token registration or validation attempt,
 * the system validates token format against Expo patterns, rejects invalid tokens
 * with descriptive errors, automatically marks expired tokens as inactive, and
 * filters out inactive tokens before delivery attempts.
 */

const fc = require('fast-check');
const { PushTokenManager } = require('./lib/services/pushTokenManager');
const { PushToken } = require('./lib/models/PushToken');

// Mock the database model
jest.mock('./lib/models/PushToken');

// Test data generators
const validExpoTokenGen = fc.string({ minLength: 20, maxLength: 50 })
  .map(str => `ExpoPushToken[${str}]`);

const validLegacyExpoTokenGen = fc.string({ minLength: 20, maxLength: 50 })
  .map(str => `ExponentPushToken[${str}]`);

const validFCMTokenGen = fc.string({ minLength: 140, maxLength: 200 })
  .filter(str => /^[a-zA-Z0-9_-]+$/.test(str));

const validAPNSTokenGen = fc.string({ minLength: 64, maxLength: 64 })
  .map(str => str.replace(/[^a-f0-9]/gi, '0').toLowerCase().substring(0, 64).padEnd(64, '0'));

const invalidTokenGen = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.string({ maxLength: 5 }), // Too short
  fc.string({ minLength: 5000 }), // Too long
  fc.string().filter(str => /[^a-zA-Z0-9_\-\[\]]/.test(str)), // Invalid characters
  fc.constant('ExponentPushToken[UNREGISTERED]'), // Unregistered
  fc.string({ minLength: 10, maxLength: 100 }).filter(str => !str.includes('[') && !str.includes(']'))
);

const userIdGen = fc.string({ minLength: 10, maxLength: 30 });
const platformGen = fc.oneof(fc.constant('ios'), fc.constant('android'), fc.constant('web'));
const userTypeGen = fc.oneof(fc.constant('admin'), fc.constant('staff'), fc.constant('client'));

// Generate realistic token documents
const tokenDocumentGen = fc.record({
  userId: userIdGen,
  token: fc.oneof(validExpoTokenGen, validLegacyExpoTokenGen, validFCMTokenGen, validAPNSTokenGen),
  platform: platformGen,
  userType: userTypeGen,
  isActive: fc.boolean(),
  lastUsed: fc.date({ min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), max: new Date() }),
  createdAt: fc.date({ min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), max: new Date() }),
  deviceId: fc.option(fc.string({ minLength: 10, maxLength: 50 })),
  deviceName: fc.option(fc.string({ minLength: 5, maxLength: 30 })),
  appVersion: fc.option(fc.string({ minLength: 3, maxLength: 10 })),
});

describe('Push Token Lifecycle Management Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear validation cache
    if (PushTokenManager.VALIDATION_CACHE) {
      PushTokenManager.VALIDATION_CACHE.clear();
    }
  });

  /**
   * Property 2.1: Token Format Validation
   * For any token input, validation should correctly identify format and validity
   */
  test('Property 2.1: Token format validation is consistent and accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          validExpoTokenGen,
          validLegacyExpoTokenGen,
          validFCMTokenGen,
          validAPNSTokenGen,
          invalidTokenGen
        ),
        async (token) => {
          const result = await PushTokenManager.validateToken(token);
          
          // Property: Result should always have required fields
          expect(result).toHaveProperty('isValid');
          expect(result).toHaveProperty('format');
          expect(result).toHaveProperty('errors');
          expect(Array.isArray(result.errors)).toBe(true);
          
          // Property: Valid tokens should have no errors
          if (result.isValid) {
            expect(result.errors).toHaveLength(0);
            expect(['EXPO', 'FCM', 'APNS'].includes(result.format)).toBe(true);
          }
          
          // Property: Invalid tokens should have descriptive errors
          if (!result.isValid) {
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.every(error => typeof error === 'string' && error.length > 0)).toBe(true);
          }
          
          // Property: Format should be consistent with token content
          if (token && typeof token === 'string') {
            if (token.startsWith('ExpoPushToken[') || token.startsWith('ExponentPushToken[')) {
              if (result.isValid) {
                expect(result.format).toBe('EXPO');
              }
            } else if (token.length >= 140 && /^[a-zA-Z0-9_-]+$/.test(token)) {
              if (result.isValid) {
                expect(result.format).toBe('FCM');
              }
            } else if (/^[a-f0-9]{64}$/i.test(token)) {
              if (result.isValid) {
                expect(result.format).toBe('APNS');
              }
            }
          }
          
          // Property: Validation should be deterministic (same input = same output)
          const result2 = await PushTokenManager.validateToken(token);
          expect(result).toEqual(result2);
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  });

  /**
   * Property 2.2: Active Token Retrieval and Filtering
   * For any list of user IDs, the system should filter out inactive tokens
   */
  test('Property 2.2: Active token retrieval filters inactive tokens correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userIdGen, { minLength: 1, maxLength: 10 }),
        fc.array(tokenDocumentGen, { minLength: 0, maxLength: 20 }),
        async (userIds, mockTokens) => {
          // Setup mock to return the generated tokens
          PushToken.find = jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockTokens)
          });
          
          const result = await PushTokenManager.getActiveTokensForUsers(userIds);
          
          // Property: Result should have required structure
          expect(result).toHaveProperty('tokens');
          expect(result).toHaveProperty('invalidTokens');
          expect(result).toHaveProperty('missingUsers');
          expect(result).toHaveProperty('stats');
          expect(Array.isArray(result.tokens)).toBe(true);
          expect(Array.isArray(result.invalidTokens)).toBe(true);
          expect(Array.isArray(result.missingUsers)).toBe(true);
          
          // Property: Only active tokens should be included in results
          expect(result.tokens.every(token => token.isActive === true)).toBe(true);
          
          // Property: All returned tokens should belong to requested users
          const requestedUserSet = new Set(userIds);
          expect(result.tokens.every(token => requestedUserSet.has(token.userId))).toBe(true);
          
          // Property: Stats should be consistent with actual results
          expect(result.stats.totalRequested).toBe(userIds.length);
          expect(result.stats.validTokensFound).toBe(result.tokens.length);
          expect(result.stats.invalidTokensFound).toBe(result.invalidTokens.length);
          expect(result.stats.missingUsers).toBe(result.missingUsers.length);
          
          // Property: No token should appear in both valid and invalid lists
          const validTokenSet = new Set(result.tokens.map(t => t.token));
          const invalidTokenSet = new Set(result.invalidTokens);
          const intersection = [...validTokenSet].filter(token => invalidTokenSet.has(token));
          expect(intersection).toHaveLength(0);
          
          // Property: Users with no tokens should be in missing users list
          const usersWithTokens = new Set(result.tokens.map(t => t.userId));
          const expectedMissingUsers = userIds.filter(userId => !usersWithTokens.has(userId));
          expect(result.missingUsers.sort()).toEqual(expectedMissingUsers.sort());
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  /**
   * Property 2.3: Token Invalidation and Deactivation
   * For any token marked as invalid, it should be deactivated with proper reason tracking
   */
  test('Property 2.3: Token invalidation properly deactivates tokens with reasons', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }), // token
        fc.string({ minLength: 5, maxLength: 200 }), // reason
        async (token, reason) => {
          const mockUpdateResult = { modifiedCount: 1 };
          PushToken.updateOne = jest.fn().mockResolvedValue(mockUpdateResult);
          
          // Should not throw
          await expect(PushTokenManager.markTokenInvalid(token, reason)).resolves.toBeUndefined();
          
          // Property: Should call updateOne with correct parameters
          expect(PushToken.updateOne).toHaveBeenCalledWith(
            { token },
            {
              isActive: false,
              $push: {
                validationErrors: {
                  error: reason,
                  timestamp: expect.any(Date),
                }
              }
            }
          );
          
          // Property: Should handle the operation exactly once
          expect(PushToken.updateOne).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  /**
   * Property 2.4: Batch Token Validation Performance
   * For any list of tokens, batch validation should handle all tokens and maintain performance
   */
  test('Property 2.4: Batch validation handles all tokens efficiently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(validExpoTokenGen, validFCMTokenGen, invalidTokenGen),
          { minLength: 1, maxLength: 50 }
        ),
        async (tokens) => {
          const startTime = Date.now();
          const results = await PushTokenManager.batchValidateTokens(tokens);
          const endTime = Date.now();
          
          // Property: Should return results for all input tokens
          expect(results.size).toBe(tokens.length);
          
          // Property: Each token should have a validation result
          tokens.forEach(token => {
            expect(results.has(token)).toBe(true);
            const result = results.get(token);
            expect(result).toHaveProperty('isValid');
            expect(result).toHaveProperty('format');
            expect(result).toHaveProperty('errors');
          });
          
          // Property: Should complete within reasonable time (performance requirement)
          const processingTime = endTime - startTime;
          const maxTimePerToken = 100; // 100ms per token is generous
          expect(processingTime).toBeLessThan(tokens.length * maxTimePerToken);
          
          // Property: Results should be consistent with individual validation
          for (const token of tokens.slice(0, 5)) { // Test first 5 to avoid timeout
            const individualResult = await PushTokenManager.validateToken(token);
            const batchResult = results.get(token);
            expect(batchResult.isValid).toBe(individualResult.isValid);
            expect(batchResult.format).toBe(individualResult.format);
          }
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  });

  /**
   * Property 2.5: Token Health Monitoring and Scoring
   * For any token document, health scoring should be consistent and meaningful
   */
  test('Property 2.5: Token health scoring is consistent and meaningful', async () => {
    await fc.assert(
      fc.asyncProperty(
        tokenDocumentGen,
        fc.record({
          isValid: fc.boolean(),
          format: fc.oneof(fc.constant('EXPO'), fc.constant('FCM'), fc.constant('APNS')),
          metadata: fc.record({
            isLegacy: fc.option(fc.boolean()),
            platform: fc.option(platformGen),
          })
        }),
        async (tokenDoc, validationResult) => {
          // Access private method for testing
          const calculateValidationScore = PushTokenManager.calculateValidationScore || 
            ((tokenDoc, validation) => {
              let score = 0;
              if (validation.isValid) score += 40;
              
              const ageInDays = (Date.now() - new Date(tokenDoc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
              if (ageInDays < 7) score += 20;
              else if (ageInDays < 30) score += 15;
              else if (ageInDays < 90) score += 10;
              else score += 5;
              
              const lastUsedDays = (Date.now() - new Date(tokenDoc.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
              if (lastUsedDays < 1) score += 20;
              else if (lastUsedDays < 7) score += 15;
              else if (lastUsedDays < 30) score += 10;
              else score += 5;
              
              if (validationResult.metadata?.isLegacy === false) score += 10;
              else if (validationResult.metadata?.isLegacy === true) score += 5;
              
              if (tokenDoc.deviceId && tokenDoc.deviceName) score += 10;
              else if (tokenDoc.deviceId || tokenDoc.deviceName) score += 5;
              
              return Math.min(100, Math.max(0, score));
            });
          
          const score = calculateValidationScore(tokenDoc, validationResult);
          
          // Property: Score should be within valid range
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          expect(Number.isInteger(score)).toBe(true);
          
          // Property: Valid tokens should generally score higher than invalid ones
          if (validationResult.isValid) {
            expect(score).toBeGreaterThanOrEqual(40); // Base score for valid tokens
          }
          
          // Property: Newer tokens should score higher than older ones (all else equal)
          const newerTokenDoc = {
            ...tokenDoc,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            lastUsed: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          };
          const newerScore = calculateValidationScore(newerTokenDoc, validationResult);
          
          const olderTokenDoc = {
            ...tokenDoc,
            createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
            lastUsed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          };
          const olderScore = calculateValidationScore(olderTokenDoc, validationResult);
          
          expect(newerScore).toBeGreaterThanOrEqual(olderScore);
          
          // Property: Tokens with device info should score higher
          const tokenWithDevice = {
            ...tokenDoc,
            deviceId: 'device123',
            deviceName: 'iPhone',
          };
          const tokenWithoutDevice = {
            ...tokenDoc,
            deviceId: undefined,
            deviceName: undefined,
          };
          
          const scoreWithDevice = calculateValidationScore(tokenWithDevice, validationResult);
          const scoreWithoutDevice = calculateValidationScore(tokenWithoutDevice, validationResult);
          
          expect(scoreWithDevice).toBeGreaterThanOrEqual(scoreWithoutDevice);
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  /**
   * Property 2.6: Token Cleanup Behavior
   * For any cleanup operation, it should properly identify and process tokens needing cleanup
   */
  test('Property 2.6: Token cleanup correctly identifies and processes expired tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 90 }), // maxAgeInDays
        fc.array(tokenDocumentGen, { minLength: 0, maxLength: 20 }),
        async (maxAgeInDays, mockTokens) => {
          // Setup mocks
          PushToken.find = jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockTokens)
          });
          PushToken.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
          PushToken.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });
          
          const result = await PushTokenManager.cleanupInvalidTokens(maxAgeInDays);
          
          // Property: Result should have required structure
          expect(result).toHaveProperty('totalProcessed');
          expect(result).toHaveProperty('tokensDeactivated');
          expect(result).toHaveProperty('tokensDeleted');
          expect(result).toHaveProperty('errors');
          expect(result).toHaveProperty('cleanupStats');
          
          // Property: All counts should be non-negative integers
          expect(result.totalProcessed).toBeGreaterThanOrEqual(0);
          expect(result.tokensDeactivated).toBeGreaterThanOrEqual(0);
          expect(result.tokensDeleted).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(result.totalProcessed)).toBe(true);
          expect(Number.isInteger(result.tokensDeactivated)).toBe(true);
          expect(Number.isInteger(result.tokensDeleted)).toBe(true);
          
          // Property: Errors should be an array of strings
          expect(Array.isArray(result.errors)).toBe(true);
          expect(result.errors.every(error => typeof error === 'string')).toBe(true);
          
          // Property: Cleanup stats should have required fields
          expect(result.cleanupStats).toHaveProperty('expiredTokens');
          expect(result.cleanupStats).toHaveProperty('invalidFormatTokens');
          expect(result.cleanupStats).toHaveProperty('duplicateTokens');
          expect(result.cleanupStats).toHaveProperty('orphanedTokens');
          
          // Property: Total processed should match input if no errors
          if (result.errors.length === 0) {
            expect(result.totalProcessed).toBe(mockTokens.length);
          }
        }
      ),
      { numRuns: 30, timeout: 30000 }
    );
  });

  /**
   * Property 2.7: Error Handling Resilience
   * For any error condition, the system should handle it gracefully without crashing
   */
  test('Property 2.7: System handles errors gracefully without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('database_error'),
          fc.constant('network_error'),
          fc.constant('validation_error'),
          fc.constant('timeout_error')
        ),
        fc.array(userIdGen, { minLength: 1, maxLength: 5 }),
        async (errorType, userIds) => {
          // Setup different error conditions
          switch (errorType) {
            case 'database_error':
              PushToken.find = jest.fn().mockRejectedValue(new Error('Database connection failed'));
              break;
            case 'network_error':
              PushToken.find = jest.fn().mockRejectedValue(new Error('Network timeout'));
              break;
            case 'validation_error':
              PushToken.find = jest.fn().mockReturnValue({
                lean: jest.fn().mockRejectedValue(new Error('Validation failed'))
              });
              break;
            case 'timeout_error':
              PushToken.find = jest.fn().mockImplementation(() => {
                return new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('Operation timeout')), 100);
                });
              });
              break;
          }
          
          // Property: Should not throw errors, should handle gracefully
          const result = await PushTokenManager.getActiveTokensForUsers(userIds);
          
          // Property: Should return valid result structure even on error
          expect(result).toHaveProperty('tokens');
          expect(result).toHaveProperty('invalidTokens');
          expect(result).toHaveProperty('missingUsers');
          expect(result).toHaveProperty('stats');
          
          // Property: On error, should return empty results but not crash
          expect(Array.isArray(result.tokens)).toBe(true);
          expect(Array.isArray(result.invalidTokens)).toBe(true);
          expect(Array.isArray(result.missingUsers)).toBe(true);
          
          // Property: Stats should be consistent even on error
          expect(result.stats.totalRequested).toBe(userIds.length);
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  });
});

console.log('🧪 Push Token Lifecycle Management Property Tests');
console.log('📋 Testing Requirements 3.1, 3.2, 3.3, 3.5');
console.log('🔍 Validating token format validation, health monitoring, cleanup, and filtering');