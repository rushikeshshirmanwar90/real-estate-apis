import connect from "@/lib/db";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { NextRequest } from "next/server";
import { notifyMaterialActivityCreated } from "@/lib/services/notificationService";
import { client } from "@/lib/redis";

interface MaterialItem {
  name: string;
  unit: string;
  specs?: Record<string, unknown>;
  qnt: number;
  cost?: number;
  totalCost?: number;
  perUnitCost?: number;
  addedAt?: Date;
  transferDetails?: {
    fromProject: { id: string; name: string };
    toProject: { id: string; name: string };
  };
}

interface UserPayload {
  userId: string;
  fullName: string;
}

interface ImportedMaterialPayload {
  clientId: string;
  projectId: string;
  materials: MaterialItem[];
  message?: string;
}

// GET: Fetch material activities
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
    const cacheKey = `materialActivity:${projectId || 'all'}:${clientId || 'all'}:${userId || 'all'}:${activity || 'all'}:${targetDate || 'all'}`;
    let cacheValue = await client.get(cacheKey);
    
    if (cacheValue) {
      cacheValue = JSON.parse(cacheValue);
      return successResponse(cacheValue, "Material activities fetched successfully (cached)", 200);
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
      // For specific date, get activities for that entire day
      const startOfDay = targetDate + 'T00:00:00.000Z';
      const endOfDay = targetDate + 'T23:59:59.999Z';
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // Get all activities without pagination
    const materials = await MaterialActivity.find(query)
      .sort({ date: -1, createdAt: -1 });

    if (!materials || materials.length === 0) {
      return successResponse({
        activities: [],
        totalActivities: 0
      }, "No material activities found", 200);
    }

    const responseData = {
      activities: materials,
      totalActivities: materials.length
    };

    // Cache the response
    await client.set(cacheKey, JSON.stringify(responseData));

    return successResponse(
      responseData,
      "Material activities fetched successfully",
      200
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// POST: Create imported material request
export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const {
      materials,
      message,
      clientId,
      projectId: reqProjectId,
      projectName,
      sectionName,
      miniSectionName,
      activity,
      user,
      date,
      transferDetails,
    } = (await req.json()) as {
      clientId: string;
      projectId: string;
      projectName?: string;
      sectionName?: string;
      miniSectionName?: string;
      materials: MaterialItem[];
      message?: string;
      activity: "imported" | "used" | "transferred";
      user: UserPayload;
      date?: string;
      transferDetails?: {
        fromProject: { id: string; name: string };
        toProject: { id: string; name: string };
      };
    };

    // Validation
    if (!clientId) {
      return errorResponse("clientId is required", 406);
    }

    if (!reqProjectId) {
      return errorResponse("projectId is required", 406);
    }

    if (!activity || (activity !== "imported" && activity !== "used" && activity !== "transferred")) {
      return errorResponse(
        "activity is required and must be 'imported', 'used', or 'transferred'",
        406
      );
    }

    if (!Array.isArray(materials) || materials.length === 0) {
      return errorResponse("Materials array cannot be empty", 406);
    }

    // Validate each material item
    for (const material of materials) {
      if (
        !material.name ||
        !material.unit ||
        typeof material.qnt !== "number"
      ) {
        return errorResponse(
          "Each material must have name, unit, and qnt (number)",
          406
        );
      }

      if (material.qnt <= 0) {
        return errorResponse("Material quantity must be greater than 0", 406);
      }

      if (material.cost && material.cost < 0) {
        return errorResponse("Material cost cannot be negative", 406);
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

    const payload: ImportedMaterialPayload & {
      activity: "imported" | "used" | "transferred";
      user: UserPayload;
      date: string;
      projectName?: string;
      sectionName?: string;
      miniSectionName?: string;
      transferDetails?: {
        fromProject: { id: string; name: string };
        toProject: { id: string; name: string };
      };
    } = {
      clientId,
      projectId: reqProjectId,
      projectName,
      sectionName,
      miniSectionName,
      materials: materials.map((material) => ({
        ...material,
        specs: material.specs || {},
        cost: material.cost || material.totalCost || 0, // Ensure cost field is set for notifications
        perUnitCost: material.perUnitCost || 0,
        totalCost: material.totalCost || material.cost || 0,
        addedAt: material.addedAt ? new Date(material.addedAt) : new Date(),
      })),
      message: message || "",
      activity,
      date: dateStr,
      user,
      ...(activity === "transferred" && transferDetails ? { transferDetails } : {}),
    };

    const newImportedMaterial = new MaterialActivity(payload);
    await newImportedMaterial.save();

    console.log('✅ Material activity created successfully:', newImportedMaterial._id);

    // Invalidate cache for this project and client
    const keys = await client.keys(`materialActivity:*`);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => client.del(key)));
    }

    // Send notification to project admins (async, don't wait for it)
    notifyMaterialActivityCreated(newImportedMaterial)
      .then(result => {
        if (result.success) {
          console.log(`✅ Material activity notification completed: ${result.deliveredCount}/${result.recipientCount} delivered (${result.processingTimeMs}ms)`);
        } else {
          console.error(`❌ Material activity notification failed: ${result.errors.length} errors, ${result.failedCount} failed deliveries`);
          result.errors.forEach(error => {
            console.error(`   - ${error.type}: ${error.message}`);
          });
        }
      })
      .catch(error => {
        console.error('Critical error in material activity notification:', error);
      });

    return successResponse(
      newImportedMaterial,
      "Material imported successfully",
      201
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

export const DELETE = async (req: NextRequest | Request) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");

    if (!id) {
      return errorResponse(
        "Requested material id is required for deletion",
        406
      );
    }

    // Handle delete all entries
    if (id === "all") {
      // Build query based on provided parameters
      const query: Record<string, string> = {};

      if (projectId) {
        query.projectId = projectId;
      }

      if (clientId) {
        query.clientId = clientId;
      }

      // If neither projectId nor clientId is provided, delete ALL entries
      // (use with caution!)
      const deletedCount = await MaterialActivity.deleteMany(query);

      if (deletedCount.deletedCount === 0) {
        return successResponse(
          { deletedCount: 0 },
          "No material activities found to delete",
          200
        );
      }

      // Invalidate cache for this project and client
      const keys = await client.keys(`materialActivity:*`);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => client.del(key)));
      }

      return successResponse(
        { deletedCount: deletedCount.deletedCount, query },
        `Successfully deleted ${deletedCount.deletedCount} material activities`,
        200
      );
    }

    // Delete single MaterialActivity by id
    const deletedRequest = await MaterialActivity.findByIdAndDelete(id);

    if (!deletedRequest) {
      return errorResponse("Requested material not found", 404);
    }

    // Invalidate cache for this project and client
    const keys = await client.keys(`materialActivity:*`);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => client.del(key)));
    }

    return successResponse(
      deletedRequest,
      "Requested material deleted successfully",
      200
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};
