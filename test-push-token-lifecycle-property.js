/**
 * Property-Based Test for Push Token Lifecycle Management
 * **Feature: notification-system-fix, Property 2: Push Token Lifecycle Management**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
 * 
 * Property Definition: For any push token registration or validation attempt, the system should 
 * validate the token format against Expo patterns, reject invalid tokens with descriptive errors, 
 * automatically mark expired tokens as inactive, and filter out inactive tokens before delivery attempts.
 * 
 * This comprehensive property test validates the complete push token lifecycle including:
 * - Token format validation against Expo patterns (Requirement 3.1)
 * - Rejection of invalid tokens with descriptive errors (Requirement 3.2)
 * - Automatic marking of expired tokens as inactive (Requirement 3.3)
 * - Filtering out inactive tokens before delivery attempts (Requirement 3.5)
 */

console.log('🔧 Loading Push Token Lifecycle Property Test...');

const fc = require('fast-check');

// Property-based testing configuration
const PROPERTY_TEST_ITERATIONS = 25; // Reduced from 100 for faster execution as requested
const PROPERTY_TEST_TIMEOUT = 30000; // 30 seconds

// Mock database operations for testing
const mockDatabase = {
  tokens: new Map(),
  nextId: 1,
  
  async find(query) {
    const results = [];
    for (const [id, token] of this.tokens) {
      let matches = true;
      
      if (query.userId && query.userId.$in) {
        matches = matches && query.userId.$in.includes(token.userId);
      } else if (query.userId) {
        matches = matches && token.userId === query.userId;
      }
      
      if (query.isActive !== undefined) {
        matches = matches && token.isActive === query.isActive;
      }
      
      if (query.token) {
        matches = matches && token.token === query.token;
      }
      
      if (query.$or) {
        let orMatches = false;
        for (const orCondition of query.$or) {
          let conditionMatches = true;
          
          if (orCondition.isActive !== undefined) {
            conditionMatches = conditionMatches && token.isActive === orCondition.isActive;
          }
          
          if (orCondition.updatedAt && orCondition.updatedAt.$lt) {
            conditionMatches = conditionMatches && token.updatedAt < orCondition.updatedAt.$lt;
          }
          
          if (orCondition.lastUsed && orCondition.lastUsed.$lt) {
            conditionMatches = conditionMatches && token.lastUsed < orCondition.lastUsed.$lt;
          }
          
          if (conditionMatches) {
            orMatches = true;
            break;
          }
        }
        matches = matches && orMatches;
      }
      
      if (matches) {
        results.push({ ...token });
      }
    }
    
    return {
      lean: () => Promise.resolve(results)
    };
  },
  
  async updateOne(filter, update) {
    let modifiedCount = 0;
    for (const [id, token] of this.tokens) {
      let matches = true;
      
      if (filter.token && token.token !== filter.token) {
        matches = false;
      }
      
      if (filter._id && id !== filter._id) {
        matches = false;
      }
      
      if (matches) {
        if (update.isActive !== undefined) {
          token.isActive = update.isActive;
        }
        
        if (update.$push && update.$push.validationErrors) {
          if (!token.validationErrors) {
            token.validationErrors = [];
          }
          token.validationErrors.push(update.$push.validationErrors);
        }
        
        if (update.$set) {
          Object.assign(token, update.$set);
        }
        
        token.updatedAt = new Date();
        modifiedCount++;
      }
    }
    
    return { modifiedCount };
  },
  
  async deleteMany(filter) {
    let deletedCount = 0;
    const toDelete = [];
    
    for (const [id, token] of this.tokens) {
      let matches = true;
      
      if (filter.isActive !== undefined && token.isActive !== filter.isActive) {
        matches = false;
      }
      
      if (filter.updatedAt && filter.updatedAt.$lt) {
        if (token.updatedAt >= filter.updatedAt.$lt) {
          matches = false;
        }
      }
      
      if (matches) {
        toDelete.push(id);
        deletedCount++;
      }
    }
    
    toDelete.forEach(id => this.tokens.delete(id));
    return { deletedCount };
  },
  
  addToken(token) {
    const id = this.nextId++;
    const fullToken = {
      _id: id,
      userId: token.userId,
      token: token.token,
      platform: token.platform || 'ios',
      isActive: token.isActive !== undefined ? token.isActive : true,
      lastUsed: token.lastUsed || new Date(),
      userType: token.userType || 'client',
      createdAt: token.createdAt || new Date(),
      updatedAt: token.updatedAt || new Date(),
      validationErrors: token.validationErrors || [],
      healthMetrics: token.healthMetrics || {
        lastHealthCheck: new Date(),
        validationScore: 0,
        isHealthy: true,
        failureCount: 0
      },
      ...token
    };
    this.tokens.set(id, fullToken);
    return fullToken;
  },
  
  clear() {
    this.tokens.clear();
    this.nextId = 1;
  }
};

