import { PushToken } from "@/lib/models/PushToken";
import { Types } from "mongoose";

/**
 * Enhanced Push Token Manager
 * Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * Features:
 * - Comprehensive token format validation
 * - Automatic token health monitoring and cleanup
 * - Support for multiple tokens per user
 * - Token deactivation mechanisms for invalid/expired tokens
 * - Batch token validation for performance
 */

export interface TokenValidationResult {
  isValid: boolean;
  format: 'EXPO' | 'FCM' | 'APNS' | 'UNKNOWN';
  errors: string[];
  metadata?: {
    tokenType?: string;
    platform?: string;
    isLegacy?: boolean;
    timestamp?: number;
  };
}

export interface PushTokenResult {
  tokens: ValidatedPushToken[];
  invalidTokens: string[];
  missingUsers: string[];
  stats: {
    totalRequested: number;
    validTokensFound: number;
    invalidTokensFound: number;
    missingUsers: number;
  };
}

export interface ValidatedPushToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  isActive: boolean;
  lastValidated: Date;
  lastUsed: Date;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  userType: 'client' | 'staff' | 'admin';
  validationScore: number; // 0-100 score based on token health
}

export interface CleanupResult {
  totalProcessed: number;
  tokensDeactivated: number;
  tokensDeleted: number;
  errors: string[];
  cleanupStats: {
    expiredTokens: number;
    invalidFormatTokens: number;
    duplicateTokens: number;
    orphanedTokens: number;
  };
}

export interface HealthResult {
  totalTokens: number;
  healthyTokens: number;
  unhealthyTokens: number;
  tokensRefreshed: number;
  errors: string[];
  healthStats: {
    byPlatform: Record<string, number>;
    byUserType: Record<string, number>;
    byValidationScore: Record<string, number>;
  };
}

/**
 * Enhanced Push Token Manager with comprehensive validation and lifecycle management
 */
export class PushTokenManager {
  
  // Token format validation patterns
  private static readonly TOKEN_PATTERNS = {
    EXPO_LEGACY: /^ExponentPushToken\[([a-zA-Z0-9_-]+)\]$/,
    EXPO_MODERN: /^ExpoPushToken\[([a-zA-Z0-9_-]+)\]$/,
    FCM_ANDROID: /^[a-zA-Z0-9_-]{140,}$/,
    FCM_WEB: /^[a-zA-Z0-9_-]{152,}$/,
    APNS_DEVICE: /^[a-f0-9]{64}$/i,
    APNS_SANDBOX: /^[a-f0-9]{64}$/i,
  };

