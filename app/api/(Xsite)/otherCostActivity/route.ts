import connect from "@/lib/db";
import { OtherCostActivity } from "@/lib/models/Xsite/otherCost-activity";
import { notifyOtherCostActivityCreated } from "@/lib/services/notificationService";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { NextRequest } from "next/server";
import {
  safeRedisGetCache,
  safeRedisSetCache,
  invalidateCachePattern,
} from "@/lib/utils/redis-helpers";

interface OtherCostItem {
  name: string;
  category: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitCost: number;
  totalCost?: number;
  status?: string;
  sectionId?: string;
  miniSectionId?: string;
}

interface UserPayload {
  userId: string;
  fullName: string;
}

// GET: Fetch other cost activities (notification feed)
export const GET = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const clientId = searchParams.get("clientId");
  const userId = searchParams.get("userId");
  const activity = searchParams.get("activity");
  const targetDate = searchParams.get("targetDate"); // Get activities for specific date

  try {
    await connect();

    // Check cache first
    const cacheKey = `otherCostActivity:${projectId || 'all'}:${clientId || 'all'}:${userId || 'all'}:${activity || 'all'}:${targetDate || 'all'}`;
    const cachedData = await safeRedisGetCache(cacheKey);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
      return successResponse(cacheValue, "Other cost activities fetched successfully (cached)", 200);
    }

    if (!projectId && !clientId) {
      return errorResponse("projectId or clientId is required", 406);
    }

    const query: Record<string, any> = {};
    if (projectId) query.projectId = projectId;
    if (clientId) query.clientId = clientId;
    if (activity) query.activity = activity;
    if (userId) query["user.userId"] = userId;

    // Handle date filtering
    if (targetDate) {
      // Widen query range by 1 day on each side to solve client-server timezone mismatch.
      // The client uses device local time to filter the final list, so this is accurate.
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

    // Get all activities without pagination
    const otherCosts = await OtherCostActivity.find(query)
      .sort({ date: -1, createdAt: -1 });

    if (!otherCosts || otherCosts.length === 0) {
      return successResponse({
        activities: [],
        totalActivities: 0
      }, "No other cost activities found", 200);
    }

    const responseData = {
      activities: otherCosts,
      totalActivities: otherCosts.length
    };

    // Cache the response with 24-hour expiration
    await safeRedisSetCache(cacheKey, JSON.stringify(responseData), 'EX', 86400);

    return successResponse(
      responseData,
      "Other cost activities fetched successfully",
      200
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// POST: Create an other-cost activity log entry
export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const {
      otherCosts,
      message,
      clientId,
      projectId,
      projectName,
      sectionName,
      miniSectionName,
      activity,
      user,
      date,
    } = (await req.json()) as {
      clientId: string;
      projectId: string;
      projectName?: string;
      sectionName?: string;
      miniSectionName?: string;
      otherCosts: OtherCostItem[];
      message?: string;
      activity?: "added" | "updated" | "approved";
      user: UserPayload;
      date?: string;
    };

    // Validation
    if (!clientId) {
      return errorResponse("clientId is required", 406);
    }

    if (!projectId) {
      return errorResponse("projectId is required", 406);
    }

    if (!Array.isArray(otherCosts) || otherCosts.length === 0) {
      return errorResponse("otherCosts array cannot be empty", 406);
    }

    // Validate each other cost item
    for (const cost of otherCosts) {
      if (!cost.name || !cost.category || typeof cost.unitCost !== "number") {
        return errorResponse(
          "Each other cost must have name, category, and unitCost (number)",
          406
        );
      }

      if (cost.unitCost < 0) {
        return errorResponse("Other cost unitCost cannot be negative", 406);
      }
    }

    // validate user
    if (!user || typeof user !== "object") {
      return errorResponse("user is required", 406);
    }
    if (!user.userId || !user.fullName) {
      return errorResponse("user.userId and user.fullName are required", 406);
    }

    // validate date - accept ISO strings; default to now if not provided
    const dateStr = date ? String(date) : new Date().toISOString();
    if (Number.isNaN(Date.parse(dateStr))) {
      return errorResponse("date must be a valid ISO date string", 406);
    }

    const payload = {
      clientId,
      projectId,
      projectName,
      sectionName,
      miniSectionName,
      otherCosts: otherCosts.map((cost) => {
        const quantity = cost.quantity || 1;
        const totalCost = cost.totalCost || quantity * cost.unitCost;
        const validStatuses = ['pending', 'approved', 'paid'];
        return {
          ...cost,
          quantity,
          unit: cost.unit || 'item',
          totalCost,
          status: validStatuses.includes(cost.status ?? '') ? cost.status : 'pending',
          addedAt: new Date(),
        };
      }),
      message: message || "",
      activity: activity || "added",
      date: dateStr,
      user,
    };

    const newOtherCostActivity = new OtherCostActivity(payload);
    await newOtherCostActivity.save();

    console.log('✅ Other cost activity created successfully:', newOtherCostActivity._id);

    // Push to all of this client's admins (async, don't block the response)
    notifyOtherCostActivityCreated(newOtherCostActivity).catch((error) => {
      console.error('Failed to send other cost activity notification:', error);
    });

    // Invalidate cache for other cost activities
    await invalidateCachePattern(`otherCostActivity:*`);

    return successResponse(
      newOtherCostActivity,
      "Other cost activity logged successfully",
      201
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// DELETE: Delete other cost activities
export const DELETE = async (req: NextRequest | Request) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");

    if (!id) {
      return errorResponse(
        "Requested other cost activity id is required for deletion",
        406
      );
    }

    // Handle delete all entries
    if (id === "all") {
      const query: Record<string, string> = {};
      if (projectId) query.projectId = projectId;
      if (clientId) query.clientId = clientId;

      const deletedCount = await OtherCostActivity.deleteMany(query);

      if (deletedCount.deletedCount === 0) {
        return successResponse(
          { deletedCount: 0 },
          "No other cost activities found to delete",
          200
        );
      }

      await invalidateCachePattern(`otherCostActivity:*`);

      return successResponse(
        { deletedCount: deletedCount.deletedCount, query },
        `Successfully deleted ${deletedCount.deletedCount} other cost activities`,
        200
      );
    }

    // Delete single OtherCostActivity by id
    const deletedRequest = await OtherCostActivity.findByIdAndDelete(id);

    if (!deletedRequest) {
      return errorResponse("Requested other cost activity not found", 404);
    }

    await invalidateCachePattern(`otherCostActivity:*`);

    return successResponse(
      deletedRequest,
      "Other cost activity deleted successfully",
      200
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};
