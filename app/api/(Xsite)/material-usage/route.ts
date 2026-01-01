import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { Types } from "mongoose";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// Local types matching MaterialSchema
type Specs = Record<string, unknown>;

type MaterialSubdoc = {
  _id?: Types.ObjectId | string;
  name: string;
  unit: string;
  specs?: Specs;
  qnt: number;
  perUnitCost: number; // Per-unit cost field
  totalCost: number;   // Total cost field
  sectionId?: string;
  miniSectionId?: string;
};

// GET: Fetch MaterialUsed for a project with pagination and filtering
export const GET = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");
    const sectionId = searchParams.get("sectionId");
    const miniSectionId = searchParams.get("miniSectionId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (!projectId || !clientId) {
      return NextResponse.json(
        {
          message: "Project ID and Client ID are required",
        },
        {
          status: 400,
        }
      );
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          message: "Invalid pagination parameters. Page must be >= 1, limit must be 1-100",
        },
        {
          status: 400,
        }
      );
    }

    await connect();

    console.log('\n========================================');
    console.log('MATERIAL USAGE API - PAGINATION REQUEST');
    console.log('========================================');
    console.log('Project ID:', projectId);
    console.log('Client ID:', clientId);
    console.log('Section ID:', sectionId);
    console.log('Mini Section ID:', miniSectionId);
    console.log('Page:', page);
    console.log('Limit:', limit);
    console.log('Sort By:', sortBy);
    console.log('Sort Order:', sortOrder);
    console.log('========================================\n');

    // Build match conditions for filtering
    const matchConditions: any = {
      _id: new Types.ObjectId(projectId),
      clientId: new Types.ObjectId(clientId),
    };

    // Use MongoDB aggregation for efficient pagination with filtering
    const pipeline: any[] = [
      // Match the project
      {
        $match: matchConditions
      },
      // Unwind MaterialUsed array to work with individual materials
      {
        $unwind: {
          path: "$MaterialUsed",
          preserveNullAndEmptyArrays: false
        }
      }
    ];

    // Add filtering conditions for MaterialUsed
    const materialUsedFilters: any = {};
    
    if (sectionId) {
      materialUsedFilters["MaterialUsed.sectionId"] = sectionId;
    }
    
    if (miniSectionId && miniSectionId !== 'all-sections') {
      materialUsedFilters["MaterialUsed.miniSectionId"] = miniSectionId;
    }

    // Apply filters if any exist
    if (Object.keys(materialUsedFilters).length > 0) {
      pipeline.push({
        $match: materialUsedFilters
      });
    }

    // Add sorting field (use current date if createdAt doesn't exist)
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

    // Sort materials
    pipeline.push({
      $sort: {
        "MaterialUsed.sortField": sortOrder === "asc" ? 1 : -1
      }
    });

    // Group back to get total count and paginated results
    pipeline.push({
      $group: {
        _id: "$_id",
        totalCount: { $sum: 1 },
        materials: { $push: "$MaterialUsed" }
      }
    });

    // Add pagination info
    pipeline.push({
      $project: {
        totalCount: 1,
        totalPages: { $ceil: { $divide: ["$totalCount", limit] } },
        currentPage: { $literal: page },
        hasNextPage: { $gt: [{ $ceil: { $divide: ["$totalCount", limit] } }, page] },
        hasPrevPage: { $gt: [page, 1] },
        materials: {
          $slice: [
            "$materials",
            (page - 1) * limit,
            limit
          ]
        }
      }
    });

    const result = await Projects.aggregate(pipeline);

    if (!result || result.length === 0) {
      // Project exists but has no used materials (or no materials matching filters)
      const projectExists = await Projects.findOne({
        _id: new Types.ObjectId(projectId),
        clientId: new Types.ObjectId(clientId),
      });

      if (!projectExists) {
        return NextResponse.json(
          {
            message: "Project not found",
          },
          {
            status: 404,
          }
        );
      }

      // Return empty pagination result
      return NextResponse.json(
        {
          success: true,
          message: sectionId || miniSectionId 
            ? "No used materials found for the specified filters" 
            : "No used materials found for this project",
          MaterialUsed: [],
          pagination: {
            totalCount: 0,
            totalPages: 0,
            currentPage: page,
            hasNextPage: false,
            hasPrevPage: false,
            itemsPerPage: limit
          },
          filters: {
            sectionId: sectionId || null,
            miniSectionId: miniSectionId || null
          }
        },
        {
          status: 200,
        }
      );
    }

    const paginationData = result[0];

    console.log('✅ MATERIAL USAGE PAGINATION RESULT:');
    console.log('  - Total used materials:', paginationData.totalCount);
    console.log('  - Total pages:', paginationData.totalPages);
    console.log('  - Current page:', paginationData.currentPage);
    console.log('  - Materials in this page:', paginationData.materials.length);
    console.log('  - Has next page:', paginationData.hasNextPage);
    console.log('  - Has previous page:', paginationData.hasPrevPage);
    console.log('  - Applied filters:', { sectionId, miniSectionId });

    return NextResponse.json(
      {
        success: true,
        message: "Material used fetched successfully",
        MaterialUsed: paginationData.materials || [],
        pagination: {
          totalCount: paginationData.totalCount,
          totalPages: paginationData.totalPages,
          currentPage: paginationData.currentPage,
          hasNextPage: paginationData.hasNextPage,
          hasPrevPage: paginationData.hasPrevPage,
          itemsPerPage: limit
        },
        filters: {
          sectionId: sectionId || null,
          miniSectionId: miniSectionId || null
        }
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('❌ Material Usage API Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch MaterialUsed",
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
};

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();
    const body = await req.json();
    const { projectId, materialId, qnt, miniSectionId, sectionId } = body;

    // Validation
    if (!projectId || !materialId || typeof qnt !== "number" || !sectionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "projectId, materialId, sectionId and numeric qnt are required",
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
      console.error("Project not found for ID:", projectId);
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    // Find material in MaterialAvailable by _id and sectionId (scope to provided section)
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
      return NextResponse.json(
        {
          success: false,
          error: "Material not found in MaterialAvailable",
        },
        { status: 404 }
      );
    }

    const available = project.MaterialAvailable![availIndex] as MaterialSubdoc;
    
    // ✅ FIXED: Robust cost calculation with validation and fallbacks
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
    console.log('  - Raw perUnitCost field:', available.perUnitCost, '(type:', typeof available.perUnitCost, ')');
    console.log('  - Raw cost field (legacy):', (available as any).cost, '(type:', typeof (available as any).cost, ')');
    console.log('  - Calculated per-unit cost:', costPerUnit);
    console.log('  - Quantity being used:', qnt);
    console.log('  - Total cost for quantity used:', costOfUsedMaterial);
    console.log('  - Available quantity:', Number(available.qnt || 0));

    // Check sufficient quantity (coerce stored qnt to Number)
    if (Number(available.qnt || 0) < qnt) {
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

    // Prepare used material clone (include section/miniSection IDs) with validated costs
    const usedClone: MaterialSubdoc = {
      name: available.name,
      unit: available.unit,
      specs: available.specs || {},
      qnt: qnt,
      perUnitCost: costPerUnit, // Store per-unit cost (already validated)
      totalCost: costOfUsedMaterial, // Store total cost for used quantity (already validated)
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

    // Use findByIdAndUpdate with $inc and array operations
    // ✅ FIXED: Do NOT increase spent when using materials - it's just a transfer
    const updatedProject = await Projects.findByIdAndUpdate(
      projectId,
      {
        $inc: {
          "MaterialAvailable.$[elem].qnt": -qnt,
          // ✅ REMOVED: spent: costOfUsedMaterial - Using materials doesn't increase spending
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
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update project",
        },
        { status: 500 }
      );
    }

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

    // FIXED: Return both MaterialAvailable AND MaterialUsed
    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${qnt} ${available.unit} of ${available.name} to used materials`,
        data: {
          projectId: cleanedProject?._id,
          sectionId: sectionId,
          miniSectionId: miniSectionId,
          materialAvailable: cleanedProject?.MaterialAvailable,
          materialUsed: cleanedProject?.MaterialUsed, // ✅ Include this
          usedMaterial: usedClone,
          spent: cleanedProject?.spent,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error in add-material-usage:", msg);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
};