import { Projects } from "@/lib/models/Project";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { Activity } from "@/lib/models/Xsite/Activity";
import { PushNotificationService } from "./pushNotificationService";

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
 * Get project admins (assigned staff) for a given project
 */
export async function getProjectAdmins(projectId: string): Promise<ProjectAdmin[]> {
  try {
    const project = await Projects.findById(projectId)
      .select('assignedStaff')
      .lean() as any;

    if (!project || !project.assignedStaff || project.assignedStaff.length === 0) {
      console.log(`No assigned staff found for project: ${projectId}`);
      return [];
    }

    // Convert assigned staff to admin format
    const admins: ProjectAdmin[] = project.assignedStaff.map((staff: any) => ({
      _id: staff._id,
      fullName: staff.fullName,
      deviceTokens: [], // Will be populated from user/staff collection if needed
      pushToken: undefined // Will be populated from user/staff collection if needed
    }));

    console.log(`Found ${admins.length} admins for project ${projectId}:`, 
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
 * Send notification for regular activity
 */
export async function notifyActivityCreated(activity: any): Promise<void> {
  try {
    if (!activity.projectId) {
      console.log('No projectId found in activity, skipping notification');
      return;
    }

    // Create notification payload
    const payload = createActivityNotification(activity);

    // Send directly to project admins using the push notification service
    const result = await PushNotificationService.sendToProjectAdmins(
      activity.projectId,
      payload.title,
      payload.body,
      payload.data,
      {
        sound: payload.sound || 'default',
        priority: 'high',
        ttl: 3600,
      }
    );

    if (result.success) {
      console.log(`✅ Activity notification sent: ${result.messagesSent} messages for activity ${activity._id}`);
    } else {
      console.error('❌ Activity notification failed:', result.errors);
    }

  } catch (error) {
    console.error('Error sending activity notification:', error);
  }
}

/**
 * Send notification for material activity
 */
export async function notifyMaterialActivityCreated(materialActivity: any): Promise<void> {
  try {
    if (!materialActivity.projectId) {
      console.log('No projectId found in material activity, skipping notification');
      return;
    }

    console.log('🔔 Processing material activity notification...');
    console.log('   - Activity ID:', materialActivity._id);
    console.log('   - Project ID:', materialActivity.projectId);
    console.log('   - Client ID:', materialActivity.clientId);
    console.log('   - Activity Type:', materialActivity.activity);

    // Create notification payload
    const payload = createMaterialActivityNotification(materialActivity);

    // ✅ FIX: Use the notification recipients API instead of project assignedStaff
    // This will get the correct user IDs from Admin and Staff collections
    try {
      console.log('📋 Getting notification recipients from API...');
      
      // Import axios here to avoid circular dependencies
      const axios = (await import('axios')).default;
      
      // Get recipients using our working API
      const recipientsResponse = await axios.get(`http://localhost:8080/api/notifications/recipients`, {
        params: { 
          clientId: materialActivity.clientId,
          projectId: materialActivity.projectId 
        },
        timeout: 5000
      });

      if (recipientsResponse.data.success) {
        const recipients = recipientsResponse.data.data.recipients;
        console.log(`✅ Found ${recipients.length} notification recipients`);
        
        if (recipients.length > 0) {
          // Extract user IDs from recipients
          const userIds = recipients.map((r: any) => r.userId);
          console.log('📱 Sending notifications to user IDs:', userIds);

          // Send using the push notification service
          const result = await PushNotificationService.sendToUsers(
            userIds,
            payload.title,
            payload.body,
            payload.data,
            {
              sound: payload.sound || 'default',
              priority: 'high',
              ttl: 3600,
            }
          );

          if (result.success) {
            console.log(`✅ Material activity notification sent: ${result.messagesSent} messages for activity ${materialActivity._id}`);
          } else {
            console.error('❌ Material activity notification failed:', result.errors);
          }

          if (result.errors.length > 0) {
            console.warn('⚠️ Some material activity notifications failed:', result.errors);
          }
        } else {
          console.log('📭 No recipients found for notification');
        }
      } else {
        console.error('❌ Failed to get notification recipients:', recipientsResponse.data.message);
        // Fallback to old method
        await sendNotificationFallback(materialActivity, payload);
      }
    } catch (apiError) {
      console.error('❌ Error calling recipients API:', apiError);
      // Fallback to old method
      await sendNotificationFallback(materialActivity, payload);
    }

    // Handle transferred materials to source project
    if (materialActivity.activity === 'transferred' && materialActivity.transferDetails?.fromProject?.id) {
      const sourceProjectId = materialActivity.transferDetails.fromProject.id;
      if (sourceProjectId !== materialActivity.projectId) {
        console.log('🔄 Handling transfer notification for source project...');
        
        // Create modified payload for source project
        const sourcePayload = {
          ...payload,
          title: '📤 Materials Transferred Out',
          body: payload.body.replace('transferred', 'transferred out to ' + materialActivity.transferDetails.toProject?.name),
        };

        // Try to get recipients for source project
        try {
          const axios = (await import('axios')).default;
          const sourceRecipientsResponse = await axios.get(`http://localhost:8080/api/notifications/recipients`, {
            params: { 
              clientId: materialActivity.clientId, // Same client, different project
              projectId: sourceProjectId 
            },
            timeout: 5000
          });

          if (sourceRecipientsResponse.data.success) {
            const sourceRecipients = sourceRecipientsResponse.data.data.recipients;
            if (sourceRecipients.length > 0) {
              const sourceUserIds = sourceRecipients.map((r: any) => r.userId);
              
              const sourceResult = await PushNotificationService.sendToUsers(
                sourceUserIds,
                sourcePayload.title,
                sourcePayload.body,
                sourcePayload.data,
                {
                  sound: payload.sound || 'default',
                  priority: 'high',
                  ttl: 3600,
                }
              );

              console.log(`✅ Source project notification sent: ${sourceResult.messagesSent} messages`);
            }
          }
        } catch (sourceError) {
          console.error('❌ Error sending source project notification:', sourceError);
        }
      }
    }

  } catch (error) {
    console.error('Error sending material activity notification:', error);
  }
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