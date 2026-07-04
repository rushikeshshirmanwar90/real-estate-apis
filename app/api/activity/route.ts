import connect from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";
import { requireValidClient } from "@/lib/utils/client-validation";
import { notifyActivityCreated } from "@/lib/services/notificationService";
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisDelCache,
  safeRedisKeysCache 
} from "@/lib/utils/redis-helpers";
import { Model, Document } from "mongoose";

// Type definitions for the Activity model
interface UserData {
  userId: string;
  fullName: string;
  email?: string;
  userType?: "admin" | "staff";
}

interface ChangedData {
  field?: string;
  oldValue?: any;
  newValue?: any;
}

interface ActivityDocument extends Document {
  _id: any;
  user: UserData;
  clientId: string;
  projectId?: string;
  projectName?: string;
  sectionId?: string;
  sectionName?: string;
  miniSectionId?: string;
  miniSectionName?: string;
  activityType: string;
  category: string;
  action: string;
  description: string;
  message?: string;
  changedData?: ChangedData[];
  metadata?: any;
  ipAddress?: string;
  deviceInfo?: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

// GET: Fetch activities with filters
export const GET = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const clientId = searchParams.get("clientId");
  const userId = searchParams.get("userId");
  const activityType = searchParams.get("activityType");
  const category = searchParams.get("category");
  const action = searchParams.get("action");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const targetDate = searchParams.get("targetDate"); // Get activities for specific date

  try {
    await connect();

    if (!clientId && !projectId) {
      return errorResponse("clientId or projectId is required", 400);
    }

    // ✅ Validate client exists if clientId is provided
    if (clientId) {
      try {
        await requireValidClient(clientId);
      } catch (clientError) {
        if (clientError instanceof Error) {
          return errorResponse(clientError.message, 404);
        }
        return errorResponse("Client validation failed", 404);
      }
    }

    const query: Record<string, any> = {};

    if (clientId) query.clientId = clientId;
    if (projectId) query.projectId = projectId;
    if (userId) query["user.userId"] = userId;
    if (activityType) query.activityType = activityType;
    if (category) query.category = category;
    if (action) query.action = action;

    // Handle date filtering
    if (dateFrom || dateTo || targetDate) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
      if (targetDate) {
        const target = new Date(targetDate);
        const prevDay = new Date(target);
        prevDay.setDate(prevDay.getDate() - 1);
        const nextDay = new Date(target);
        nextDay.setDate(nextDay.getDate() + 1);

        const prevDayStr = prevDay.toISOString().split('T')[0];
        const nextDayStr = nextDay.toISOString().split('T')[0];

        const startOfDay = prevDayStr + 'T00:00:00.000Z';
        const endOfDay = nextDayStr + 'T23:59:59.999Z';
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    // Build cache key based on query
    const cacheKey = `activity:query:${JSON.stringify(query)}`;
    const cachedData = await safeRedisGetCache(cacheKey);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
      return successResponse(cacheValue, "Activities fetched successfully (cached)", 200);
    }

    // Import Activity model dynamically
    const activityModule = await import("@/lib/models/Xsite/Activity");
    const ActivityModel = activityModule.Activity as Model<ActivityDocument>;

    // Get all activities without pagination
    const activities = await ActivityModel.find(query)
      .sort({ date: -1, createdAt: -1 });

    const result = {
      activities,
      totalActivities: activities.length
    };

    // Cache the activities with 24-hour expiration
    await safeRedisSetCache(cacheKey, JSON.stringify(result), 'EX', 86400);

    return successResponse(
      result,
      "Activities fetched successfully",
      200
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// POST: Create activity log
export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const body = await req.json();
    
    console.log('🚀 Activity POST API called');
    console.log('📋 Request body:', JSON.stringify(body, null, 2));

    // Validation
    if (!body.user || !body.user.userId || !body.user.fullName) {
      console.error('❌ User information validation failed:', body.user);
      return errorResponse("User information is required", 400);
    }

    if (!body.clientId) {
      console.error('❌ ClientId validation failed:', body.clientId);
      return errorResponse("clientId is required", 400);
    }

    console.log('✅ Basic validation passed');

    // ✅ Validate client exists before creating activity
    try {
      await requireValidClient(body.clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    if (!body.activityType) {
      console.error('❌ ActivityType validation failed:', body.activityType);
      return errorResponse("activityType is required", 400);
    }

    if (!body.category) {
      console.error('❌ Category validation failed:', body.category);
      return errorResponse("category is required", 400);
    }

    if (!body.action) {
      console.error('❌ Action validation failed:', body.action);
      return errorResponse("action is required", 400);
    }

    if (!body.description) {
      console.error('❌ Description validation failed:', body.description);
      return errorResponse("description is required", 400);
    }

    console.log('✅ All field validation passed');

    // Ensure `date` exists and is a valid ISO string (model requires it)
    const dateStr = body.date ? String(body.date) : new Date().toISOString();
    if (Number.isNaN(Date.parse(dateStr))) {
      console.error('❌ Date validation failed:', body.date, 'parsed as:', dateStr);
      return errorResponse("date must be a valid ISO date string", 400);
    }

    console.log('✅ Date validation passed:', dateStr);

    const doc = { ...body, date: dateStr };

    console.log('🚀 Creating new Activity with doc:', JSON.stringify(doc, null, 2));

    // Import Activity model dynamically
    const activityModule = await import("@/lib/models/Xsite/Activity");
    const ActivityModel = activityModule.Activity as Model<ActivityDocument>;

    const newActivity = new ActivityModel(doc);
    await newActivity.save();

    console.log('✅ Activity created successfully:', newActivity._id);

    // Send notification to project admins (async, don't wait for it)
    if (newActivity.projectId) {
      notifyActivityCreated(newActivity).catch(error => {
        console.error('Failed to send activity notification:', error);
      });
    }

    // Invalidate cache
    const keys = await safeRedisKeysCache(`activity:*`);
    if (keys.length > 0) {
      await safeRedisDelCache(...keys);
    }

    return successResponse(newActivity, "Activity logged successfully", 201);
  } catch (error: unknown) {
    console.error('❌ Activity POST API Error:', error);
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return errorResponse("Something went wrong", 500, error.message);
    }
    console.error('❌ Unknown error type:', typeof error);
    return errorResponse("Unknown error occurred", 500);
  }
};

// DELETE: Delete activities (admin only - optional)
export const DELETE = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const activityId = searchParams.get("id");

  try {
    await connect();

    if (!activityId) {
      return errorResponse("Activity ID is required", 400);
    }

    const deletedActivity = await Activity.findByIdAndDelete(activityId);

    if (!deletedActivity) {
      return errorResponse("Activity not found", 404);
    }

    // Invalidate cache
    const keys = await safeRedisKeysCache(`activity:*`);
    if (keys.length > 0) {
      await safeRedisDelCache(...keys);
    }

    return successResponse(
      deletedActivity,
      "Activity deleted successfully",
      200
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};
