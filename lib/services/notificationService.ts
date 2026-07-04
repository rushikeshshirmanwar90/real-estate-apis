import { Projects } from "@/lib/models/Project";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { Activity } from "@/lib/models/Xsite/Activity";
import { PushToken } from "@/lib/models/PushToken";
import { PushNotificationService } from "./pushNotificationService";
import { getRetryManager, createFailedNotification } from "./retryManager";
import { resolveRecipientsFromDB as resolveRecipientsFromDBUtil } from "@/lib/utils/notificationSender";

export interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    activityId?: string;
    projectId?: string;
    activityType?: string;
    category?: string;
    action?: string;
    route?: string;
  };
  icon?: string;
  badge?: string;
  sound?: string;
}

export interface ProjectAdmin {
  _id: string;
  fullName: string;
  deviceTokens?: string[];
  pushToken?: string;
}

/**
 * Get project admins (ONLY client admins, NO STAFF) for a given project
 */
export async function getProjectAdmins(projectId: string): Promise<ProjectAdmin[]> {
  try {
    const project = await Projects.findById(projectId)
      .select('clientId name')
      .lean() as any;

    if (!project) {
      console.log(`Project not found: ${projectId}`);
      return [];
    }

    const admins: ProjectAdmin[] = [];

    // Get ONLY admins for this client (NO STAFF)
    if (project.clientId) {
      try {
        // Import Admin model
        const { Admin } = await import("@/lib/models/users/Admin");
        
        const clientAdmins = await Admin.find({ clientId: project.clientId })
          .select('_id firstName lastName')
          .lean() as any[];
        
        clientAdmins.forEach((admin: any) => {
          admins.push({
            _id: admin._id.toString(),
            fullName: `${admin.firstName} ${admin.lastName}`,
            deviceTokens: [],
            pushToken: undefined
          });
        });
        
        console.log(`Found ${clientAdmins.length} client admins for project ${projectId} (staff excluded)`);
      } catch (adminError) {
        console.error('Error fetching client admins:', adminError);
      }
    }

    console.log(`Total admins for project ${projectId}: ${admins.length}`, 
      admins.map(admin => admin.fullName));

    return admins;
  } catch (error) {
    console.error('Error getting project admins:', error);
    return [];
  }
}

/**
 * Create notification payload for regular activity
 */
export function createActivityNotification(activity: any): NotificationPayload {
  const { user, activityType, category, action, description, message, projectName } = activity;
  
  let title = '';
  let body = '';
  let icon = 'default';

  // Create contextual notification based on activity type and category
  switch (category) {
    case 'project':
      title = '🏗️ Project Update';
      if (activityType === 'project_created') {
        body = `New project "${projectName || 'Unknown'}" created by ${user.fullName}`;
      } else if (activityType === 'project_updated') {
        body = `Project "${projectName || 'Unknown'}" updated by ${user.fullName}`;
      } else {
        body = `${description} by ${user.fullName}`;
      }
      break;

    case 'section':
      title = '📐 Section Update';
      body = `${description} by ${user.fullName}`;
      if (projectName) body += ` in ${projectName}`;
      break;

    case 'mini_section':
      title = '🔧 Mini Section Update';
      body = `${description} by ${user.fullName}`;
      if (projectName) body += ` in ${projectName}`;
      break;

    case 'staff':
      title = '👥 Staff Update';
      body = `${description} by ${user.fullName}`;
      if (projectName) body += ` for ${projectName}`;
      break;

    case 'labor':
      title = '👷 Labor Update';
      body = `${description} by ${user.fullName}`;
      if (projectName) body += ` in ${projectName}`;
      break;

    case 'material':
      title = '📦 Material Update';
      body = `${description} by ${user.fullName}`;
      if (projectName) body += ` in ${projectName}`;
      break;

    case 'phase':
      title = activityType === 'phase_changed' ? '🚧 Phase Changed' : '📈 Phase Progress';
      body = `${description} by ${user.fullName}`;
      if (projectName) body += ` in ${projectName}`;
      break;

    default:
      title = '📋 Activity Update';
      body = `${description} by ${user.fullName}`;
      if (projectName) body += ` in ${projectName}`;
  }

  // Add message if available
  if (message && message.trim()) {
    body += `\n💬 ${message}`;
  }

  return {
    title,
    body,
    data: {
      activityId: activity._id,
      projectId: activity.projectId,
      activityType,
      category,
      action,
      route: 'notification' // Route to notification screen
    },
    icon: 'default',
    sound: 'default'
  };
}

/**
 * Create notification payload for material activity
 */