  private static readonly VALIDATION_CACHE = new Map<string, TokenValidationResult>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate a single push token with comprehensive format checking
   * Implements Requirement 3.1: Enhanced push token validation with comprehensive format checking
   */
  static async validateToken(token: string): Promise<TokenValidationResult> {
    if (!token || typeof token !== 'string') {
      return {
        isValid: false,
        format: 'UNKNOWN',
        errors: ['Token is null, undefined, or not a string'],
      };
    }

    // Check cache first
    const cacheKey = `validate_${token}`;
    const cached = this.VALIDATION_CACHE.get(cacheKey);
    if (cached && cached.metadata?.timestamp && Date.now() - cached.metadata.timestamp < this.CACHE_TTL) {
      return cached;
    }

    const result: TokenValidationResult = {
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
        result.metadata = {
          ...result.metadata,
          tokenType: 'ExponentPushToken',
          isLegacy: true,
        };
      } else if (this.TOKEN_PATTERNS.EXPO_MODERN.test(token)) {
        result.format = 'EXPO';
        result.isValid = true;
        result.metadata = {
          ...result.metadata,
          tokenType: 'ExpoPushToken',
          isLegacy: false,
        };
      } else if (this.TOKEN_PATTERNS.FCM_ANDROID.test(token)) {
        result.format = 'FCM';
        result.isValid = true;
        result.metadata = {
          ...result.metadata,
          tokenType: 'FCM',
          platform: 'android',
        };
      } else if (this.TOKEN_PATTERNS.FCM_WEB.test(token)) {
        result.format = 'FCM';
        result.isValid = true;
        result.metadata = {
          ...result.metadata,
          tokenType: 'FCM',
          platform: 'web',
        };
      } else if (this.TOKEN_PATTERNS.APNS_DEVICE.test(token)) {
        result.format = 'APNS';
        result.isValid = true;
        result.metadata = {
          ...result.metadata,
          tokenType: 'APNS',
          platform: 'ios',
        };
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
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Cache the result
    this.VALIDATION_CACHE.set(cacheKey, result);

    return result;
  }

  /**
   * Get active tokens for multiple users with validation
   * Implements Requirement 3.5: Filter out inactive push tokens before attempting delivery
   * Implements Requirement 3.6: Support multiple push tokens per user for multiple devices
   */
  static async getActiveTokensForUsers(userIds: string[]): Promise<PushTokenResult> {
    const result: PushTokenResult = {
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
      console.log(`🔍 Fetching active tokens for ${userIds.length} users`);

      // Fetch all active tokens for the users
      const tokens = await PushToken.find({
        userId: { $in: userIds },
        isActive: true,
      }).lean();

      console.log(`📱 Found ${tokens.length} active tokens in database`);

      // Group tokens by user
      const tokensByUser = new Map<string, any[]>();
      tokens.forEach(token => {
        if (!tokensByUser.has(token.userId)) {
          tokensByUser.set(token.userId, []);
        }
        tokensByUser.get(token.userId)!.push(token);
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
            const validatedToken: ValidatedPushToken = {
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

      console.log(`✅ Token validation complete:`, result.stats);

    } catch (error) {
      console.error('❌ Error fetching active tokens:', error);
      throw new Error(`Failed to fetch active tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Mark a token as invalid with reason
   * Implements Requirement 3.3: Automatically mark expired/invalid tokens as inactive
   */
  static async markTokenInvalid(token: string, reason: string): Promise<void> {
    try {
      const result = await PushToken.updateOne(
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

      if (result.modifiedCount > 0) {
        console.log(`🗑️ Marked token as invalid: ${reason}`);
      }
    } catch (error) {
      console.error('❌ Error marking token as invalid:', error);
    }
  }

  /**
   * Clean up inactive push tokens older than specified days
   * Implements Requirement 3.4: Clean up inactive push tokens older than 30 days
   */
  static async cleanupInvalidTokens(maxAgeInDays: number = 30): Promise<CleanupResult> {
    const result: CleanupResult = {
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
      console.log(`🧹 Starting token cleanup (max age: ${maxAgeInDays} days)`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

      // Find tokens to process
      const tokensToProcess = await PushToken.find({
        $or: [
          { isActive: false, updatedAt: { $lt: cutoffDate } },
          { lastUsed: { $lt: cutoffDate } },
          { isActive: true, token: { $regex: /^[^a-zA-Z0-9_\-\[\]]/ } }, // Invalid format
        ]
      }).lean();

      result.totalProcessed = tokensToProcess.length;
      console.log(`📊 Found ${tokensToProcess.length} tokens to process`);

      // Process tokens in batches
      const batchSize = 100;
      for (let i = 0; i < tokensToProcess.length; i += batchSize) {
        const batch = tokensToProcess.slice(i, i + batchSize);
        
        for (const token of batch) {
          try {
            // Check if token is expired
            if (token.lastUsed < cutoffDate) {
              await PushToken.updateOne(
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
              await PushToken.updateOne(
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
              continue;
            }

            // Check for duplicates (same token, different documents)
            const duplicates = await PushToken.find({
              token: token.token,
              _id: { $ne: token._id }
            });

            if (duplicates.length > 0) {
              // Keep the most recent one, deactivate others
              const sortedDuplicates = [token, ...duplicates].sort((a, b) => 
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );

              for (let j = 1; j < sortedDuplicates.length; j++) {
                await PushToken.updateOne(
                  { _id: sortedDuplicates[j]._id },
                  { isActive: false }
                );
                result.tokensDeactivated++;
                result.cleanupStats.duplicateTokens++;
              }
            }

          } catch (tokenError) {
            result.errors.push(`Error processing token ${token._id}: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
          }
        }
      }

      // Delete very old inactive tokens (older than 90 days)
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - 90);

      const deleteResult = await PushToken.deleteMany({
        isActive: false,
        updatedAt: { $lt: deleteDate }
      });

      result.tokensDeleted = deleteResult.deletedCount || 0;

      console.log(`✅ Cleanup complete:`, {
        processed: result.totalProcessed,
        deactivated: result.tokensDeactivated,
        deleted: result.tokensDeleted,
        errors: result.errors.length,
      });

    } catch (error) {
      const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error('❌ Token cleanup error:', error);
    }

    return result;
  }

  /**
   * Refresh token health and update validation status
   * Implements Requirement 3.2: Automatic token health monitoring
   */
  static async refreshTokenHealth(): Promise<HealthResult> {
    const result: HealthResult = {
      totalTokens: 0,
      healthyTokens: 0,
      unhealthyTokens: 0,
      tokensRefreshed: 0,
      errors: [],
      healthStats: {
        byPlatform: {},
        byUserType: {},
        byValidationScore: { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 },
      },
    };

    try {
      console.log('🔄 Starting token health refresh');

      // Get all active tokens
      const tokens = await PushToken.find({ isActive: true }).lean();
      result.totalTokens = tokens.length;

      console.log(`📊 Refreshing health for ${tokens.length} active tokens`);

      // Process tokens in batches
      const batchSize = 50;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (token) => {
          try {
            const validation = await this.validateToken(token.token);
            const validationScore = this.calculateValidationScore(token, validation);
            
            // Update token with health information
            await PushToken.updateOne(
              { _id: token._id },
              {
                lastValidated: new Date(),
                validationScore,
                $set: {
                  'healthMetrics.lastHealthCheck': new Date(),
                  'healthMetrics.validationScore': validationScore,
                  'healthMetrics.isHealthy': validation.isValid && validationScore >= 50,
                }
              }
            );

            result.tokensRefreshed++;

            if (validation.isValid && validationScore >= 50) {
              result.healthyTokens++;
            } else {
              result.unhealthyTokens++;
              
              // Mark unhealthy tokens as inactive if score is very low
              if (validationScore < 25) {
                await this.markTokenInvalid(token.token, `Low health score: ${validationScore}`);
              }
            }

            // Update statistics
            result.healthStats.byPlatform[token.platform] = (result.healthStats.byPlatform[token.platform] || 0) + 1;
            result.healthStats.byUserType[token.userType] = (result.healthStats.byUserType[token.userType] || 0) + 1;
            
            if (validationScore <= 25) result.healthStats.byValidationScore['0-25']++;
            else if (validationScore <= 50) result.healthStats.byValidationScore['26-50']++;
            else if (validationScore <= 75) result.healthStats.byValidationScore['51-75']++;
            else result.healthStats.byValidationScore['76-100']++;

          } catch (tokenError) {
            result.errors.push(`Error refreshing token ${token._id}: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
          }
        }));
      }

      console.log(`✅ Health refresh complete:`, {
        total: result.totalTokens,
        healthy: result.healthyTokens,
        unhealthy: result.unhealthyTokens,
        refreshed: result.tokensRefreshed,
        errors: result.errors.length,
      });

    } catch (error) {
      const errorMsg = `Health refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error('❌ Token health refresh error:', error);
    }

    return result;
  }

  /**
   * Batch validate multiple tokens for performance
   * Implements Requirement 3.5: Add batch token validation for performance
   */
  static async batchValidateTokens(tokens: string[]): Promise<Map<string, TokenValidationResult>> {
    const results = new Map<string, TokenValidationResult>();
    
    if (tokens.length === 0) {
      return results;
    }

    console.log(`🔍 Batch validating ${tokens.length} tokens`);

    // Process in smaller batches to avoid overwhelming the system
    const batchSize = 20;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (token) => {
        try {
          const validation = await this.validateToken(token);
          results.set(token, validation);
        } catch (error) {
          results.set(token, {
            isValid: false,
            format: 'UNKNOWN',
            errors: [`Batch validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          });
        }
      }));
    }

    console.log(`✅ Batch validation complete: ${results.size} tokens processed`);
    return results;
  }

  /**
   * Perform additional validation for specific token formats
   */
  private static async performAdditionalValidation(token: string, format: string): Promise<{ isValid: boolean; errors: string[] }> {
    const result: { isValid: boolean; errors: string[] } = { isValid: true, errors: [] };

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
      result.errors.push(`Additional validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Calculate validation score based on token health metrics
   */
  private static calculateValidationScore(tokenDoc: any, validation: TokenValidationResult): number {
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

  /**
   * Update token usage after successful/failed delivery
   * Integrates with maintenance service for usage tracking
   * Implements Requirement 3.6: Token usage tracking
   */
  static async updateTokenUsage(
    token: string, 
    deliveryStatus: 'success' | 'failure',
    context?: {
      notificationId?: string;
      activityId?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        lastUsed: new Date(),
      };

      if (deliveryStatus === 'success') {
        updateData['$inc'] = {
          'healthMetrics.successCount': 1,
        };
        updateData['$set'] = {
          'healthMetrics.lastSuccess': new Date(),
          'healthMetrics.isHealthy': true,
        };
        
        // Reset failure count on success
        updateData['healthMetrics.failureCount'] = 0;
      } else {
        updateData['$inc'] = {
          'healthMetrics.failureCount': 1,
        };
        updateData['$set'] = {
          'healthMetrics.lastFailure': new Date(),
        };
        
        // Add error to validation errors if provided
        if (context?.errorMessage) {
          updateData['$push'] = {
            validationErrors: {
              error: context.errorMessage,
              timestamp: new Date(),
            },
          };
        }
        
        // Auto-deactivate if too many consecutive failures
        const tokenDoc = await PushToken.findOne({ token });
        if (tokenDoc && (tokenDoc.healthMetrics?.failureCount || 0) >= 5) {
          updateData.isActive = false;
          updateData.deactivatedAt = new Date();
          updateData.deactivationReason = `Too many delivery failures: ${(tokenDoc.healthMetrics?.failureCount || 0) + 1}`;
        }
      }

      const result = await PushToken.updateOne({ token }, updateData);
      
      if (result.modifiedCount > 0) {
        console.log(`📊 Token usage updated: ${token.substring(0, 20)}... (${deliveryStatus})`);
      }

    } catch (error) {
      console.error('❌ Error updating token usage:', error);
      // Don't throw error to avoid breaking notification flow
    }
  }

  /**
   * Get comprehensive token statistics
   */
  static async getTokenStatistics(): Promise<{
    overview: {
      totalTokens: number;
      activeTokens: number;
      inactiveTokens: number;
      averageValidationScore: number;
    };
    byPlatform: Record<string, number>;
    byUserType: Record<string, number>;
    byValidationScore: Record<string, number>;
    healthMetrics: {
      healthyTokens: number;
      unhealthyTokens: number;
      tokensNeedingCleanup: number;
      duplicateTokens: number;
    };
  }> {
    try {
      const [
        totalTokens,
        activeTokens,
        inactiveTokens,
        platformStats,
        userTypeStats,
        validationScoreStats,
        avgScore,
        duplicateCount,
      ] = await Promise.all([
        PushToken.countDocuments({}),
        PushToken.countDocuments({ isActive: true }),
        PushToken.countDocuments({ isActive: false }),
        PushToken.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$platform', count: { $sum: 1 } } },
        ]),
        PushToken.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$userType', count: { $sum: 1 } } },
        ]),
        PushToken.aggregate([
          { $match: { isActive: true, validationScore: { $exists: true } } },
          {
            $bucket: {
              groupBy: '$validationScore',
              boundaries: [0, 26, 51, 76, 101],
              default: 'unknown',
              output: { count: { $sum: 1 } },
            },
          },
        ]),
        PushToken.aggregate([
          { $match: { isActive: true, validationScore: { $exists: true } } },
          { $group: { _id: null, avgScore: { $avg: '$validationScore' } } },
        ]),
        PushToken.aggregate([
          { $group: { _id: '$token', count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } },
          { $count: 'duplicates' },
        ]),
      ]);

      // Process aggregation results
      const byPlatform: Record<string, number> = {};
      platformStats.forEach((stat: any) => {
        byPlatform[stat._id] = stat.count;
      });

      const byUserType: Record<string, number> = {};
      userTypeStats.forEach((stat: any) => {
        byUserType[stat._id] = stat.count;
      });

      const byValidationScore: Record<string, number> = {
        '0-25': 0,
        '26-50': 0,
        '51-75': 0,
        '76-100': 0,
      };
      validationScoreStats.forEach((stat: any) => {
        if (stat._id >= 0 && stat._id <= 25) byValidationScore['0-25'] = stat.count;
        else if (stat._id >= 26 && stat._id <= 50) byValidationScore['26-50'] = stat.count;
        else if (stat._id >= 51 && stat._id <= 75) byValidationScore['51-75'] = stat.count;
        else if (stat._id >= 76 && stat._id <= 100) byValidationScore['76-100'] = stat.count;
      });

      const averageValidationScore = avgScore.length > 0 ? Math.round(avgScore[0].avgScore) : 0;
      const duplicateTokens = duplicateCount.length > 0 ? duplicateCount[0].duplicates : 0;

      // Calculate health metrics
      const healthyTokens = byValidationScore['51-75'] + byValidationScore['76-100'];
      const unhealthyTokens = byValidationScore['0-25'] + byValidationScore['26-50'];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const tokensNeedingCleanup = await PushToken.countDocuments({
        $or: [
          { isActive: false, updatedAt: { $lt: thirtyDaysAgo } },
          { lastUsed: { $lt: thirtyDaysAgo } },
        ]
      });

      return {
        overview: {
          totalTokens,
          activeTokens,
          inactiveTokens,
          averageValidationScore,
        },
        byPlatform,
        byUserType,
        byValidationScore,
        healthMetrics: {
          healthyTokens,
          unhealthyTokens,
          tokensNeedingCleanup,
          duplicateTokens,
        },
      };

    } catch (error) {
      console.error('❌ Error getting token statistics:', error);
      throw new Error(`Failed to get token statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}