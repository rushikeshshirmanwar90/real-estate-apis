import { PushToken } from "@/lib/models/PushToken";
import { PushTokenManager } from "./pushTokenManager";

// TypeScript interfaces for better type safety
interface ProjectDocument {
  _id: string;
  name: string;
  assignedStaff: Array<{
    _id: string;
    fullName: string;
  }>;
}

interface PushTokenDocument {
  _id: string;
  userId: string;
  token: string;
  platform: string;
  isActive: boolean;
  lastUsed: Date;
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  expiration?: number;
  channelId?: string;
}

export interface PushNotificationResult {
  success: boolean;
  messagesSent: number;
  errors: string[];
  results?: any[];
  tokenValidationStats?: {
    totalTokens: number;
    validTokens: number;
    invalidTokens: number;
    tokensMarkedInactive: number;
  };
}

/**
 * Enhanced Push Notification Service with robust token management
 * Implements Requirements 3.1, 3.2, 3.3, 3.5, 3.6
 */
export class PushNotificationService {
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  private static readonly MAX_BATCH_SIZE = 100; // Expo's limit

  /**
   * Enhanced send to users with comprehensive token validation and management
   * Implements Requirements 3.1, 3.5, 3.6
   */
  static async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: any,
    options?: {
      sound?: string;
      badge?: number;
      priority?: 'default' | 'normal' | 'high';
      ttl?: number;
    }
  ): Promise<PushNotificationResult> {
    try {
      console.log('📱 Enhanced push notification sending to users:', userIds);

      // Use enhanced token manager to get validated active tokens
      const tokenResult = await PushTokenManager.getActiveTokensForUsers(userIds);

      const result: PushNotificationResult = {
        success: false,
        messagesSent: 0,
        errors: [],
        tokenValidationStats: {
          totalTokens: tokenResult.tokens.length + tokenResult.invalidTokens.length,
          validTokens: tokenResult.tokens.length,
          invalidTokens: tokenResult.invalidTokens.length,
          tokensMarkedInactive: tokenResult.invalidTokens.length,
        },
      };

      if (tokenResult.tokens.length === 0) {
        console.log('📭 No valid push tokens found for users:', userIds);
        result.success = true; // Not an error condition
        result.errors.push('No valid push tokens found');
        
        // Log missing users for debugging
        if (tokenResult.missingUsers.length > 0) {
          console.log('👤 Users with no tokens:', tokenResult.missingUsers);
          result.errors.push(`Users with no tokens: ${tokenResult.missingUsers.join(', ')}`);
        }
        
        return result;
      }

      console.log(`📱 Found ${tokenResult.tokens.length} validated tokens (${tokenResult.invalidTokens.length} invalid tokens filtered out)`);

      // Sort tokens by validation score (highest first) for better delivery success
      const sortedTokens = tokenResult.tokens.sort((a, b) => b.validationScore - a.validationScore);

      // Create messages with enhanced metadata
      const messages: ExpoPushMessage[] = sortedTokens.map(tokenDoc => ({
        to: tokenDoc.token,
        title,
        body,
        data: {
          ...data,
          userId: tokenDoc.userId,
          platform: tokenDoc.platform,
          deviceId: tokenDoc.deviceId,
          validationScore: tokenDoc.validationScore,
        },
        sound: options?.sound || 'default',
        badge: options?.badge,
        priority: options?.priority || 'high',
        ttl: options?.ttl || 3600, // 1 hour default
      }));

      // Send in batches with enhanced error handling
      const sendResult = await this.sendInBatches(messages);
      
      result.success = sendResult.success;
      result.messagesSent = sendResult.messagesSent;
      result.errors = sendResult.errors;
      result.results = sendResult.results;

      // Update token usage and health based on delivery results
      await this.updateTokenHealthFromResults(sortedTokens, sendResult.results || []);

      console.log('✅ Enhanced push notification results:', {
        messagesSent: result.messagesSent,
        errors: result.errors.length,
        validationStats: result.tokenValidationStats,
      });

      return result;

    } catch (error) {
      console.error('❌ Error in enhanced push notification sending:', error);
      return {
        success: false,
        messagesSent: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Update token health metrics based on delivery results
   * Implements Requirement 3.2: Automatic token health monitoring
   */
  private static async updateTokenHealthFromResults(
    tokens: any[],
    results: any[]
  ): Promise<void> {
    try {
      const updatePromises = tokens.map(async (token, index) => {
        const result = results[index];
        
        if (!result) return;

        try {
          if (result.status === 'ok') {
            // Successful delivery - update last used and improve health
            await PushToken.updateOne(
              { token: token.token },
              {
                lastUsed: new Date(),
                lastValidated: new Date(),
                $inc: { 'healthMetrics.successCount': 1 },
                'healthMetrics.lastSuccess': new Date(),
                'healthMetrics.isHealthy': true,
              }
            );
          } else if (result.status === 'error') {
            // Failed delivery - record error and potentially deactivate
            const errorMessage = result.message || result.details?.error || 'Unknown delivery error';
            
            await PushToken.updateOne(
              { token: token.token },
              {
                $push: {
                  validationErrors: {
                    error: `Delivery failed: ${errorMessage}`,
                    timestamp: new Date(),
                  }
                },
                $inc: { 'healthMetrics.failureCount': 1 },
                'healthMetrics.lastFailure': new Date(),
              }
            );

            // Check if token should be deactivated based on error type
            if (this.shouldDeactivateToken(result)) {
              await PushTokenManager.markTokenInvalid(
                token.token,
                `Delivery error: ${errorMessage}`
              );
            }
          }
        } catch (updateError) {
          console.error(`❌ Error updating token health for ${token.token}:`, updateError);
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('❌ Error updating token health from results:', error);
    }
  }

  /**
   * Determine if a token should be deactivated based on delivery error
   */
  private static shouldDeactivateToken(result: any): boolean {
    const errorMessage = result.message || result.details?.error || '';
    
    // Deactivate for these specific error types
    const deactivationErrors = [
      'DeviceNotRegistered',
      'InvalidCredentials',
      'MessageTooBig',
      'MessageRateExceeded',
      'MismatchSenderId',
      'InvalidPackageName',
    ];

    return deactivationErrors.some(error => errorMessage.includes(error));
  }

  /**
   * Send push notifications to project admins
   */
  static async sendToProjectAdmins(
    projectId: string,
    title: string,
    body: string,
    data?: any,
    options?: {
      sound?: string;
      badge?: number;
      priority?: 'default' | 'normal' | 'high';
      ttl?: number;
    }
  ): Promise<PushNotificationResult> {
    try {
      // Import here to avoid circular dependencies
      const { Projects } = await import("@/lib/models/Project");

      // Get project with assigned staff - cast to any to handle Mongoose typing issues
      const project = await Projects.findById(projectId)
        .select('assignedStaff name')
        .lean() as any;

      if (!project || !project.assignedStaff || project.assignedStaff.length === 0) {
        console.log('📭 No assigned staff found for project:', projectId);
        return {
          success: true,
          messagesSent: 0,
          errors: ['No assigned staff found for project'],
        };
      }

      const adminIds = project.assignedStaff.map((staff: any) => staff._id);
      console.log(`📱 Sending notifications to ${adminIds.length} project admins for project: ${project.name}`);

      return await this.sendToUsers(
        adminIds,
        title,
        body,
        {
          ...data,
          projectId,
          projectName: project.name,
        },
        options
      );

    } catch (error) {
      console.error('❌ Error sending notifications to project admins:', error);
      return {
        success: false,
        messagesSent: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send notifications in batches to respect Expo's limits
   */
  private static async sendInBatches(messages: ExpoPushMessage[]): Promise<PushNotificationResult> {
    const results: PushNotificationResult = {
      success: true,
      messagesSent: 0,
      errors: [],
      results: [],
    };

    if (messages.length === 0) {
      return results;
    }

    // Split messages into batches
    const batches = this.chunkArray(messages, this.MAX_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📱 Sending batch ${i + 1}/${batches.length} with ${batch.length} messages`);

      try {
        const response = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Expo push API error (${response.status}):`, errorText);
          results.errors.push(`HTTP ${response.status}: ${errorText}`);
          results.success = false;
          continue;
        }

        const batchResults = await response.json();
        
        if (batchResults.data && Array.isArray(batchResults.data)) {
          results.results?.push(...batchResults.data);
          
          // Count successful messages
          const successCount = batchResults.data.filter((result: any) => result.status === 'ok').length;
          results.messagesSent += successCount;

          // Collect errors
          const batchErrors = batchResults.data
            .filter((result: any) => result.status === 'error')
            .map((result: any) => {
              const errorMessage = result.message || result.details?.error || 'Unknown error';
              // Also log the token that failed for debugging
              if (result.details?.expoPushToken) {
                return `Token ${result.details.expoPushToken}: ${errorMessage}`;
              }
              return errorMessage;
            });
          
          results.errors.push(...batchErrors);

          console.log(`✅ Batch ${i + 1} results: ${successCount} sent, ${batchErrors.length} errors`);
          
          // Log individual errors for debugging
          if (batchErrors.length > 0) {
            console.warn(`⚠️ Batch ${i + 1} errors:`, batchErrors);
          }
        } else {
          console.error(`❌ Unexpected response format from Expo:`, batchResults);
          results.errors.push(`Batch ${i + 1}: Unexpected response format`);
          results.success = false;
        }

      } catch (error) {
        console.error(`❌ Error sending batch ${i + 1}:`, error);
        results.errors.push(`Batch ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.success = false;
      }

      // Add delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Mark as success if at least some messages were sent
    if (results.messagesSent > 0) {
      results.success = true;
    }

    return results;
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Enhanced token validation using PushTokenManager
   * Implements Requirement 3.1: Comprehensive format checking
   */
  static async isValidExpoPushToken(token: string): Promise<boolean> {
    const validation = await PushTokenManager.validateToken(token);
    return validation.isValid;
  }

  /**
   * Legacy synchronous validation for backward compatibility
   */
  static isValidExpoPushTokenSync(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Check for valid Expo push token formats
    const validFormats = [
      /^ExponentPushToken\[.+\]$/,
      /^ExpoPushToken\[.+\]$/,
      /^F[a-zA-Z0-9_-]{10,}$/, // FCM format for Android
    ];
    
    return validFormats.some(format => format.test(token));
  }

  /**
   * Enhanced cleanup using PushTokenManager
   * Implements Requirement 3.4: Clean up inactive push tokens older than 30 days
   */
  static async cleanupInvalidTokens(): Promise<number> {
    try {
      console.log('🧹 Starting enhanced token cleanup...');
      
      const cleanupResult = await PushTokenManager.cleanupInvalidTokens();
      
      console.log(`🧹 Enhanced cleanup complete:`, {
        processed: cleanupResult.totalProcessed,
        deactivated: cleanupResult.tokensDeactivated,
        deleted: cleanupResult.tokensDeleted,
        errors: cleanupResult.errors.length,
      });

      return cleanupResult.tokensDeactivated + cleanupResult.tokensDeleted;
    } catch (error) {
      console.error('❌ Enhanced cleanup error:', error);
      return 0;
    }
  }

  /**
   * Enhanced token health monitoring
   * Implements Requirement 3.2: Automatic token health monitoring
   */
  static async refreshTokenHealth(): Promise<{
    totalTokens: number;
    healthyTokens: number;
    unhealthyTokens: number;
    tokensRefreshed: number;
  }> {
    try {
      console.log('🔄 Starting enhanced token health refresh...');
      
      const healthResult = await PushTokenManager.refreshTokenHealth();
      
      console.log(`✅ Enhanced health refresh complete:`, {
        total: healthResult.totalTokens,
        healthy: healthResult.healthyTokens,
        unhealthy: healthResult.unhealthyTokens,
        refreshed: healthResult.tokensRefreshed,
      });

      return {
        totalTokens: healthResult.totalTokens,
        healthyTokens: healthResult.healthyTokens,
        unhealthyTokens: healthResult.unhealthyTokens,
        tokensRefreshed: healthResult.tokensRefreshed,
      };
    } catch (error) {
      console.error('❌ Enhanced health refresh error:', error);
      return {
        totalTokens: 0,
        healthyTokens: 0,
        unhealthyTokens: 0,
        tokensRefreshed: 0,
      };
    }
  }

  /**
   * Mark tokens as invalid based on Expo push receipt errors
   */
  static async markInvalidTokens(invalidTokens: string[]): Promise<number> {
    try {
      if (invalidTokens.length === 0) {
        return 0;
      }

      console.log(`🗑️ Marking ${invalidTokens.length} tokens as invalid`);

      const result = await PushToken.updateMany(
        { token: { $in: invalidTokens } },
        { isActive: false }
      );

      console.log(`🗑️ Marked ${result.modifiedCount} tokens as invalid`);
      return result.modifiedCount;

    } catch (error) {
      console.error('❌ Error marking invalid tokens:', error);
      return 0;
    }
  }

  /**
   * Get push notification statistics
   */
  static async getStatistics(): Promise<{
    totalTokens: number;
    activeTokens: number;
    tokensByPlatform: { [platform: string]: number };
    tokensByUserType: { [userType: string]: number };
  }> {
    try {
      const [
        totalTokens,
        activeTokens,
        platformStats,
        userTypeStats,
      ] = await Promise.all([
        PushToken.countDocuments({}),
        PushToken.countDocuments({ isActive: true }),
        PushToken.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$platform', count: { $sum: 1 } } },
        ]),
        PushToken.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$userType', count: { $sum: 1 } } },
        ]),
      ]);

      const tokensByPlatform: { [platform: string]: number } = {};
      platformStats.forEach((stat: any) => {
        tokensByPlatform[stat._id] = stat.count;
      });

      const tokensByUserType: { [userType: string]: number } = {};
      userTypeStats.forEach((stat: any) => {
        tokensByUserType[stat._id] = stat.count;
      });

      return {
        totalTokens,
        activeTokens,
        tokensByPlatform,
        tokensByUserType,
      };

    } catch (error) {
      console.error('❌ Error getting push notification statistics:', error);
      return {
        totalTokens: 0,
        activeTokens: 0,
        tokensByPlatform: {},
        tokensByUserType: {},
      };
    }
  }

  /**
   * Test the push notification service with a simple health check
   */
  static async healthCheck(): Promise<{
    service: string;
    status: 'healthy' | 'error';
    timestamp: string;
    stats: any;
    errors?: string[];
  }> {
    try {
      const stats = await this.getStatistics();
      
      return {
        service: 'PushNotificationService',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats,
      };
    } catch (error) {
      return {
        service: 'PushNotificationService',
        status: 'error',
        timestamp: new Date().toISOString(),
        stats: null,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}