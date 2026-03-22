import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { checkValidClient } from "@/lib/auth";
import redis, {
  projectMaterialFieldsKey,
  TTL_PROJECT_FIELDS,
  safeRedisGet,
  safeRedisSet,
  safeRedisDel,
} from "@/lib/services/redis";

type Specs = Record<string, unknown>;

type AddMaterialStockItem = {
  projectId: string;
  materialName: string;
  unit: string;
  specs?: Specs;
  qnt: number | string;
  perUnitCost: number | string;
  mergeIfExists?: boolean;
};

type MaterialSubdoc = {
  _id?: Types.ObjectId | string;
  name: string;
  unit: string;
  specs?: Specs;
  qnt: number;
  perUnitCost: number;
  totalCost: number;
};

// ─── Cache invalidation helper ────────────────────────────────────────────────
// Deletes the project-fields cache.
async function invalidateProjectMaterialCache(projectId: string): Promise<void> {
  try {
    // Check if Redis is available before attempting operations
    if (!redis || redis.status !== 'ready') {
      console.warn("⚠️  Redis not available for cache invalidation");
      return;
    }

    // Delete project-fields cache
    await redis.del(projectMaterialFieldsKey(projectId));
    console.log(`🗑️  Deleted cache for project ${projectId}`);
  } catch (err) {
    // Cache invalidation failure must never break the API response
    console.error("⚠️  Redis invalidation error:", err);
  }
}

