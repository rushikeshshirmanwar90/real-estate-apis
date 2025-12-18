import connect from "@/lib/db";
import { Activity } from "@/lib/models/Xsite/Activity";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";
import { requireValidClient } from "@/lib/utils/client-validation";

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
  
  // Date-based pagination parameters
  const beforeDate = searchParams.get("beforeDate"); // Get activities before this date
  const afterDate = searchParams.get("afterDate");   // Get activities after this date
  const dateLimit = Math.max(1, Math.min(50, parseInt(searchParams.get("dateLimit") || "10"))); // Number of dates to return
  
  // Traditional pagination (fallback)
  const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get("limit") || "50")));
  const skip = Math.max(0, parseInt(searchParams.get("skip") || "0"));
  
  // Pagination mode
  const paginationMode = searchParams.get("paginationMode") || "traditional"; // "traditional" or "date"

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
    if (dateFrom || dateTo || beforeDate || afterDate) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
      if (beforeDate) query.date.$lt = beforeDate;
      if (afterDate) query.date.$gt = afterDate;
    }

    if (paginationMode === "date") {
      // Date-based pagination
      const activities = await Activity.find(query)
        .sort({ date: -1, createdAt: -1 })
        .limit(1000); // Get more activities to group by date

      // Group activities by date
      const groupedByDate: { [date: string]: any[] } = {};
      activities.forEach(activity => {
        const dateKey = activity.date ? activity.date.split('T')[0] : new Date(activity.createdAt).toISOString().split('T')[0];
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(activity);
      });

      // Get sorted date keys (newest first)
      const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
      
      // Apply date limit
      const limitedDates = sortedDates.slice(0, dateLimit);
      
      // Build response with date groups
      const dateGroups = limitedDates.map(date => ({
        date,
        activities: groupedByDate[date].sort((a, b) => 
          new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
        ),
        count: groupedByDate[date].length
      }));

      const totalActivities = limitedDates.reduce((sum, date) => sum + groupedByDate[date].length, 0);
      const hasMoreDates = sortedDates.length > dateLimit;
      const nextDate = hasMoreDates ? sortedDates[dateLimit] : null;

      return successResponse(
        {
          dateGroups,
          totalActivities,
          totalDates: sortedDates.length,
          dateLimit,
          hasMoreDates,
          nextDate,
          paginationMode: "date"
        },
        "Activities fetched successfully with date-based pagination",
        200
      );
    } else {
      // Traditional pagination
      const activities = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Activity.countDocuments(query);

      return successResponse(
        {
          activities,
          total,
          limit,
          skip,
          hasMore: total > skip + limit,
          paginationMode: "traditional"
        },
        "Activities fetched successfully",
        200
      );
    }
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

    // Validation
    if (!body.user || !body.user.userId || !body.user.fullName) {
      return errorResponse("User information is required", 400);
    }

    if (!body.clientId) {
      return errorResponse("clientId is required", 400);
    }

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
      return errorResponse("activityType is required", 400);
    }

    if (!body.category) {
      return errorResponse("category is required", 400);
    }

    if (!body.action) {
      return errorResponse("action is required", 400);
    }

    if (!body.description) {
      return errorResponse("description is required", 400);
    }

    // Ensure `date` exists and is a valid ISO string (model requires it)
    const dateStr = body.date ? String(body.date) : new Date().toISOString();
    if (Number.isNaN(Date.parse(dateStr))) {
      return errorResponse("date must be a valid ISO date string", 400);
    }

    const doc = { ...body, date: dateStr };

    const newActivity = new Activity(doc);
    await newActivity.save();

    return successResponse(newActivity, "Activity logged successfully", 201);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
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