export function createMaterialActivityNotification(materialActivity: any): NotificationPayload {
  const { user, activity, materials, projectName, message, transferDetails } = materialActivity;
  
  let title = '';
  let body = '';
  const materialCount = materials?.length || 0;
  const materialNames = materials?.slice(0, 2).map((m: any) => m.name).join(', ') || 'materials';
  const moreText = materialCount > 2 ? ` and ${materialCount - 2} more` : '';

  switch (activity) {
    case 'imported':
      title = '📥 Materials Imported';
      body = `${user.fullName} imported ${materialCount} material${materialCount > 1 ? 's' : ''}: ${materialNames}${moreText}`;
      break;

    case 'used':
      title = '🔨 Materials Used';
      body = `${user.fullName} used ${materialCount} material${materialCount > 1 ? 's' : ''}: ${materialNames}${moreText}`;
      break;

    case 'transferred':
      title = '🔄 Materials Transferred';
      if (transferDetails) {
        body = `${user.fullName} transferred ${materialCount} material${materialCount > 1 ? 's' : ''} from ${transferDetails.fromProject?.name || 'Unknown'} to ${transferDetails.toProject?.name || 'Unknown'}`;
      } else {
        body = `${user.fullName} transferred ${materialCount} material${materialCount > 1 ? 's' : ''}: ${materialNames}${moreText}`;
      }
      break;

    default:
      title = '📦 Material Activity';
      body = `${user.fullName} performed material activity: ${materialNames}${moreText}`;
  }

  if (projectName && activity !== 'transferred') {
    body += ` in ${projectName}`;
  }

  // Add message if available
  if (message && message.trim()) {
    body += `\n💬 ${message}`;
  }

  return {
    title,
    body,
    data: {
      activityId: materialActivity._id,
      projectId: materialActivity.projectId,
      activityType: 'material_activity',
      category: 'material',
      action: activity,
      route: 'notification'
    },
    icon: 'default',
    sound: 'default'
  };
}

/**
 * Send push notification using Expo Push Notifications
 */
