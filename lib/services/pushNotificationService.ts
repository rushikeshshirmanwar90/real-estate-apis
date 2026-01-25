import { PushToken } from "@/lib/models/PushToken";

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
}

/**
 * Send push notifications using Expo Push Notification service
 */
export class PushNotificationService {
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  private static readonly MAX_BATCH_SIZE = 100; // Expo's limit

  /**
   * Send push notifications to multiple users
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
      console.log('📱 Sending push notifications to users:', userIds);

      // Get active push tokens for these users
      const pushTokens = await PushToken.find({
        userId: { $in: userIds },
        isActive: true,
      }).select('token userId platform') as PushTokenDocument[];

      if (pushTokens.length === 0) {
        console.log('📭 No active push tokens found for users:', userIds);
        return {
          success: true,
          messagesSent: 0,
          errors: ['No active push tokens found'],
        };
      }

      console.log(`📱 Found ${pushTokens.length} active push tokens`);

      // Validate tokens before sending
      const validTokens = pushTokens.filter(tokenDoc => 
        this.isValidExpoPushToken(tokenDoc.token)
      );

      if (validTokens.length === 0) {
        console.log('📭 No valid push tokens found for users:', userIds);
        return {
          success: true,
          messagesSent: 0,
          errors: ['No valid push tokens found'],
        };
      }

      console.log(`📱 Found ${validTokens.length} valid push tokens`);

      // Create messages
      const messages: ExpoPushMessage[] = validTokens.map(tokenDoc => ({
        to: tokenDoc.token,
        title,
        body,
        data: {
          ...data,
          userId: tokenDoc.userId,
          platform: tokenDoc.platform,
        },
        sound: options?.sound || 'default',
        badge: options?.badge,
        priority: options?.priority || 'high',
        ttl: options?.ttl || 3600, // 1 hour default
      }));

      // Send in batches
      const results = await this.sendInBatches(messages);

      // Update last used timestamp for successful tokens
      if (results.results && results.results.length > 0) {
        const successfulTokens = results.results
          .map((result: any, index: number) => {
            if (result.status === 'ok' && validTokens[index]) {
              return validTokens[index].token;
            }
            return null;
          })
          .filter(Boolean);

        if (successfulTokens.length > 0) {
          await PushToken.updateMany(
            { token: { $in: successfulTokens } },
            { lastUsed: new Date() }
          );
        }
      }

      console.log('✅ Push notification results:', {
        messagesSent: results.messagesSent,
        errors: results.errors.length,
      });

      return results;

    } catch (error) {
      console.error('❌ Error sending push notifications:', error);
      return {
        success: false,
        messagesSent: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
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
   * Validate Expo push token format
   */
  static isValidExpoPushToken(token: string): boolean {
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
   * Clean up invalid or expired tokens
   */
  static async cleanupInvalidTokens(): Promise<number> {
    try {
      console.log('🧹 Cleaning up invalid push tokens...');

      // Deactivate tokens that haven't been used in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await PushToken.updateMany(
        {
          isActive: true,
          lastUsed: { $lt: thirtyDaysAgo }
        },
        { isActive: false }
      );

      console.log(`🧹 Deactivated ${result.modifiedCount} old push tokens`);
      return result.modifiedCount;

    } catch (error) {
      console.error('❌ Error cleaning up push tokens:', error);
      return 0;
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