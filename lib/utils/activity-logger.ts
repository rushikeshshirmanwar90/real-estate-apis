import { Activity } from "@/lib/models/Xsite/Activity";

interface ActivityLogData {
  user: {
    userId: string;
    fullName: string;
    email?: string;
  };
  clientId: string;
  projectId?: string;
  projectName?: string;
  sectionId?: string;
  sectionName?: string;
  miniSectionId?: string;
  miniSectionName?: string;
  activityType: 
    | "project_created" | "project_updated" | "project_deleted"
    | "section_created" | "section_updated" | "section_deleted"
    | "mini_section_created" | "mini_section_updated" | "mini_section_deleted"
    | "staff_assigned" | "staff_removed" | "staff_added"
    | "other";
  category: "project" | "section" | "mini_section" | "material" | "staff" | "other";
  action: "create" | "update" | "delete" | "assign" | "remove" | "import" | "use";
  description: string;
  message?: string;
  changedData?: Array<{
    field?: string;
    oldValue?: any;
    newValue?: any;
  }>;
  metadata?: any;
  ipAddress?: string;
  deviceInfo?: string;
}

export const logActivity = async (data: ActivityLogData): Promise<void> => {
  try {
    const activityDoc = {
      ...data,
      date: new Date().toISOString(),
    };

    const newActivity = new Activity(activityDoc);
    await newActivity.save();
    
    console.log('✅ Activity logged successfully:', {
      type: data.activityType,
      category: data.category,
      action: data.action,
      description: data.description
    });
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Helper function to extract user info from request headers or body
export const extractUserInfo = (req: any, body?: any): { userId: string; fullName: string; email?: string } | null => {
  // Try to get user info from request body first
  if (body?.user) {
    return {
      userId: body.user.userId || body.user._id || 'unknown',
      fullName: body.user.fullName || `${body.user.firstName || ''} ${body.user.lastName || ''}`.trim() || 'Unknown User',
      email: body.user.email
    };
  }

  // Try to get from headers (if you have authentication middleware)
  const userId = req.headers.get?.('x-user-id') || req.headers['x-user-id'];
  const userName = req.headers.get?.('x-user-name') || req.headers['x-user-name'];
  const userEmail = req.headers.get?.('x-user-email') || req.headers['x-user-email'];

  if (userId) {
    return {
      userId,
      fullName: userName || 'Unknown User',
      email: userEmail
    };
  }

  // Fallback - return null instead of System User to avoid confusion
  return null;
};