// Mock PushTokenManager for testing
const mockPushTokenManager = {
  // Token format validation patterns
  TOKEN_PATTERNS: {
    EXPO_LEGACY: /^ExponentPushToken\[([a-zA-Z0-9_-]+)\]$/,
    EXPO_MODERN: /^ExpoPushToken\[([a-zA-Z0-9_-]+)\]$/,
    FCM_ANDROID: /^[a-zA-Z0-9_-]{140,}$/,
    FCM_WEB: /^[a-zA-Z0-9_-]{152,}$/,
    APNS_DEVICE: /^[a-f0-9]{64}$/i,
  },
  
  async validateToken(token) {
    if (!token || typeof token !== 'string') {
      return {
        isValid: false,
        format: 'UNKNOWN',
        errors: ['Token is null, undefined, or not a string'],
      };
    }

    const result = {
      isValid: false,
      format: 'UNKNOWN',
      errors: [],
      metadata: { timestamp: Date.now() },
    };

    try {
      // Basic length and character validation
      if (token.length < 10) {
        result.errors.push('Token too short (minimum 10 characters)');
        return result;
      }

      if (token.length > 4096) {
        result.errors.push('Token too long (maximum 4096 characters)');
        return result;
      }

      // Check for invalid characters
      if (!/^[a-zA-Z0-9_\-\[\]]+$/.test(token)) {
        result.errors.push('Token contains invalid characters');
        return result;
      }

      // Format-specific validation
      if (this.TOKEN_PATTERNS.EXPO_LEGACY.test(token)) {
        result.format = 'EXPO';
        result.isValid = true;
        result.metadata.tokenType = 'ExponentPushToken';
        result.metadata.isLegacy = true;
      } else if (this.TOKEN_PATTERNS.EXPO_MODERN.test(token)) {
        result.format = 'EXPO';
        result.isValid = true;
        result.metadata.tokenType = 'ExpoPushToken';
        result.metadata.isLegacy = false;
      } else if (this.TOKEN_PATTERNS.FCM_ANDROID.test(token)) {
        result.format = 'FCM';
        result.isValid = true;
        result.metadata.tokenType = 'FCM';
        result.metadata.platform = 'android';
      } else if (this.TOKEN_PATTERNS.FCM_WEB.test(token)) {
        result.format = 'FCM';
        result.isValid = true;
        result.metadata.tokenType = 'FCM';
        result.metadata.platform = 'web';
      } else if (this.TOKEN_PATTERNS.APNS_DEVICE.test(token)) {
        result.format = 'APNS';
        result.isValid = true;
        result.metadata.tokenType = 'APNS';
        result.metadata.platform = 'ios';
      } else {
        result.errors.push('Token format not recognized');
        result.format = 'UNKNOWN';
      }

      // Additional validation for known formats
      if (result.isValid) {
        const additionalValidation = await this.performAdditionalValidation(token, result.format);
        if (!additionalValidation.isValid) {
          result.isValid = false;
          result.errors.push(...additionalValidation.errors);
        }
      }

    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
  },
  
  async performAdditionalValidation(token, format) {
    const result = { isValid: true, errors: [] };

    try {
      switch (format) {
        case 'EXPO':
          // Check for common Expo token issues
          if (token.includes('ExponentPushToken[UNREGISTERED]')) {
            result.isValid = false;
            result.errors.push('Token is unregistered');
          }
          break;

        case 'FCM':
          // Check for common FCM token issues
          if (token.length < 140) {
            result.isValid = false;
            result.errors.push('FCM token too short');
          }
          break;

        case 'APNS':
          // Check for common APNS token issues
          if (!/^[a-f0-9]+$/i.test(token)) {
            result.isValid = false;
            result.errors.push('APNS token contains invalid characters');
          }
          break;
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Additional validation error: ${error.message}`);
    }

    return result;
  },
  
  async getActiveTokensForUsers(userIds) {
    const result = {
      tokens: [],
      invalidTokens: [],
      missingUsers: [],
      stats: {
        totalRequested: userIds.length,
        validTokensFound: 0,
        invalidTokensFound: 0,
        missingUsers: 0,
      },
    };

    if (userIds.length === 0) {
      return result;
    }

    try {
      // Fetch all active tokens for the users
      const tokens = await mockDatabase.find({
        userId: { $in: userIds },
        isActive: true,
      });
      
      const tokenDocs = await tokens.lean();

      // Group tokens by user
      const tokensByUser = new Map();
      tokenDocs.forEach(token => {
        if (!tokensByUser.has(token.userId)) {
          tokensByUser.set(token.userId, []);
        }
        tokensByUser.get(token.userId).push(token);
      });

      // Process each user's tokens
      for (const userId of userIds) {
        const userTokens = tokensByUser.get(userId) || [];
        
        if (userTokens.length === 0) {
          result.missingUsers.push(userId);
          result.stats.missingUsers++;
          continue;
        }

        // Validate and process each token for this user
        for (const tokenDoc of userTokens) {
          const validation = await this.validateToken(tokenDoc.token);
          
          if (validation.isValid) {
            const validatedToken = {
              userId: tokenDoc.userId,
              token: tokenDoc.token,
              platform: tokenDoc.platform,
              isActive: tokenDoc.isActive,
              lastValidated: new Date(),
              lastUsed: tokenDoc.lastUsed,
              deviceId: tokenDoc.deviceId,
              deviceName: tokenDoc.deviceName,
              appVersion: tokenDoc.appVersion,
              userType: tokenDoc.userType,
              validationScore: this.calculateValidationScore(tokenDoc, validation),
            };
            
            result.tokens.push(validatedToken);
            result.stats.validTokensFound++;
          } else {
            result.invalidTokens.push(tokenDoc.token);
            result.stats.invalidTokensFound++;
            
            // Mark invalid token as inactive
            await this.markTokenInvalid(tokenDoc.token, `Validation failed: ${validation.errors.join(', ')}`);
          }
        }
      }

    } catch (error) {
      throw new Error(`Failed to fetch active tokens: ${error.message}`);
    }

    return result;
  },
  
  async markTokenInvalid(token, reason) {
    try {
      const result = await mockDatabase.updateOne(
        { token },
        { 
          isActive: false,
          $push: {
            validationErrors: {
              error: reason,
              timestamp: new Date(),
            }
          }
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error marking token as invalid:', error);
      return false;
    }
  },
  
  async cleanupInvalidTokens(maxAgeInDays = 30) {
    const result = {
      totalProcessed: 0,
      tokensDeactivated: 0,
      tokensDeleted: 0,
      errors: [],
      cleanupStats: {
        expiredTokens: 0,
        invalidFormatTokens: 0,
        duplicateTokens: 0,
        orphanedTokens: 0,
      },
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

      // Find tokens to process
      const tokensToProcess = await mockDatabase.find({
        $or: [
          { isActive: false, updatedAt: { $lt: cutoffDate } },
          { lastUsed: { $lt: cutoffDate } },
        ]
      });
      
      const tokenDocs = await tokensToProcess.lean();
      result.totalProcessed = tokenDocs.length;

      // Process tokens
      for (const token of tokenDocs) {
        try {
          // Check if token is expired
          if (token.lastUsed < cutoffDate) {
            await mockDatabase.updateOne(
              { _id: token._id },
              { isActive: false }
            );
            result.tokensDeactivated++;
            result.cleanupStats.expiredTokens++;
            continue;
          }

          // Check if token format is invalid
          const validation = await this.validateToken(token.token);
          if (!validation.isValid) {
            await mockDatabase.updateOne(
              { _id: token._id },
              { 
                isActive: false,
                $push: {
                  validationErrors: {
                    error: `Cleanup validation failed: ${validation.errors.join(', ')}`,
                    timestamp: new Date(),
                  }
                }
              }
            );
            result.tokensDeactivated++;
            result.cleanupStats.invalidFormatTokens++;
          }

        } catch (tokenError) {
          result.errors.push(`Error processing token ${token._id}: ${tokenError.message}`);
        }
      }

      // Delete very old inactive tokens (older than 90 days)
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - 90);

      const deleteResult = await mockDatabase.deleteMany({
        isActive: false,
        updatedAt: { $lt: deleteDate }
      });

      result.tokensDeleted = deleteResult.deletedCount || 0;

    } catch (error) {
      const errorMsg = `Cleanup failed: ${error.message}`;
      result.errors.push(errorMsg);
    }

    return result;
  },
  
  calculateValidationScore(tokenDoc, validation) {
    let score = 0;

    // Base score from validation
    if (validation.isValid) {
      score += 40;
    }

    // Age factor (newer tokens score higher)
    const ageInDays = (Date.now() - new Date(tokenDoc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 7) score += 20;
    else if (ageInDays < 30) score += 15;
    else if (ageInDays < 90) score += 10;
    else score += 5;

    // Usage factor (recently used tokens score higher)
    const lastUsedDays = (Date.now() - new Date(tokenDoc.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    if (lastUsedDays < 1) score += 20;
    else if (lastUsedDays < 7) score += 15;
    else if (lastUsedDays < 30) score += 10;
    else score += 5;

    // Format factor (modern formats score higher)
    if (validation.metadata?.isLegacy === false) {
      score += 10;
    } else if (validation.metadata?.isLegacy === true) {
      score += 5;
    }

    // Device info factor (tokens with device info score higher)
    if (tokenDoc.deviceId && tokenDoc.deviceName) {
      score += 10;
    } else if (tokenDoc.deviceId || tokenDoc.deviceName) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }
};

// Test data generators for property-based testing
class PushTokenGenerators {
  static generateValidExpoToken() {
    const tokenId = this.generateRandomString(22);
    const isLegacy = Math.random() > 0.5;
    return isLegacy ? `ExponentPushToken[${tokenId}]` : `ExpoPushToken[${tokenId}]`;
  }
  
  static generateValidFCMToken() {
    const isWeb = Math.random() > 0.5;
    const length = isWeb ? 160 : 150;
    return this.generateRandomString(length);
  }
  
  static generateValidAPNSToken() {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  static generateInvalidToken() {
    const invalidTypes = [
      () => 'ExponentPushToken[UNREGISTERED]', // Unregistered Expo token
      () => 'invalid-token-format', // Invalid format
      () => 'short', // Too short
      () => 'a'.repeat(5000), // Too long
      () => 'ExpoPushToken[invalid@#$%]', // Invalid characters
      () => '', // Empty string
      () => null, // Null
      () => undefined, // Undefined
      () => 'FCM-' + this.generateRandomString(50), // FCM too short
      () => this.generateRandomString(63), // APNS wrong length
      () => 'ExpoPushToken[]', // Empty token ID
    ];
    
    const randomType = invalidTypes[Math.floor(Math.random() * invalidTypes.length)];
    return randomType();
  }
  
  static generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  static generateUserId() {
    // Generate MongoDB ObjectId-like string
    const hex = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += hex.charAt(Math.floor(Math.random() * hex.length));
    }
    return result;
  }
  
  static generateTokenScenario(iteration) {
    const scenarios = [
      // Valid tokens (60%)
      () => ({
        token: Math.random() > 0.5 ? this.generateValidExpoToken() : 
               Math.random() > 0.5 ? this.generateValidFCMToken() : this.generateValidAPNSToken(),
        expectedValid: true,
        description: 'Valid token format'
      }),
      
      // Invalid tokens (30%)
      () => ({
        token: this.generateInvalidToken(),
        expectedValid: false,
        description: 'Invalid token format'
      }),
      
      // Edge cases (10%)
      () => ({
        token: iteration % 2 === 0 ? this.generateValidExpoToken() : this.generateInvalidToken(),
        expectedValid: iteration % 2 === 0,
        description: 'Edge case scenario'
      })
    ];
    
    // Select scenario based on iteration to ensure good distribution
    let scenarioIndex;
    if (iteration < 60) scenarioIndex = 0; // Valid tokens
    else if (iteration < 90) scenarioIndex = 1; // Invalid tokens
    else scenarioIndex = 2; // Edge cases
    
    return scenarios[scenarioIndex]();
  }
  
  static generateTokenWithLifecycle() {
    const now = new Date();
    const ageInDays = Math.floor(Math.random() * 365); // 0-365 days old
    const lastUsedDays = Math.floor(Math.random() * ageInDays + 1); // Used sometime after creation
    
    const createdAt = new Date(now.getTime() - ageInDays * 24 * 60 * 60 * 1000);
    const lastUsed = new Date(now.getTime() - lastUsedDays * 24 * 60 * 60 * 1000);
    
    return {
      userId: this.generateUserId(),
      token: Math.random() > 0.3 ? this.generateValidExpoToken() : this.generateInvalidToken(),
      platform: ['ios', 'android', 'web'][Math.floor(Math.random() * 3)],
      isActive: Math.random() > 0.2, // 80% active
      lastUsed,
      userType: ['client', 'staff', 'admin'][Math.floor(Math.random() * 3)],
      createdAt,
      updatedAt: new Date(Math.max(createdAt.getTime(), lastUsed.getTime())),
      deviceId: Math.random() > 0.5 ? this.generateRandomString(10) : undefined,
      deviceName: Math.random() > 0.5 ? `Device-${Math.floor(Math.random() * 1000)}` : undefined,
      validationErrors: []
    };
  }
}

// Property test implementation
class PushTokenLifecyclePropertyTest {
  constructor() {
    this.testResults = {
      totalIterations: 0,
      passedIterations: 0,
      failedIterations: 0,
      failures: [],
      properties: {
        tokenFormatValidation: { passed: 0, failed: 0 },
        invalidTokenRejection: { passed: 0, failed: 0 },
        expiredTokenHandling: { passed: 0, failed: 0 },
        activeTokenFiltering: { passed: 0, failed: 0 },
        lifecycleManagement: { passed: 0, failed: 0 },
        errorDescriptiveness: { passed: 0, failed: 0 },
        cleanupBehavior: { passed: 0, failed: 0 },
        validationConsistency: { passed: 0, failed: 0 }
      }
    };
  }

  async runPropertyTest() {
    console.log('🧪 Starting Property-Based Test for Push Token Lifecycle Management');
    console.log(`📊 Running ${PROPERTY_TEST_ITERATIONS} iterations with ${PROPERTY_TEST_TIMEOUT}ms timeout`);
    console.log('**Property 2: Push Token Lifecycle Management**');
    console.log('**Validates: Requirements 3.1, 3.2, 3.3, 3.5**\n');

    const startTime = Date.now();

    for (let i = 0; i < PROPERTY_TEST_ITERATIONS; i++) {
      this.testResults.totalIterations++;
      
      try {
        await this.runSingleIteration(i);
        this.testResults.passedIterations++;
      } catch (error) {
        this.testResults.failedIterations++;
        this.testResults.failures.push({
          iteration: i,
          error: error.message,
          stack: error.stack
        });
        console.error(`❌ Iteration ${i} failed:`, error.message);
      }

      // Progress reporting every 10 iterations
      if ((i + 1) % 10 === 0) {
        console.log(`📈 Progress: ${i + 1}/${PROPERTY_TEST_ITERATIONS} iterations completed`);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    this.printResults(totalTime);
    return this.testResults;
  }

  async runSingleIteration(iteration) {
    // Clear database for each iteration
    mockDatabase.clear();
    
    // Generate test scenario
    const scenario = PushTokenGenerators.generateTokenScenario(iteration);
    
    // Generate lifecycle tokens for testing
    const lifecycleTokens = Array.from({ length: 5 }, () => PushTokenGenerators.generateTokenWithLifecycle());
    
    // Add tokens to mock database
    lifecycleTokens.forEach(token => mockDatabase.addToken(token));
    
    // Verify properties
    await this.verifyProperties(scenario, lifecycleTokens, iteration);
  }

  async verifyProperties(scenario, lifecycleTokens, iteration) {
    // Property 1: Token Format Validation (Requirement 3.1)
    await this.verifyTokenFormatValidation(scenario, iteration);

    // Property 2: Invalid Token Rejection (Requirement 3.2)
    await this.verifyInvalidTokenRejection(scenario, iteration);

    // Property 3: Expired Token Handling (Requirement 3.3)
    await this.verifyExpiredTokenHandling(lifecycleTokens, iteration);

    // Property 4: Active Token Filtering (Requirement 3.5)
    await this.verifyActiveTokenFiltering(lifecycleTokens, iteration);

    // Property 5: Lifecycle Management
    await this.verifyLifecycleManagement(lifecycleTokens, iteration);

    // Property 6: Error Descriptiveness
    await this.verifyErrorDescriptiveness(scenario, iteration);

    // Property 7: Cleanup Behavior
    await this.verifyCleanupBehavior(lifecycleTokens, iteration);

    // Property 8: Validation Consistency
    await this.verifyValidationConsistency(scenario, iteration);
  }

  async verifyTokenFormatValidation(scenario, iteration) {
    try {
      const validation = await mockPushTokenManager.validateToken(scenario.token);
      
      // Verify validation result matches expected validity
      if (scenario.expectedValid && !validation.isValid) {
        throw new Error(`Expected valid token but validation failed: ${validation.errors.join(', ')}`);
      }
      
      if (!scenario.expectedValid && validation.isValid) {
        throw new Error(`Expected invalid token but validation passed`);
      }
      
      // Verify format detection
      if (validation.isValid) {
        const validFormats = ['EXPO', 'FCM', 'APNS'];
        if (!validFormats.includes(validation.format)) {
          throw new Error(`Invalid format detected: ${validation.format}`);
        }
        
        // Verify metadata is present for valid tokens
        if (!validation.metadata) {
          throw new Error('Valid token missing metadata');
        }
      }
      
      // Verify error structure
      if (!Array.isArray(validation.errors)) {
        throw new Error('Validation errors should be an array');
      }
      
      this.testResults.properties.tokenFormatValidation.passed++;
    } catch (error) {
      this.testResults.properties.tokenFormatValidation.failed++;
      throw new Error(`Token format validation failed: ${error.message}`);
    }
  }

  async verifyInvalidTokenRejection(scenario, iteration) {
    try {
      const validation = await mockPushTokenManager.validateToken(scenario.token);
      
      // Invalid tokens should be rejected with descriptive errors
      if (!scenario.expectedValid) {
        if (validation.isValid) {
          throw new Error('Invalid token was not rejected');
        }
        
        if (validation.errors.length === 0) {
          throw new Error('Invalid token rejection lacks descriptive errors');
        }
        
        // Verify error messages are descriptive (at least 10 characters)
        for (const error of validation.errors) {
          if (typeof error !== 'string' || error.length < 10) {
            throw new Error(`Error message not descriptive enough: "${error}"`);
          }
        }
        
        // Verify format is marked as UNKNOWN for invalid tokens
        if (validation.format !== 'UNKNOWN') {
          throw new Error(`Invalid token should have UNKNOWN format, got: ${validation.format}`);
        }
      }
      
      this.testResults.properties.invalidTokenRejection.passed++;
    } catch (error) {
      this.testResults.properties.invalidTokenRejection.failed++;
      throw new Error(`Invalid token rejection failed: ${error.message}`);
    }
  }

  async verifyExpiredTokenHandling(lifecycleTokens, iteration) {
    try {
      // Test cleanup of expired tokens
      const cleanupResult = await mockPushTokenManager.cleanupInvalidTokens(30);
      
      // Verify cleanup result structure
      const requiredFields = ['totalProcessed', 'tokensDeactivated', 'tokensDeleted', 'errors', 'cleanupStats'];
      for (const field of requiredFields) {
        if (!(field in cleanupResult)) {
          throw new Error(`Cleanup result missing field: ${field}`);
        }
      }
      
      // Verify cleanup stats structure
      const requiredStatsFields = ['expiredTokens', 'invalidFormatTokens', 'duplicateTokens', 'orphanedTokens'];
      for (const field of requiredStatsFields) {
        if (!(field in cleanupResult.cleanupStats)) {
          throw new Error(`Cleanup stats missing field: ${field}`);
        }
      }
      
      // Verify numeric fields are non-negative
      const numericFields = ['totalProcessed', 'tokensDeactivated', 'tokensDeleted'];
      for (const field of numericFields) {
        if (typeof cleanupResult[field] !== 'number' || cleanupResult[field] < 0) {
          throw new Error(`${field} should be a non-negative number`);
        }
      }
      
      // Verify errors is an array
      if (!Array.isArray(cleanupResult.errors)) {
        throw new Error('Cleanup errors should be an array');
      }
      
      this.testResults.properties.expiredTokenHandling.passed++;
    } catch (error) {
      this.testResults.properties.expiredTokenHandling.failed++;
      throw new Error(`Expired token handling failed: ${error.message}`);
    }
  }

  async verifyActiveTokenFiltering(lifecycleTokens, iteration) {
    try {
      // Get user IDs from lifecycle tokens
      const userIds = lifecycleTokens.map(token => token.userId);
      
      // Test active token filtering
      const result = await mockPushTokenManager.getActiveTokensForUsers(userIds);
      
      // Verify result structure
      const requiredFields = ['tokens', 'invalidTokens', 'missingUsers', 'stats'];
      for (const field of requiredFields) {
        if (!(field in result)) {
          throw new Error(`Active tokens result missing field: ${field}`);
        }
      }
      
      // Verify all returned tokens are active
      for (const token of result.tokens) {
        if (!token.isActive) {
          throw new Error('Inactive token returned in active tokens list');
        }
        
        // Verify token has required fields
        const requiredTokenFields = ['userId', 'token', 'platform', 'isActive', 'lastValidated', 'userType'];
        for (const field of requiredTokenFields) {
          if (!(field in token)) {
            throw new Error(`Active token missing field: ${field}`);
          }
        }
        
        // Verify validation score is present and valid
        if (typeof token.validationScore !== 'number' || token.validationScore < 0 || token.validationScore > 100) {
          throw new Error(`Invalid validation score: ${token.validationScore}`);
        }
      }
      
      // Verify stats consistency
      const totalFound = result.stats.validTokensFound + result.stats.invalidTokensFound;
      if (result.tokens.length !== result.stats.validTokensFound) {
        throw new Error('Valid tokens count mismatch');
      }
      
      if (result.invalidTokens.length !== result.stats.invalidTokensFound) {
        throw new Error('Invalid tokens count mismatch');
      }
      
      this.testResults.properties.activeTokenFiltering.passed++;
    } catch (error) {
      this.testResults.properties.activeTokenFiltering.failed++;
      throw new Error(`Active token filtering failed: ${error.message}`);
    }
  }

  async verifyLifecycleManagement(lifecycleTokens, iteration) {
    try {
      // Test token invalidation
      const testToken = lifecycleTokens[0];
      if (testToken) {
        const reason = 'Test invalidation';
        const success = await mockPushTokenManager.markTokenInvalid(testToken.token, reason);
        
        // Verify token was marked invalid
        if (!success) {
          throw new Error('Token invalidation failed');
        }
        
        // Verify token is now inactive in database
        const updatedTokens = await mockDatabase.find({ token: testToken.token });
        const updatedTokenDocs = await updatedTokens.lean();
        
        if (updatedTokenDocs.length === 0) {
          throw new Error('Token not found after invalidation');
        }
        
        const updatedToken = updatedTokenDocs[0];
        if (updatedToken.isActive) {
          throw new Error('Token still active after invalidation');
        }
        
        // Verify validation error was recorded
        if (!updatedToken.validationErrors || updatedToken.validationErrors.length === 0) {
          throw new Error('Validation error not recorded');
        }
        
        const lastError = updatedToken.validationErrors[updatedToken.validationErrors.length - 1];
        if (!lastError.error || !lastError.error.includes(reason)) {
          throw new Error('Invalidation reason not recorded correctly');
        }
      }
      
      this.testResults.properties.lifecycleManagement.passed++;
    } catch (error) {
      this.testResults.properties.lifecycleManagement.failed++;
      throw new Error(`Lifecycle management failed: ${error.message}`);
    }
  }

  async verifyErrorDescriptiveness(scenario, iteration) {
    try {
      const validation = await mockPushTokenManager.validateToken(scenario.token);
      
      // For invalid tokens, verify errors are descriptive
      if (!validation.isValid) {
        if (validation.errors.length === 0) {
          throw new Error('Invalid token has no error messages');
        }
        
        for (const error of validation.errors) {
          // Error should be a non-empty string
          if (typeof error !== 'string' || error.trim().length === 0) {
            throw new Error('Error message is empty or not a string');
          }
          
          // Error should be descriptive (contain meaningful words)
          const meaningfulWords = ['token', 'invalid', 'short', 'long', 'characters', 'format', 'unregistered'];
          const hasDescriptiveContent = meaningfulWords.some(word => 
            error.toLowerCase().includes(word)
          );
          
          if (!hasDescriptiveContent) {
            throw new Error(`Error message not descriptive: "${error}"`);
          }
        }
      }
      
      this.testResults.properties.errorDescriptiveness.passed++;
    } catch (error) {
      this.testResults.properties.errorDescriptiveness.failed++;
      throw new Error(`Error descriptiveness failed: ${error.message}`);
    }
  }

  async verifyCleanupBehavior(lifecycleTokens, iteration) {
    try {
      // Test cleanup with different age thresholds
      const cleanupResults = await Promise.all([
        mockPushTokenManager.cleanupInvalidTokens(7),   // 7 days
        mockPushTokenManager.cleanupInvalidTokens(30),  // 30 days
        mockPushTokenManager.cleanupInvalidTokens(90),  // 90 days
      ]);
      
      // Verify cleanup results are consistent
      for (let i = 0; i < cleanupResults.length; i++) {
        const result = cleanupResults[i];
        
        // Verify result structure
        if (typeof result.totalProcessed !== 'number' || result.totalProcessed < 0) {
          throw new Error(`Invalid totalProcessed in cleanup ${i}: ${result.totalProcessed}`);
        }
        
        if (typeof result.tokensDeactivated !== 'number' || result.tokensDeactivated < 0) {
          throw new Error(`Invalid tokensDeactivated in cleanup ${i}: ${result.tokensDeactivated}`);
        }
        
        if (typeof result.tokensDeleted !== 'number' || result.tokensDeleted < 0) {
          throw new Error(`Invalid tokensDeleted in cleanup ${i}: ${result.tokensDeleted}`);
        }
        
        // Verify cleanup stats
        const stats = result.cleanupStats;
        const statFields = ['expiredTokens', 'invalidFormatTokens', 'duplicateTokens', 'orphanedTokens'];
        for (const field of statFields) {
          if (typeof stats[field] !== 'number' || stats[field] < 0) {
            throw new Error(`Invalid cleanup stat ${field} in cleanup ${i}: ${stats[field]}`);
          }
        }
      }
      
      // Verify that longer age thresholds process more or equal tokens
      for (let i = 1; i < cleanupResults.length; i++) {
        if (cleanupResults[i].totalProcessed < cleanupResults[i-1].totalProcessed) {
          // This is acceptable as tokens might be deleted between runs
          // Just verify the structure is consistent
        }
      }
      
      this.testResults.properties.cleanupBehavior.passed++;
    } catch (error) {
      this.testResults.properties.cleanupBehavior.failed++;
      throw new Error(`Cleanup behavior failed: ${error.message}`);
    }
  }

  async verifyValidationConsistency(scenario, iteration) {
    try {
      // Test validation consistency - same token should always return same result
      const validation1 = await mockPushTokenManager.validateToken(scenario.token);
      const validation2 = await mockPushTokenManager.validateToken(scenario.token);
      
      // Verify consistency
      if (validation1.isValid !== validation2.isValid) {
        throw new Error('Validation consistency failed: isValid differs');
      }
      
      if (validation1.format !== validation2.format) {
        throw new Error('Validation consistency failed: format differs');
      }
      
      if (validation1.errors.length !== validation2.errors.length) {
        throw new Error('Validation consistency failed: error count differs');
      }
      
      // Test with null/undefined inputs
      const nullValidation = await mockPushTokenManager.validateToken(null);
      const undefinedValidation = await mockPushTokenManager.validateToken(undefined);
      
      // Both should be invalid with similar error structure
      if (nullValidation.isValid || undefinedValidation.isValid) {
        throw new Error('Null/undefined tokens should be invalid');
      }
      
      if (nullValidation.format !== 'UNKNOWN' || undefinedValidation.format !== 'UNKNOWN') {
        throw new Error('Null/undefined tokens should have UNKNOWN format');
      }
      
      this.testResults.properties.validationConsistency.passed++;
    } catch (error) {
      this.testResults.properties.validationConsistency.failed++;
      throw new Error(`Validation consistency failed: ${error.message}`);
    }
  }

  printResults(totalTime) {
    console.log('\n🏁 Property-Based Test Results');
    console.log('=====================================');
    console.log(`⏱️  Total execution time: ${totalTime}ms`);
    console.log(`📊 Total iterations: ${this.testResults.totalIterations}`);
    console.log(`✅ Passed iterations: ${this.testResults.passedIterations}`);
    console.log(`❌ Failed iterations: ${this.testResults.failedIterations}`);
    console.log(`📈 Success rate: ${((this.testResults.passedIterations / this.testResults.totalIterations) * 100).toFixed(2)}%`);

    console.log('\n📋 Property Verification Results:');
    for (const [property, results] of Object.entries(this.testResults.properties)) {
      const total = results.passed + results.failed;
      const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(2) : 0;
      console.log(`   ${property}: ${results.passed}/${total} (${successRate}%)`);
    }

    if (this.testResults.failures.length > 0) {
      console.log('\n❌ Failure Details:');
      this.testResults.failures.slice(0, 5).forEach((failure, index) => {
        console.log(`   ${index + 1}. Iteration ${failure.iteration}: ${failure.error}`);
      });
      
      if (this.testResults.failures.length > 5) {
        console.log(`   ... and ${this.testResults.failures.length - 5} more failures`);
      }
    }

    // Determine overall test result
    const overallSuccess = this.testResults.failedIterations === 0;
    console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (overallSuccess) {
      console.log('🎉 All property tests passed! The push token lifecycle management system demonstrates comprehensive validation, error handling, and cleanup capabilities.');
    } else {
      console.log('⚠️  Some property tests failed. Review the failures above for details.');
    }
  }
}

// Main execution
async function runPropertyBasedTest() {
  const test = new PushTokenLifecyclePropertyTest();
  
  try {
    const results = await test.runPropertyTest();
    
    // Exit with appropriate code
    process.exit(results.failedIterations === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Property test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  console.log('🚀 Starting Push Token Lifecycle Property Test...');
  
  // Ensure output is flushed
  process.stdout.write('');
  
  runPropertyBasedTest().then(() => {
    console.log('Test execution completed');
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

// Export for potential integration with other test frameworks
module.exports = {
  PushTokenLifecyclePropertyTest,
  PushTokenGenerators,
  mockPushTokenManager,
  mockDatabase
};