// ─── GET: Fetch MaterialAvailable ────────────────────────────
export const GET = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId    = searchParams.get("projectId");
    const clientId     = searchParams.get("clientId");
    const sortBy       = searchParams.get("sortBy")             || "createdAt";
    const sortOrder    = searchParams.get("sortOrder")          || "desc";
    const sectionId    = searchParams.get("sectionId");         // ✅ NEW: Section filtering
    const page         = parseInt(searchParams.get("page") || "1");
    const limit        = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // ✅ NEW: Pagination with max 100

    if (!projectId || !clientId) {
      return NextResponse.json(
        { message: "Project ID and Client ID are required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(clientId)) {
      return NextResponse.json(
        { message: "Invalid project ID or client ID format" },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { message: "Page and limit must be positive integers" },
        { status: 400 }
      );
    }

    // Add basic client validation (optional - you might want to implement checkValidClient here too)
    // await checkValidClient(req);

    // ── 1. Try Redis cache with pagination ──────────────────────────────────────────────────
    const cacheKey = `materials:${projectId}:${clientId}:${sortBy}:${sortOrder}:${sectionId || 'all'}:${page}:${limit}`;

    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      console.log("✅ CACHE HIT:", cacheKey);
      return NextResponse.json(JSON.parse(cached), { status: 200 });
    }
    console.log("❌ CACHE MISS:", cacheKey);

    await connect();

    // ✅ NEW: Enhanced pipeline with pagination and section filtering
    const pipeline: any[] = [
      {
        $match: {
          _id:      new Types.ObjectId(projectId),
          clientId: new Types.ObjectId(clientId),
        },
      },
      {
        $unwind: {
          path: "$MaterialAvailable",
          preserveNullAndEmptyArrays: false,
        },
      }
    ];

    // ✅ NEW: Add section filtering if provided
    if (sectionId && sectionId !== 'all-sections') {
      pipeline.push({
        $match: {
          $or: [
            { "MaterialAvailable.sectionId": sectionId },
            { "MaterialAvailable.sectionId": { $exists: false } }, // Include global materials
            { "MaterialAvailable.sectionId": null }
          ]
        }
      } as any);
    }

    // Add sorting field
    pipeline.push({
      $addFields: {
        "MaterialAvailable.sortField": {
          $cond: {
            if:   { $eq: [sortBy, "createdAt"] },
            then: { $ifNull: ["$MaterialAvailable.createdAt", new Date()] },
            else: {
              $cond: {
                if:   { $eq: [sortBy, "name"] },
                then: "$MaterialAvailable.name",
                else: {
                  $cond: {
                    if:   { $eq: [sortBy, "totalCost"] },
                    then: "$MaterialAvailable.totalCost",
                    else: "$MaterialAvailable.qnt",
                  },
                },
              },
            },
          },
        },
      },
    });

    // Sort materials
    pipeline.push({ $sort: { "MaterialAvailable.sortField": sortOrder === "asc" ? 1 : -1 } });

    // ✅ NEW: Add pagination
    const skip = (page - 1) * limit;
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    pipeline.push({ $limit: limit });

    // Group results
    pipeline.push({
      $group: {
        _id:        "$_id",
        materials:  { $push: "$MaterialAvailable" },
      },
    });

    // ✅ NEW: Get total count for pagination (separate query for accurate count)
    const countPipeline = [
      {
        $match: {
          _id:      new Types.ObjectId(projectId),
          clientId: new Types.ObjectId(clientId),
        },
      },
      {
        $unwind: {
          path: "$MaterialAvailable",
          preserveNullAndEmptyArrays: false,
        },
      }
    ];

    // Add same section filtering for count
    if (sectionId && sectionId !== 'all-sections') {
      countPipeline.push({
        $match: {
          $or: [
            { "MaterialAvailable.sectionId": sectionId },
            { "MaterialAvailable.sectionId": { $exists: false } },
            { "MaterialAvailable.sectionId": null }
          ]
        }
      } as any);
    }

    countPipeline.push({ $count: "total" } as any);

    const [result, countResult] = await Promise.all([
      Projects.aggregate(pipeline),
      Projects.aggregate(countPipeline)
    ]);

    const totalItems = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalItems / limit);

    if (!result || result.length === 0) {
      const projectExists = await Projects.findOne({
        _id:      new Types.ObjectId(projectId),
        clientId: new Types.ObjectId(clientId),
      });

      if (!projectExists) {
        return NextResponse.json({ message: "Project not found" }, { status: 404 });
      }

      const emptyResponse = {
        success:           true,
        message:           sectionId ? "No materials found for the specified section" : "No materials found for this project",
        MaterialAvailable: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      };

      // Cache the empty result too so repeated requests don't hammer DB
      const cacheSet = await safeRedisSet(cacheKey, JSON.stringify(emptyResponse), TTL_PROJECT_FIELDS);
      if (cacheSet) {
        console.log("💾 Cached empty result:", cacheKey);
      }

      return NextResponse.json(emptyResponse, { status: 200 });
    }

    const data = result[0];

    const responsePayload = {
      success:           true,
      message:           "Material available fetched successfully",
      MaterialAvailable: data.materials || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    // ── 3. Store result in Redis ─────────────────────────────────────────────
    const cacheSet = await safeRedisSet(cacheKey, JSON.stringify(responsePayload), TTL_PROJECT_FIELDS);
    if (cacheSet) {
      console.log("💾 Cached:", cacheKey, `(TTL ${TTL_PROJECT_FIELDS}s)`);
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: unknown) {
    console.error("❌ Material GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch MaterialAvailable",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// ─── POST: Add or merge materials ────────────────────────────────────────────
export const POST = async (req: NextRequest | Request) => {
  await checkValidClient(req);

  try {
    await connect();
    const raw = await req.json();

    const materialItems: AddMaterialStockItem[] = Array.isArray(raw) ? raw : [raw];

    if (materialItems.length === 0) {
      return NextResponse.json({ success: false, error: "No materials provided" }, { status: 400 });
    }

    const results: Array<{
      input: Partial<AddMaterialStockItem>;
      success: boolean;
      action?: "merged" | "created";
      message?: string;
      material?: MaterialSubdoc;
      error?: string;
    }> = [];

    // Track which projects were mutated so we can invalidate their caches once
    const mutatedProjectIds = new Set<string>();

    for (const item of materialItems) {
      const {
        projectId,
        materialName,
        unit,
        specs = {},
        qnt: rawQnt,
        perUnitCost: rawPerUnitCost,
        mergeIfExists = true,
      } = item as AddMaterialStockItem;

      const resultBase = { input: item, success: false };

      const qnt         = typeof rawQnt         === "string" ? Number(rawQnt)         : rawQnt;
      const perUnitCost = typeof rawPerUnitCost  === "string" ? Number(rawPerUnitCost) : rawPerUnitCost;
      const totalCost   = perUnitCost * qnt;

      if (!Types.ObjectId.isValid(projectId)) {
        results.push({ ...resultBase, error: "Invalid project ID format" });
        continue;
      }

      if (!projectId || !materialName || !unit) {
        results.push({ ...resultBase, error: "projectId, materialName and unit are required" });
        continue;
      }

      if (typeof qnt !== "number" || Number.isNaN(qnt)) {
        results.push({ ...resultBase, error: "qnt must be a number" });
        continue;
      }

      if (typeof perUnitCost !== "number" || Number.isNaN(perUnitCost)) {
        results.push({ ...resultBase, error: "perUnitCost must be a number" });
        continue;
      }

      if (qnt <= 0) {
        results.push({ ...resultBase, error: "Quantity must be greater than 0" });
        continue;
      }

      if (perUnitCost < 0) {
        results.push({ ...resultBase, error: "Per unit cost cannot be negative" });
        continue;
      }

      const project = await Projects.findById(projectId);
      if (!project) {
        results.push({ ...resultBase, error: "project not found" });
        continue;
      }

      project.MaterialAvailable = project.MaterialAvailable || [];
      const availableArr = project.MaterialAvailable as MaterialSubdoc[];

      // ── Zero-tolerance price merge logic (unchanged from original) ──────
      let shouldMerge  = false;
      let mergeIndex   = -1;

      if (mergeIfExists) {
        let exactMatchIndex = -1;

        for (let i = 0; i < availableArr.length; i++) {
          const existing = availableArr[i];
          const nameMatch  = existing.name === materialName;
          const unitMatch  = existing.unit === unit;
          const specsMatch = JSON.stringify(existing.specs || {}) === JSON.stringify(specs);
          const priceMatch = Number(existing.perUnitCost || 0) === Number(perUnitCost);

          if (nameMatch && unitMatch && specsMatch && priceMatch) {
            exactMatchIndex = i;
            break;
          }
        }

        if (exactMatchIndex >= 0) {
          shouldMerge = true;
          mergeIndex  = exactMatchIndex;
        }
      }

      // ── Execute merge ────────────────────────────────────────────────────
      if (shouldMerge && mergeIndex >= 0) {
        const existing      = availableArr[mergeIndex];
        const oldQnt        = Number(existing.qnt       || 0);
        const oldPerUnit    = Number(existing.perUnitCost || 0);
        const oldTotalCost  = Number(existing.totalCost  || 0);
        const newQnt        = oldQnt + qnt;
        const newTotalCost  = oldTotalCost + totalCost;

        existing.qnt        = newQnt;
        existing.perUnitCost = oldPerUnit;
        existing.totalCost  = newTotalCost;
        project.spent       = (project.spent || 0) + totalCost;

        const saved = await project.save();

        if (saved) {
          const updatedMaterial = (saved.MaterialAvailable || []).find(
            (m: MaterialSubdoc) =>
              m.name === materialName &&
              m.unit === unit &&
              JSON.stringify(m.specs || {}) === JSON.stringify(specs) &&
              Number(m.perUnitCost || 0) === Number(perUnitCost)
          );

          results.push({
            ...resultBase,
            success: true,
            action:  "merged",
            message: `Merged ${qnt} ${unit} of ${materialName}. Total now: ${newQnt} ${unit}`,
            material: updatedMaterial as MaterialSubdoc,
          });
          mutatedProjectIds.add(projectId);
        } else {
          results.push({ ...resultBase, success: false, error: "Failed to merge material" });
        }
        continue;
      }

      // ── Create new entry ─────────────────────────────────────────────────
      const newMaterial: MaterialSubdoc = {
        _id:         new Types.ObjectId(),
        name:        materialName,
        unit,
        specs:       specs || {},
        qnt:         Number(qnt),
        perUnitCost: Number(perUnitCost),
        totalCost:   Number(totalCost),
      };

      const updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        {
          $push: { MaterialAvailable: newMaterial },
          $inc:  { spent: totalCost },
        },
        { new: true }
      );

      if (updatedProject) {
        results.push({
          ...resultBase,
          success: true,
          action:  "created",
          message: `Created new batch: ${qnt} ${unit} of ${materialName}`,
          material: newMaterial,
        });
        mutatedProjectIds.add(projectId);
      } else {
        results.push({ ...resultBase, success: false, error: "Failed to create material" });
      }
    }

    // ── Invalidate Redis caches for every mutated project ─────────────────
    await Promise.all([...mutatedProjectIds].map(invalidateProjectMaterialCache));

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in material-available POST:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// ─── PUT: Replace MaterialAvailable array ────────────────────────────────────
export const PUT = async (req: NextRequest | Request) => {
  await checkValidClient(req);

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID format" },
        { status: 400 }
      );
    }

    await connect();

    const body = await req.json();
    const { MaterialAvailable } = body;

    if (!MaterialAvailable || !Array.isArray(MaterialAvailable)) {
      return NextResponse.json(
        { success: false, message: "MaterialAvailable must be an array" },
        { status: 400 }
      );
    }

    const updatedProject = await Projects.findByIdAndUpdate(
      projectId,
      { MaterialAvailable },
      { new: true, fields: { MaterialAvailable: 1 } }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { success: false, message: "Project not found or update failed" },
        { status: 404 }
      );
    }

    // Invalidate all material caches for this project
    await invalidateProjectMaterialCache(projectId);

    return NextResponse.json(
      {
        success:           true,
        message:           "MaterialAvailable updated successfully",
        MaterialAvailable: updatedProject.MaterialAvailable,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to update MaterialAvailable",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// ─── DELETE: Remove a material from MaterialAvailable ────────────────────────
export const DELETE = async (req: NextRequest | Request) => {
  await checkValidClient(req);

  try {
    const { searchParams } = new URL(req.url);
    const projectId  = searchParams.get("projectId");
    const materialId = searchParams.get("materialId");

    if (!projectId || !materialId) {
      return NextResponse.json(
        { success: false, message: "Project ID and Material ID are required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(materialId)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID or material ID format" },
        { status: 400 }
      );
    }

    await connect();

    const project = await Projects.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    const initialLength = project.MaterialAvailable?.length || 0;
    project.MaterialAvailable = (project.MaterialAvailable || []).filter(
      (m: MaterialSubdoc) => String(m._id) !== materialId
    );

    if (project.MaterialAvailable.length === initialLength) {
      return NextResponse.json(
        { success: false, message: "Material not found" },
        { status: 404 }
      );
    }

    await project.save();

    // Invalidate all material caches for this project
    await invalidateProjectMaterialCache(projectId);

    return NextResponse.json(
      {
        success:           true,
        message:           "Material deleted successfully",
        MaterialAvailable: project.MaterialAvailable,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete material",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};