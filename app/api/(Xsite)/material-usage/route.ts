import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { Types } from "mongoose";
import { 
  safeRedisGetCache, 
  safeRedisSetCache,
  invalidateCachePattern,
  safeRedisDelCache
} from "@/lib/utils/redis-helpers";

// Local types matching MaterialSchema
type Specs = Record<string, unknown>;

type MaterialSubdoc = {
  _id?: Types.ObjectId | string;
  name: string;
  unit: string;
  specs?: Specs;
  qnt: number;
  perUnitCost: number;
  totalCost: number;
  sectionId?: string;
  miniSectionId?: string;
};

// GET: Fetch MaterialUsed from Projects collection with filtering and pagination
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");
    const sectionId = searchParams.get("sectionId");
    const miniSectionId = searchParams.get("miniSectionId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const cacheBuster = searchParams.get("_t");

    if (!projectId || !clientId) {
      return NextResponse.json(
        { message: "Project ID and Client ID are required" },
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

    await connect();

    console.log('\n========================================');
    console.log('MATERIAL USAGE API - REQUEST');
    console.log('========================================');
    console.log('Project ID:', projectId);
    console.log('Client ID:', clientId);
    console.log('Section ID:', sectionId);
    console.log('Mini Section ID:', miniSectionId);
    console.log('Sort By:', sortBy);
    console.log('Sort Order:', sortOrder);
    console.log('Page:', page);
    console.log('Limit:', limit);
    console.log('========================================\n');

    // Check cache first
    const cacheKey = `material-usage:${projectId}:${clientId}:${sectionId || 'all'}:${miniSectionId || 'all'}:${sortBy}:${sortOrder}:${page}:${limit}`;
    console.log(`🔍 Cache key: ${cacheKey}${cacheBuster ? ` (cache buster: ${cacheBuster})` : ''}`);
    
    const cachedData = await safeRedisGetCache(cacheKey);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
      return NextResponse.json(cacheValue, { status: 200 });
    }

    // Build match conditions
    const matchConditions: any = {
      _id: new Types.ObjectId(projectId),
      clientId: new Types.ObjectId(clientId),
    };

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $unwind: {
          path: "$MaterialUsed",
          preserveNullAndEmptyArrays: false
        }
      }
    ];

    // Add filtering conditions
    const materialUsedFilters: any = {};
    
    if (sectionId) {
      materialUsedFilters["MaterialUsed.sectionId"] = sectionId;
    }
    
    if (miniSectionId && miniSectionId !== 'all-sections') {
      materialUsedFilters["MaterialUsed.miniSectionId"] = miniSectionId;
    }

    if (Object.keys(materialUsedFilters).length > 0) {
      pipeline.push({ $match: materialUsedFilters });
    }

    // Add sorting
    pipeline.push({
      $addFields: {
        "MaterialUsed.sortField": {
          $cond: {
            if: { $eq: [sortBy, "createdAt"] },
            then: {
              $ifNull: [
                "$MaterialUsed.createdAt", 
                "$MaterialUsed.addedAt",
                new Date()
              ]
            },
            else: {
              $cond: {
                if: { $eq: [sortBy, "name"] },
                then: "$MaterialUsed.name",
                else: {
                  $cond: {
                    if: { $eq: [sortBy, "totalCost"] },
                    then: "$MaterialUsed.totalCost",
                    else: "$MaterialUsed.qnt"
                  }
                }
              }
            }
          }
        }
      }
    });

    pipeline.push({
      $sort: {
        "MaterialUsed.sortField": sortOrder === "asc" ? 1 : -1
      }
    });

    // Add pagination
    const skip = (page - 1) * limit;
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    pipeline.push({ $limit: limit });

    // Group results
    pipeline.push({
      $group: {
        _id: "$_id",
        materials: { $push: "$MaterialUsed" }
      }
    });

    // Get total count
    const countPipeline = [
      { $match: matchConditions },
      {
        $unwind: {
          path: "$MaterialUsed",
          preserveNullAndEmptyArrays: false
        }
      }
    ];

    if (Object.keys(materialUsedFilters).length > 0) {
      countPipeline.push({ $match: materialUsedFilters });
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
        _id: new Types.ObjectId(projectId),
        clientId: new Types.ObjectId(clientId),
      });

      if (!projectExists) {
        return NextResponse.json(
          { message: "Project not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: sectionId || miniSectionId 
            ? "No used materials found for the specified filters" 
            : "No used materials found for this project",
          MaterialUsed: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false
          },
          filters: {
            sectionId: sectionId || null,
            miniSectionId: miniSectionId || null
          }
        },
        { status: 200 }
      );
    }

    const data = result[0];

    const responsePayload = {
      success: true,
      message: "Material used fetched successfully",
      MaterialUsed: data.materials || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        sectionId: sectionId || null,
        miniSectionId: miniSectionId || null
      }
    };

    // Cache the response
    await safeRedisSetCache(cacheKey, JSON.stringify(responsePayload), 'EX', 86400);

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: unknown) {
    console.error('❌ Material Usage API Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch MaterialUsed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const { projectId, materialId, qnt, miniSectionId, sectionId } = body;

    console.log('\n========================================');
    console.log('📝 SINGLE MATERIAL USAGE API - REQUEST RECEIVED');
    console.log('========================================');
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('========================================\n');

    // Validation
    if (!projectId || !materialId || typeof qnt !== "number" || !sectionId) {
      return NextResponse.json(
        {
          success: false,
          error: "projectId, materialId, sectionId and numeric qnt are required",
        },
        { status: 400 }
      );
    }

    if (qnt <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be greater than 0",
        },
        { status: 400 }
      );
    }

    // Find project document first to get material details
    const project = await Projects.findById(projectId);
    if (!project) {
      console.error("❌ Project not found for ID:", projectId);
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    console.log('✅ Project found:', project._id);

    // Find material in MaterialAvailable by _id and sectionId
    const availIndex = (project.MaterialAvailable || []).findIndex(
      (m: MaterialSubdoc) => {
        try {
          const sameId =
            String((m as unknown as { _id: string | Types.ObjectId })._id) ===
            String(materialId);
          // Accept the available entry if it is global (no sectionId) OR it matches the requested sectionId
          const sameSection =
            !(m as unknown as { sectionId?: string }).sectionId ||
            String((m as unknown as { sectionId?: string }).sectionId) ===
              String(sectionId || "");
          return sameId && sameSection;
        } catch {
          return false;
        }
      }
    );

    if (availIndex == null || availIndex < 0) {
      console.error("❌ Material not found:", materialId);
      return NextResponse.json(
        {
          success: false,
          error: "Material not found in MaterialAvailable",
        },
        { status: 404 }
      );
    }

    const available = project.MaterialAvailable![availIndex] as MaterialSubdoc;
    
    // Robust cost calculation with validation and fallbacks
    let costPerUnit = 0;
    
    // Try to get per-unit cost from various possible fields
    if (available.perUnitCost !== undefined && available.perUnitCost !== null && !isNaN(Number(available.perUnitCost))) {
      costPerUnit = Number(available.perUnitCost);
    } else if ((available as any).cost !== undefined && (available as any).cost !== null && !isNaN(Number((available as any).cost))) {
      // Fallback to legacy 'cost' field
      costPerUnit = Number((available as any).cost);
    } else {
      // Default to 0 if no valid cost found
      costPerUnit = 0;
      console.warn(`⚠️ No valid cost found for material ${available.name}, using 0`);
    }
    
    // Ensure costPerUnit is a valid number
    if (isNaN(costPerUnit) || !isFinite(costPerUnit)) {
      costPerUnit = 0;
      console.warn(`⚠️ Invalid costPerUnit for material ${available.name}, using 0`);
    }
    
    const costOfUsedMaterial = costPerUnit * qnt;
    
    // Validate the calculated total cost
    if (isNaN(costOfUsedMaterial) || !isFinite(costOfUsedMaterial)) {
      console.error(`❌ Invalid total cost calculation for ${available.name}: ${costPerUnit} * ${qnt} = ${costOfUsedMaterial}`);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid cost calculation for material ${available.name}. Please check material cost data.`,
        },
        { status: 400 }
      );
    }

    console.log('\n💰 COST CALCULATION:');
    console.log('  - Material:', available.name);
    console.log('  - Per-unit cost:', costPerUnit);
    console.log('  - Quantity:', qnt);
    console.log('  - Total cost:', costOfUsedMaterial);
    console.log('  - Available quantity:', Number(available.qnt || 0));

    // Check sufficient quantity
    if (Number(available.qnt || 0) < qnt) {
      console.error(`❌ Insufficient quantity for ${available.name}`);
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient quantity available. Available: ${Number(
            available.qnt || 0
          )}, Requested: ${qnt}`,
        },
        { status: 400 }
      );
    }

    // Prepare used material clone with validated costs
    const usedClone: MaterialSubdoc = {
      name: available.name,
      unit: available.unit,
      specs: available.specs || {},
      qnt: qnt,
      perUnitCost: costPerUnit,
      totalCost: costOfUsedMaterial,
      sectionId: String(sectionId),
      miniSectionId:
        miniSectionId ||
        (available as unknown as { miniSectionId?: string }).miniSectionId ||
        undefined,
    };

    // Final validation of the used material clone
    if (isNaN(usedClone.perUnitCost) || isNaN(usedClone.totalCost) || 
        !isFinite(usedClone.perUnitCost) || !isFinite(usedClone.totalCost)) {
      console.error(`❌ Invalid cost values in used material clone for ${available.name}:`, {
        perUnitCost: usedClone.perUnitCost,
        totalCost: usedClone.totalCost
      });
      return NextResponse.json(
        {
          success: false,
          error: `Invalid cost values for material ${available.name}. Cannot proceed with usage.`,
        },
        { status: 400 }
      );
    }

    console.log('\n🔄 Updating database...');

    // Use findByIdAndUpdate with $inc and array operations
    const updatedProject = await Projects.findByIdAndUpdate(
      projectId,
      {
        $inc: {
          "MaterialAvailable.$[elem].qnt": -qnt,
        },
        $push: {
          MaterialUsed: usedClone,
        },
      },
      {
        arrayFilters: [{ "elem._id": new Types.ObjectId(materialId) }],
        new: true,
        fields: {
          MaterialAvailable: 1,
          MaterialUsed: 1,
          spent: 1,
        },
      }
    );

    if (!updatedProject) {
      console.error("❌ Failed to update project");
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update project",
        },
        { status: 500 }
      );
    }

    console.log('✅ Database updated');

    // Clean up: remove materials with 0 or negative quantity
    const cleanedProject = await Projects.findByIdAndUpdate(
      projectId,
      {
        $pull: {
          MaterialAvailable: { qnt: { $lte: 0 } },
        },
      },
      { new: true }
    );

    console.log('✅ Cleaned up materials with 0 quantity');

    // Invalidate caches
    console.log('\n🗑️ Invalidating caches...');
    await invalidateCachePattern(`material-usage:${projectId}:*`);
    await invalidateCachePattern(`material:${projectId}:*`);
    await safeRedisDelCache(`project:${projectId}`);
    await invalidateCachePattern(`projects:*`);
    console.log('✅ Cache invalidation completed');

    console.log('\n✅ SINGLE MATERIAL USAGE COMPLETED');
    console.log('========================================\n');

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${qnt} ${available.unit} of ${available.name} to used materials`,
        data: {
          projectId: cleanedProject?._id,
          sectionId: sectionId,
          miniSectionId: miniSectionId,
          materialAvailable: cleanedProject?.MaterialAvailable,
          materialUsed: cleanedProject?.MaterialUsed,
          usedMaterial: usedClone,
          spent: cleanedProject?.spent,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in single material-usage:", msg);
    console.error("Stack trace:", error);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    
    return NextResponse.json(
      { 
        success: true, 
        message: "material-usage PUT endpoint working",
        data: body
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("material-usage PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    
    return NextResponse.json(
      { 
        success: true, 
        message: "material-usage DELETE endpoint working"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("material-usage DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};