export async function sendPushNotification(
  recipients: ProjectAdmin[],
  payload: NotificationPayload
): Promise<void> {
  try {
    console.log('📱 Sending push notification to', recipients.length, 'recipients');
    console.log('📱 Notification payload:', payload);

    if (recipients.length === 0) {
      console.log('📭 No recipients to send notifications to');
      return;
    }

    // Extract user IDs from recipients
    const userIds = recipients.map(admin => admin._id);

    // Send using the push notification service
    const result = await PushNotificationService.sendToUsers(
      userIds,
      payload.title,
      payload.body,
      payload.data,
      {
        sound: payload.sound || 'default',
        badge: payload.badge ? parseInt(payload.badge) : undefined,
        priority: 'high',
        ttl: 3600, // 1 hour
      }
    );

    if (result.success) {
      console.log(`✅ Push notifications sent successfully: ${result.messagesSent} messages`);
    } else {
      console.error('❌ Push notification errors:', result.errors);
    }

    if (result.errors.length > 0) {
      console.warn('⚠️ Some push notifications failed:', result.errors);
    }

  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Send notification for regular activity with enhanced error handling
 * Implements Requirements 2.1, 2.5, 2.6 for structured error handling and logging
 */
export async function notifyActivityCreated(activity: any): Promise<NotificationResult> {
  const startTime = Date.now();
  const notificationId = `act_${activity._id}_${startTime}`;
  
  // Initialize notification context for structured logging (Requirement 2.1, 2.5)
  const context: NotificationContext = {
    activityId: activity._id || 'unknown',
    userId: activity.user?.userId || 'unknown',
    clientId: activity.clientId || 'unknown',
    projectId: activity.projectId || 'unknown',
    activityType: activity.activityType || 'unknown',
    timestamp: new Date(),
    processingStartTime: startTime
  };

  const result: NotificationResult = {
    success: false,
    notificationId,
    recipientCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    errors: [],
    processingTimeMs: 0
  };

  try {
    NotificationLogger.info(context, 'Starting regular activity notification processing');

    // Enhanced validation with detailed error context (Requirement 2.1)
    if (!activity.projectId) {
      const error: NotificationError = {
        type: 'VALIDATION_ERROR',
        message: 'No projectId found in activity, skipping notification',
        context: { 
          activity: {
            _id: activity._id,
            activityType: activity.activityType,
            category: activity.category,
            clientId: activity.clientId,
            userId: activity.user?.userId
          }
        },
        retryable: false,
        timestamp: new Date()
      };
      result.errors.push(error);
      NotificationLogger.warn(context, error.message);
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Create notification payload with comprehensive error handling
    let payload: NotificationPayload;
    try {
      payload = createActivityNotification(activity);
      NotificationLogger.info(context, 'Activity notification payload created', { 
        title: payload.title, 
        bodyLength: payload.body.length,
        category: activity.category,
        dataKeys: Object.keys(payload.data || {})
      });
    } catch (payloadError) {
      const error: NotificationError = {
        type: 'VALIDATION_ERROR',
        message: `Failed to create activity notification payload: ${payloadError instanceof Error ? payloadError.message : 'Unknown error'}`,
        context: { 
          activity: {
            _id: activity._id,
            activityType: activity.activityType,
            category: activity.category,
            description: activity.description
          },
          error: payloadError instanceof Error ? payloadError.stack : payloadError
        },
        retryable: false,
        timestamp: new Date()
      };
      result.errors.push(error);
      NotificationLogger.error(context, error.message, payloadError);
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Send directly to project admins using the push notification service with detailed error tracking
    // If the performing user is an admin, exclude them from notifications
    try {
      // 'admin' and 'users' are both admin-type accounts in LoginUser model
      const isPerformingUserAdmin = ['admin', 'users'].includes(activity.user?.userType);
      const excludeUserId = isPerformingUserAdmin ? activity.user.userId : undefined;
      
      if (excludeUserId) {
        NotificationLogger.info(context, `Excluding performing admin (${excludeUserId}) from notifications`);
      }
      
      const pushResult = await PushNotificationService.sendToProjectAdmins(
        activity.projectId,
        payload.title,
        payload.body,
        payload.data,
        {
          sound: payload.sound || 'default',
          priority: 'high',
          ttl: 3600,
          excludeUserId: excludeUserId, // Exclude performing admin
        }
      );

      result.deliveredCount = pushResult.messagesSent;
      result.recipientCount = pushResult.messagesSent + pushResult.errors.length;
      result.failedCount = pushResult.errors.length;

      if (pushResult.success) {
        NotificationLogger.info(context, `Activity notification sent successfully: ${pushResult.messagesSent} messages`);
        result.success = true;
      } else {
        NotificationLogger.error(context, 'Activity notification delivery failed', pushResult.errors);
      }

      // Convert push service errors to structured errors with detailed context
      if (pushResult.errors.length > 0) {
        pushResult.errors.forEach(errorMsg => {
          result.errors.push({
            type: 'DELIVERY_FAILURE',
            message: errorMsg,
            context: { 
              projectId: activity.projectId, 
              payload: { 
                title: payload.title,
                category: activity.category,
                activityType: activity.activityType
              }
            },
            retryable: true,
            timestamp: new Date()
          });
        });
      }

    } catch (deliveryError) {
      const error: NotificationError = {
        type: 'DELIVERY_FAILURE',
        message: `Critical delivery error: ${deliveryError instanceof Error ? deliveryError.message : 'Unknown error'}`,
        context: { 
          projectId: activity.projectId,
          payload: { 
            title: payload.title,
            category: activity.category,
            activityType: activity.activityType
          },
          error: deliveryError instanceof Error ? deliveryError.stack : deliveryError
        },
        retryable: true,
        timestamp: new Date()
      };
      result.errors.push(error);
      NotificationLogger.error(context, error.message, deliveryError);
    }

    result.processingTimeMs = Date.now() - startTime;
    
    // Performance monitoring (Requirement 2.6)
    NotificationLogger.performance(context, 'Activity notification processing completed');

    // Log performance warning if processing took too long (Requirement 2.6)
    if (result.processingTimeMs > 10000) {
      NotificationLogger.warn(context, `Performance warning: Activity notification processing took ${result.processingTimeMs}ms`);
    }

    return result;

  } catch (error) {
    // Comprehensive catch-all error handler to prevent silent failures (Requirement 2.1)
    const criticalError: NotificationError = {
      type: 'API_ERROR',
      message: `Critical activity notification service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      context: { 
        activity: {
          _id: activity._id,
          activityType: activity.activityType,
          category: activity.category,
          clientId: activity.clientId,
          projectId: activity.projectId,
          userId: activity.user?.userId
        },
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: Date.now() - startTime
      },
      retryable: true,
      timestamp: new Date()
    };
    
    result.errors.push(criticalError);
    result.processingTimeMs = Date.now() - startTime;
    
    // Structured error logging with full context (Requirement 2.1, 2.5)
    NotificationLogger.error(context, criticalError.message, error);
    
    return result;
  }
}

// Enhanced notification result interface for comprehensive error handling
export interface NotificationResult {
  success: boolean;
  notificationId: string;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  errors: NotificationError[];
  processingTimeMs: number;
}

export interface NotificationError {
  type: 'RECIPIENT_RESOLUTION' | 'TOKEN_VALIDATION' | 'DELIVERY_FAILURE' | 'TIMEOUT' | 'VALIDATION_ERROR' | 'API_ERROR';
  message: string;
  context: Record<string, any>;
  retryable: boolean;
  timestamp: Date;
}

// Enhanced logging context interface
interface NotificationContext {
  activityId: string;
  userId: string;
  clientId: string;
  projectId: string;
  activityType: string;
  timestamp: Date;
  processingStartTime: number;
}

/**
 * Enhanced structured logger for notification operations
 * Implements Requirements 2.1, 2.5, 2.6 for comprehensive logging with context
 */
class NotificationLogger {
  private static formatContext(context: NotificationContext): string {
    return `[Activity:${context.activityId}|User:${context.userId}|Client:${context.clientId}|Project:${context.projectId}|Type:${context.activityType}]`;
  }

  /**
   * Log informational messages with structured context (Requirement 2.5)
   */
  static info(context: NotificationContext, message: string, data?: any): void {
    const contextStr = this.formatContext(context);
    const processingTime = Date.now() - context.processingStartTime;
    const timestamp = new Date().toISOString();
    
    // Structured logging format for easy searching and filtering
    console.log(`🔔 ${timestamp} INFO ${contextStr} ${message} (${processingTime}ms)`, 
      data ? JSON.stringify(data, null, 2) : '');
  }

  /**
   * Log warning messages with structured context (Requirement 2.1, 2.5)
   */
  static warn(context: NotificationContext, message: string, data?: any): void {
    const contextStr = this.formatContext(context);
    const processingTime = Date.now() - context.processingStartTime;
    const timestamp = new Date().toISOString();
    
    // Structured warning format for easy identification
    console.warn(`⚠️ ${timestamp} WARN ${contextStr} ${message} (${processingTime}ms)`, 
      data ? JSON.stringify(data, null, 2) : '');
  }

  /**
   * Log error messages with comprehensive context (Requirement 2.1, 2.2, 2.3, 2.4)
   */
  static error(context: NotificationContext, message: string, error?: any): void {
    const contextStr = this.formatContext(context);
    const processingTime = Date.now() - context.processingStartTime;
    const timestamp = new Date().toISOString();
    
    // Enhanced error logging with stack traces and context
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    
    console.error(`❌ ${timestamp} ERROR ${contextStr} ${message} (${processingTime}ms)`, {
      error: errorDetails,
      context: {
        activityId: context.activityId,
        userId: context.userId,
        clientId: context.clientId,
        projectId: context.projectId,
        activityType: context.activityType,
        processingTime: processingTime
      }
    });
  }

  /**
   * Log performance metrics and warnings (Requirement 2.6)
   */
  static performance(context: NotificationContext, message: string): void {
    const processingTime = Date.now() - context.processingStartTime;
    const contextStr = this.formatContext(context);
    const timestamp = new Date().toISOString();
    
    // Performance monitoring with configurable thresholds
    if (processingTime > 10000) { // Log performance warning if > 10 seconds (Requirement 2.6)
      console.warn(`🐌 ${timestamp} PERF_WARN ${contextStr} PERFORMANCE WARNING: ${message} took ${processingTime}ms`);
    } else if (processingTime > 5000) { // Log performance info if > 5 seconds
      console.log(`⏱️ ${timestamp} PERF_INFO ${contextStr} ${message} completed in ${processingTime}ms (slow)`);
    } else {
      console.log(`⏱️ ${timestamp} PERF_INFO ${contextStr} ${message} completed in ${processingTime}ms`);
    }
  }

  /**
   * Log structured metrics for monitoring and analytics
   */
  static metrics(context: NotificationContext, metrics: {
    recipientCount: number;
    deliveredCount: number;
    failedCount: number;
    errorCount: number;
    processingTimeMs: number;
  }): void {
    const contextStr = this.formatContext(context);
    const timestamp = new Date().toISOString();
    
    // Structured metrics logging for monitoring systems
    console.log(`📊 ${timestamp} METRICS ${contextStr}`, {
      metrics: {
        ...metrics,
        successRate: metrics.recipientCount > 0 ? (metrics.deliveredCount / metrics.recipientCount) * 100 : 0,
        timestamp: timestamp
      }
    });
  }

  /**
   * Log debug information (only in development)
   */
  static debug(context: NotificationContext, message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const contextStr = this.formatContext(context);
      const processingTime = Date.now() - context.processingStartTime;
      const timestamp = new Date().toISOString();
      
      console.debug(`🔍 ${timestamp} DEBUG ${contextStr} ${message} (${processingTime}ms)`, 
        data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

/**
 * Enhanced notification service with comprehensive error handling
 * Implements Requirements 2.1, 2.5, 2.6 for structured error handling and logging
 * 
 * Key enhancements:
 * - Structured error handling with detailed context
 * - Performance monitoring with timing measurements
 * - Comprehensive logging with searchable context
 * - Proper async error handling to prevent silent failures
 * - Detailed error classification and retry indicators
 */
export async function notifyMaterialActivityCreated(materialActivity: any): Promise<NotificationResult> {
  const startTime = Date.now();
  const notificationId = `mat_${materialActivity._id}_${startTime}`;
  
  // Initialize notification context for structured logging (Requirement 2.1, 2.5)
  const context: NotificationContext = {
    activityId: materialActivity._id || 'unknown',
    userId: materialActivity.user?.userId || 'unknown',
    clientId: materialActivity.clientId || 'unknown',
    projectId: materialActivity.projectId || 'unknown',
    activityType: materialActivity.activity || 'unknown',
    timestamp: new Date(),
    processingStartTime: startTime
  };

  const result: NotificationResult = {
    success: false,
    notificationId,
    recipientCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    errors: [],
    processingTimeMs: 0
  };

  try {
    NotificationLogger.info(context, 'Starting material activity notification processing');

    // Enhanced validation with detailed error context (Requirement 2.1)
    const validationErrors = validateMaterialActivity(materialActivity);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        result.errors.push({
          type: 'VALIDATION_ERROR',
          message: error,
          context: { 
            materialActivity: {
              _id: materialActivity._id,
              activity: materialActivity.activity,
              clientId: materialActivity.clientId,
              projectId: materialActivity.projectId,
              userId: materialActivity.user?.userId
            }
          },
          retryable: false,
          timestamp: new Date()
        });
      });
      
      NotificationLogger.error(context, 'Material activity validation failed', validationErrors);
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Create notification payload with comprehensive error handling
    let payload: NotificationPayload;
    try {
      payload = createMaterialActivityNotification(materialActivity);
      NotificationLogger.info(context, 'Notification payload created', { 
        title: payload.title, 
        bodyLength: payload.body.length,
        dataKeys: Object.keys(payload.data || {})
      });
    } catch (payloadError) {
      const error: NotificationError = {
        type: 'VALIDATION_ERROR',
        message: `Failed to create notification payload: ${payloadError instanceof Error ? payloadError.message : 'Unknown error'}`,
        context: { 
          materialActivity: {
            _id: materialActivity._id,
            activity: materialActivity.activity,
            materials: materialActivity.materials?.length || 0
          },
          error: payloadError instanceof Error ? payloadError.stack : payloadError
        },
        retryable: false,
        timestamp: new Date()
      };
      result.errors.push(error);
      NotificationLogger.error(context, error.message, payloadError);
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Resolve recipients with comprehensive error handling and fallback
    const recipientResult = await resolveRecipientsWithFallback(context, materialActivity);
    result.recipientCount = recipientResult.recipients.length;
    result.errors.push(...recipientResult.errors);

    if (recipientResult.recipients.length === 0) {
      NotificationLogger.warn(context, 'No recipients found for notification - this may indicate configuration issues');
      result.success = true; // Not an error condition, just no recipients
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Send notifications to main project recipients with detailed error tracking
    // If the performing user is an admin, exclude them from notifications
    // 'admin' and 'users' are both admin-type accounts in LoginUser model
    const isPerformingUserAdmin = ['admin', 'users'].includes(materialActivity.user?.userType);
    const excludeUserId = isPerformingUserAdmin ? materialActivity.user.userId : undefined;
    
    if (excludeUserId) {
      NotificationLogger.info(context, `Excluding performing admin (${excludeUserId}) from material activity notifications`);
    }
    
    const mainDeliveryResult = await sendNotificationWithErrorHandling(
      context,
      recipientResult.recipients,
      payload,
      'main_project',
      excludeUserId // Pass excludeUserId to filter out performing admin
    );
    
    result.deliveredCount += mainDeliveryResult.deliveredCount;
    result.failedCount += mainDeliveryResult.failedCount;
    result.errors.push(...mainDeliveryResult.errors);

    // Handle transferred materials to source project with separate error tracking
    if (materialActivity.activity === 'transferred' && materialActivity.transferDetails?.fromProject?.id) {
      const sourceProjectResult = await handleTransferSourceNotification(
        context,
        materialActivity,
        payload,
        excludeUserId // Pass excludeUserId to also exclude from source project notifications
      );
      
      result.deliveredCount += sourceProjectResult.deliveredCount;
      result.failedCount += sourceProjectResult.failedCount;
      result.errors.push(...sourceProjectResult.errors);
    }

    // Determine overall success with detailed criteria
    result.success = result.deliveredCount > 0 || (result.recipientCount === 0 && result.errors.length === 0);
    result.processingTimeMs = Date.now() - startTime;

    // Performance monitoring and final logging (Requirement 2.6)
    NotificationLogger.performance(context, `Notification processing completed`);
    NotificationLogger.info(context, 'Final notification results', {
      success: result.success,
      recipientCount: result.recipientCount,
      deliveredCount: result.deliveredCount,
      failedCount: result.failedCount,
      errorCount: result.errors.length,
      processingTimeMs: result.processingTimeMs
    });

    // Log performance warning if processing took too long (Requirement 2.6)
    if (result.processingTimeMs > 10000) {
      NotificationLogger.warn(context, `Performance warning: Notification processing took ${result.processingTimeMs}ms`);
    }

    return result;

  } catch (error) {
    // Comprehensive catch-all error handler to prevent silent failures (Requirement 2.1)
    const criticalError: NotificationError = {
      type: 'API_ERROR',
      message: `Critical notification service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      context: { 
        materialActivity: {
          _id: materialActivity._id,
          activity: materialActivity.activity,
          clientId: materialActivity.clientId,
          projectId: materialActivity.projectId,
          userId: materialActivity.user?.userId
        },
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: Date.now() - startTime
      },
      retryable: true,
      timestamp: new Date()
    };
    
    result.errors.push(criticalError);
    result.processingTimeMs = Date.now() - startTime;
    
    // Structured error logging with full context (Requirement 2.1, 2.5)
    NotificationLogger.error(context, criticalError.message, error);
    
    return result;
  }
}

/**
 * Validate material activity data
 */
function validateMaterialActivity(materialActivity: any): string[] {
  const errors: string[] = [];

  if (!materialActivity) {
    errors.push('Material activity is null or undefined');
    return errors;
  }

  if (!materialActivity._id) {
    errors.push('Material activity ID is missing');
  }

  if (!materialActivity.projectId) {
    errors.push('Project ID is missing');
  }

  if (!materialActivity.clientId) {
    errors.push('Client ID is missing');
  }

  if (!materialActivity.user?.userId) {
    errors.push('User ID is missing');
  }

  if (!materialActivity.activity) {
    errors.push('Activity type is missing');
  }

  if (!['imported', 'used', 'transferred'].includes(materialActivity.activity)) {
    errors.push(`Invalid activity type: ${materialActivity.activity}`);
  }

  return errors;
}

/**
 * Resolve recipients with fallback mechanisms and comprehensive error handling
 */
async function resolveRecipientsWithFallback(
  context: NotificationContext, 
  materialActivity: any
): Promise<{ recipients: string[], errors: NotificationError[] }> {
  const errors: NotificationError[] = [];
  let recipients: string[] = [];

  try {
    NotificationLogger.info(context, 'Resolving notification recipients via DB');
    const dbRecipients = await resolveRecipientsFromDBUtil(
      materialActivity.clientId,
      materialActivity.projectId
    );
    recipients = dbRecipients.map((r) => r.userId);
    NotificationLogger.info(context, `DB resolution found ${recipients.length} recipients`);
  } catch (dbError) {
    const error: NotificationError = {
      type: 'RECIPIENT_RESOLUTION',
      message: `Database recipient resolution failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
      context: { 
        clientId: materialActivity.clientId, 
        projectId: materialActivity.projectId
      },
      retryable: true,
      timestamp: new Date()
    };
    errors.push(error);
    NotificationLogger.error(context, error.message, dbError);
    
    // Fallback to legacy
    recipients = await tryLegacyFallbackRecipientResolution(context, materialActivity);
  }

  return { recipients, errors };
}

/**
 * Legacy fallback recipient resolution using ONLY client admins (NO STAFF)
 * This is used as a last resort when the enhanced API completely fails
 */
async function tryLegacyFallbackRecipientResolution(
  context: NotificationContext,
  materialActivity: any
): Promise<string[]> {
  try {
    NotificationLogger.warn(context, 'Using legacy fallback recipient resolution method');

    const { Projects } = await import("@/lib/models/Project");

    const project = await Projects.findById(materialActivity.projectId)
      .select('clientId')
      .lean() as any;

    if (!project?.clientId) {
      NotificationLogger.warn(context, 'Project not found or has no clientId for legacy fallback');
      return [];
    }

    const clientIdStr = project.clientId.toString();

    // Query push tokens directly — avoids Admin._id vs Client._id mismatch
    const tokens = await PushToken.find({
      clientId: clientIdStr,
      userType: 'admin',
      isActive: true,
    }).select('userId').lean() as any[];

    const recipientIds = tokens.map((t: any) => t.userId).filter(Boolean);
    NotificationLogger.info(context, `Legacy fallback found ${recipientIds.length} admin recipients for clientId ${clientIdStr}`);
    return recipientIds;
  } catch (fallbackError) {
    NotificationLogger.error(context, 'Legacy fallback recipient resolution failed', fallbackError);
    return [];
  }
}

/**
 * Send notification with comprehensive error handling and retry logic
 * Implements Requirements 1.2, 1.3, 6.2, 6.5 with RetryManager integration
 */
async function sendNotificationWithErrorHandling(
  context: NotificationContext,
  userIds: string[],
  payload: NotificationPayload,
  target: string,
  excludeUserId?: string // Add excludeUserId parameter
): Promise<{ deliveredCount: number, failedCount: number, errors: NotificationError[] }> {
  const errors: NotificationError[] = [];
  let deliveredCount = 0;
  let failedCount = 0;

  try {
    // Filter out the excluded user if provided
    let filteredUserIds = userIds;
    if (excludeUserId) {
      const beforeCount = userIds.length;
      filteredUserIds = userIds.filter(id => id !== excludeUserId);
      const afterCount = filteredUserIds.length;
      
      if (beforeCount > afterCount) {
        NotificationLogger.info(context, `Filtered out performing user (${excludeUserId}) from ${target} notifications`);
      }
    }
    
    if (filteredUserIds.length === 0) {
      NotificationLogger.info(context, `No recipients remaining after filtering for ${target}`);
      return { deliveredCount: 0, failedCount: 0, errors: [] };
    }
    
    NotificationLogger.info(context, `Sending notifications to ${filteredUserIds.length} users for ${target}`);

    const result = await PushNotificationService.sendToUsers(
      filteredUserIds,
      payload.title,
      payload.body,
      payload.data,
      {
        sound: payload.sound || 'default',
        priority: 'high',
        ttl: 3600,
      }
    );

    deliveredCount = result.messagesSent;
    failedCount = filteredUserIds.length - result.messagesSent;

    if (result.success) {
      NotificationLogger.info(context, `Successfully sent ${deliveredCount} notifications for ${target}`);
    } else {
      NotificationLogger.error(context, `Notification delivery failed for ${target}`, result.errors);
      
      // Schedule failed notifications for retry using RetryManager
      if (failedCount > 0) {
        try {
          const retryManager = getRetryManager();
          const failedNotification = createFailedNotification(
            `${context.activityId}_${target}_${Date.now()}`,
            userIds,
            payload.title,
            payload.body,
            result.errors.join('; '),
            payload.data,
            {
              sound: payload.sound || 'default',
              priority: 'high',
              ttl: 3600,
            }
          );

          await retryManager.scheduleRetry(failedNotification);
          NotificationLogger.info(context, `Scheduled ${failedCount} failed notifications for retry`);
        } catch (retryError) {
          NotificationLogger.error(context, 'Failed to schedule notifications for retry', retryError);
          errors.push({
            type: 'DELIVERY_FAILURE',
            message: `Failed to schedule retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`,
            context: { target, userIds, payload: { title: payload.title } },
            retryable: false,
            timestamp: new Date()
          });
        }
      }
    }

    // Convert push service errors to structured errors
    if (result.errors.length > 0) {
      result.errors.forEach(errorMsg => {
        errors.push({
          type: 'DELIVERY_FAILURE',
          message: errorMsg,
          context: { target, userIds, payload: { title: payload.title } },
          retryable: true,
          timestamp: new Date()
        });
      });
    }

  } catch (deliveryError) {
    failedCount = userIds.length;
    const error: NotificationError = {
      type: 'DELIVERY_FAILURE',
      message: `Critical delivery error for ${target}: ${deliveryError instanceof Error ? deliveryError.message : 'Unknown error'}`,
      context: { 
        target, 
        userIds, 
        payload: { title: payload.title },
        error: deliveryError instanceof Error ? deliveryError.stack : deliveryError
      },
      retryable: true,
      timestamp: new Date()
    };
    errors.push(error);
    NotificationLogger.error(context, error.message, deliveryError);

    // Schedule critical failures for retry as well
    try {
      const retryManager = getRetryManager();
      const failedNotification = createFailedNotification(
        `${context.activityId}_${target}_critical_${Date.now()}`,
        userIds,
        payload.title,
        payload.body,
        error.message,
        payload.data,
        {
          sound: payload.sound || 'default',
          priority: 'high',
          ttl: 3600,
        }
      );

      await retryManager.scheduleRetry(failedNotification);
      NotificationLogger.info(context, `Scheduled critical failure for retry`);
    } catch (retryError) {
      NotificationLogger.error(context, 'Failed to schedule critical failure for retry', retryError);
    }
  }

  return { deliveredCount, failedCount, errors };
}

/**
 * Handle transfer source project notifications
 */
async function handleTransferSourceNotification(
  context: NotificationContext,
  materialActivity: any,
  originalPayload: NotificationPayload,
  excludeUserId?: string // Add excludeUserId parameter
): Promise<{ deliveredCount: number, failedCount: number, errors: NotificationError[] }> {
  const sourceProjectId = materialActivity.transferDetails.fromProject.id;
  
  if (sourceProjectId === materialActivity.projectId) {
    return { deliveredCount: 0, failedCount: 0, errors: [] };
  }

  NotificationLogger.info(context, `Handling transfer notification for source project: ${sourceProjectId}`);

  // Create modified payload for source project
  const sourcePayload = {
    ...originalPayload,
    title: '📤 Materials Transferred Out',
    body: originalPayload.body.replace('transferred', 'transferred out to ' + materialActivity.transferDetails.toProject?.name),
  };

  // Create source context
  const sourceContext: NotificationContext = {
    ...context,
    projectId: sourceProjectId
  };

  // Resolve recipients for source project
  const sourceRecipientResult = await resolveRecipientsWithFallback(sourceContext, {
    ...materialActivity,
    projectId: sourceProjectId
  });

  if (sourceRecipientResult.recipients.length === 0) {
    NotificationLogger.warn(sourceContext, 'No recipients found for source project transfer notification');
    return { deliveredCount: 0, failedCount: 0, errors: sourceRecipientResult.errors };
  }

  // Send notifications to source project recipients (also exclude performing admin)
  const sourceDeliveryResult = await sendNotificationWithErrorHandling(
    sourceContext,
    sourceRecipientResult.recipients,
    sourcePayload,
    'source_project',
    excludeUserId // Pass excludeUserId to filter out performing admin
  );

  // Combine errors from recipient resolution and delivery
  sourceDeliveryResult.errors.push(...sourceRecipientResult.errors);

  return sourceDeliveryResult;
}

/**
 * Fallback method using the old project assignedStaff approach
 */
async function sendNotificationFallback(materialActivity: any, payload: any): Promise<void> {
  console.log('🔄 Using fallback notification method...');
  
  // Send to main project admins using old method
  const mainResult = await PushNotificationService.sendToProjectAdmins(
    materialActivity.projectId,
    payload.title,
    payload.body,
    payload.data,
    {
      sound: payload.sound || 'default',
      priority: 'high',
      ttl: 3600,
    }
  );

  if (mainResult.success) {
    console.log(`✅ Fallback notification sent: ${mainResult.messagesSent} messages for activity ${materialActivity._id}`);
  } else {
    console.error('❌ Fallback notification failed:', mainResult.errors);
  }
}

/**
 * Cache management utilities for recipient resolution
 * 
 * ✅ FIX: Previously used hardcoded external Vercel URL which caused 401 errors.
 * Now uses direct DB queries via the shared utility — no HTTP round-trips needed.
 */
export class RecipientCacheManager {
  /**
   * Clear recipient cache for a specific client
   * Note: The in-memory cache lives in the API route process; from here we
   * simply log the intent. The cache has a 5-minute TTL and will expire on its own.
   */
  static async clearClientCache(clientId: string): Promise<boolean> {
    console.log(`🗑️ Recipient cache clear requested for client: ${clientId} (TTL-based expiry)`);
    return true;
  }

  /**
   * Clear entire recipient cache
   */
  static async clearAllCache(): Promise<boolean> {
    console.log('🗑️ Full recipient cache clear requested (TTL-based expiry)');
    return true;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ cacheSize: number; timestamp: string } | null> {
    return { cacheSize: 0, timestamp: new Date().toISOString() };
  }

  /**
   * Force refresh recipients for a client (direct DB query — always fresh)
   */
  static async refreshRecipients(clientId: string, projectId?: string): Promise<any> {
    try {
      const dbRecipients = await resolveRecipientsFromDBUtil(clientId, projectId);
      console.log(`🔄 Refreshed recipients for client ${clientId}: ${dbRecipients.length} found`);
      return {
        recipients: dbRecipients,
        recipientCount: dbRecipients.length,
        source: 'DIRECT_DB',
      };
    } catch (error) {
      console.error('❌ Failed to refresh recipients:', error);
      return null;
    }
  }
}