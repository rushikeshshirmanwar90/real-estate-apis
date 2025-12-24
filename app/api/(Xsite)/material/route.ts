import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { checkValidClient } from "@/lib/auth";
import { ObjectId } from "mongodb";

type Specs = Record<string, unknown>;

type AddMaterialStockItem = {
  projectId: string;
  materialName: string;
  unit: string;
  specs?: Specs;
  qnt: number | string;
  perUnitCost: number | string; // ✅ NEW: Per-unit cost field
  mergeIfExists?: boolean;
};

type MaterialSubdoc = {
  _id?: Types.ObjectId | string;
  name: string;
  unit: string;
  specs?: Specs;
  qnt: number;
  perUnitCost: number; // ✅ Per-unit cost field
  totalCost: number;   // ✅ Total cost field
};

// GET: Fetch MaterialAvailable for a project with pagination
export const GET = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");
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
    console.log('MATERIAL API - PAGINATION REQUEST');
    console.log('========================================');
    console.log('Project ID:', projectId);
    console.log('Client ID:', clientId);
    console.log('Page:', page);
    console.log('Limit:', limit);
    console.log('Sort By:', sortBy);
    console.log('Sort Order:', sortOrder);
    console.log('========================================\n');

    // Use MongoDB aggregation for efficient pagination
    const pipeline: any[] = [
      // Match the project
      {
        $match: {
          _id: new ObjectId(projectId),
          clientId: new ObjectId(clientId),
        }
      },
      // Unwind MaterialAvailable array to work with individual materials
      {
        $unwind: {
          path: "$MaterialAvailable",
          preserveNullAndEmptyArrays: false
        }
      },
      // Add sorting field (use current date if createdAt doesn't exist)
      {
        $addFields: {
          "MaterialAvailable.sortField": {
            $cond: {
              if: { $eq: [sortBy, "createdAt"] },
              then: {
                $ifNull: ["$MaterialAvailable.createdAt", new Date()]
              },
              else: {
                $cond: {
                  if: { $eq: [sortBy, "name"] },
                  then: "$MaterialAvailable.name",
                  else: {
                    $cond: {
                      if: { $eq: [sortBy, "totalCost"] },
                      then: "$MaterialAvailable.totalCost",
                      else: "$MaterialAvailable.qnt"
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Sort materials
      {
        $sort: {
          "MaterialAvailable.sortField": sortOrder === "asc" ? 1 : -1
        }
      },
      // Group back to get total count and paginated results
      {
        $group: {
          _id: "$_id",
          totalCount: { $sum: 1 },
          materials: { $push: "$MaterialAvailable" }
        }
      },
      // Add pagination info
      {
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
      }
    ];

    const result = await Projects.aggregate(pipeline);

    if (!result || result.length === 0) {
      // Project exists but has no materials
      const projectExists = await Projects.findOne({
        _id: new ObjectId(projectId),
        clientId: new ObjectId(clientId),
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
          message: "No materials found for this project",
          MaterialAvailable: [],
          pagination: {
            totalCount: 0,
            totalPages: 0,
            currentPage: page,
            hasNextPage: false,
            hasPrevPage: false,
            itemsPerPage: limit
          }
        },
        {
          status: 200,
        }
      );
    }

    const paginationData = result[0];

    console.log('✅ PAGINATION RESULT:');
    console.log('  - Total materials:', paginationData.totalCount);
    console.log('  - Total pages:', paginationData.totalPages);
    console.log('  - Current page:', paginationData.currentPage);
    console.log('  - Materials in this page:', paginationData.materials.length);
    console.log('  - Has next page:', paginationData.hasNextPage);
    console.log('  - Has previous page:', paginationData.hasPrevPage);

    return NextResponse.json(
      {
        success: true,
        message: "Material available fetched successfully",
        MaterialAvailable: paginationData.materials || [],
        pagination: {
          totalCount: paginationData.totalCount,
          totalPages: paginationData.totalPages,
          currentPage: paginationData.currentPage,
          hasNextPage: paginationData.hasNextPage,
          hasPrevPage: paginationData.hasPrevPage,
          itemsPerPage: limit
        }
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('❌ Material API Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch MaterialAvailable",
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
};

// POST: Add or merge materials
export const POST = async (req: NextRequest | Request) => {
  await checkValidClient(req);

  try {
    await connect();
    const raw = await req.json();

    const items: AddMaterialStockItem[] = Array.isArray(raw) ? raw : [raw];

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No materials provided" },
        { status: 400 }
      );
    }

    const results: Array<{
      input: Partial<AddMaterialStockItem>;
      success: boolean;
      action?: "merged" | "created";
      message?: string;
      material?: MaterialSubdoc;
      error?: string;
    }> = [];

    for (const item of items) {
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

      // Basic validation and coercion
      const qnt = typeof rawQnt === "string" ? Number(rawQnt) : rawQnt;
      const perUnitCost = typeof rawPerUnitCost === "string" ? Number(rawPerUnitCost) : rawPerUnitCost;
      const totalCost = perUnitCost * qnt;

      if (!projectId || !materialName || !unit) {
        results.push({
          ...resultBase,
          error: "projectId, materialName and unit are required",
        });
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
        results.push({
          ...resultBase,
          error: "Quantity must be greater than 0",
        });
        continue;
      }

      if (perUnitCost < 0) {
        results.push({ ...resultBase, error: "Per unit cost cannot be negative" });
        continue;
      }

      // Find project
      const project = await Projects.findById(projectId);
      if (!project) {
        results.push({ ...resultBase, error: "project not found" });
        continue;
      }

      project.MaterialAvailable = project.MaterialAvailable || [];

      if (mergeIfExists) {
        const availableArr = project.MaterialAvailable as MaterialSubdoc[];
        const existingIndex = availableArr.findIndex((m: MaterialSubdoc) => {
          try {
            return (
              m.name === materialName &&
              m.unit === unit &&
              JSON.stringify(m.specs || {}) === JSON.stringify(specs)
            );
          } catch {
            return false;
          }
        });

        if (existingIndex >= 0) {
          // Mutate the mongoose document directly to avoid arrayFilters and undefined _id issues
          const existing = (project.MaterialAvailable as MaterialSubdoc[])[
            existingIndex
          ];
          const oldQnt = Number(existing.qnt || 0);
          const oldPerUnitCost = Number(existing.perUnitCost || 0);
          const oldTotalCost = Number(existing.totalCost || 0);
          const newQnt = oldQnt + qnt;
          
          // Calculate weighted average per-unit cost
          const newTotalCost = oldTotalCost + totalCost;
          const newPerUnitCost = newQnt > 0 ? newTotalCost / newQnt : 0;

          console.log('\n💰 MERGE COST CALCULATION:');
          console.log('  - Material:', materialName);
          console.log('  - Old quantity:', oldQnt, '@ ₹', oldPerUnitCost, 'per unit = ₹', oldTotalCost);
          console.log('  - New quantity:', qnt, '@ ₹', perUnitCost, 'per unit = ₹', totalCost);
          console.log('  - Combined quantity:', newQnt, '@ ₹', newPerUnitCost.toFixed(2), 'per unit = ₹', newTotalCost);
          console.log('  - Adding to spent:', totalCost);

          // update fields on the document and save
          existing.qnt = newQnt;
          existing.perUnitCost = newPerUnitCost; // Store weighted average per-unit cost
          existing.totalCost = newTotalCost; // Store total cost
          project.spent = (project.spent || 0) + totalCost; // Add only the new total cost

          const saved = await project.save();

          if (saved) {
            const updatedMaterial = (saved.MaterialAvailable || []).find((m: MaterialSubdoc) =>
              m.name === materialName &&
              m.unit === unit &&
              JSON.stringify(m.specs || {}) === JSON.stringify(specs)
            );

            results.push({
              ...resultBase,
              success: true,
              action: "merged",
              message: `Merged ${qnt} ${unit} of ${materialName}. Total now: ${newQnt} ${unit}`,
              material: updatedMaterial as MaterialSubdoc,
            });
          } else {
            results.push({ ...resultBase, success: false, error: "Failed to merge material" });
          }
          continue;
        }
      }

      // Create new batch using findByIdAndUpdate
      // Assign an explicit _id to material subdocuments so other APIs can reference them reliably
      
      console.log('\n💰 IMPORT COST CALCULATION:');
      console.log('  - Material:', materialName);
      console.log('  - Per-unit cost:', perUnitCost);
      console.log('  - Quantity:', qnt);
      console.log('  - Total cost for import:', totalCost);
      
      const newMaterial: MaterialSubdoc = {
        _id: new ObjectId(),
        name: materialName,
        unit,
        specs: specs || {},
        qnt: Number(qnt),
        perUnitCost: Number(perUnitCost), // Store per-unit cost
        totalCost: Number(totalCost), // Store total cost
      };

      const updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        {
          $push: {
            MaterialAvailable: newMaterial,
          },
          $inc: {
            spent: totalCost, // Add total cost to spent
          },
        },
        { new: true }
      );

      if (updatedProject) {
        results.push({
          ...resultBase,
          success: true,
          action: "created",
          message: `Created new batch: ${qnt} ${unit} of ${materialName}`,
          material: newMaterial,
        });
      } else {
        results.push({
          ...resultBase,
          success: false,
          error: "Failed to create material",
        });
      }
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in material-available:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// PUT: Update MaterialAvailable
export const PUT = async (req: NextRequest | Request) => {
  await checkValidClient(req);

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          message: "Project ID is required",
        },
        {
          status: 400,
        }
      );
    }

    await connect();

    const body = await req.json();
    const { MaterialAvailable } = body;

    if (!MaterialAvailable || !Array.isArray(MaterialAvailable)) {
      return NextResponse.json(
        {
          success: false,
          message: "MaterialAvailable must be an array",
        },
        {
          status: 400,
        }
      );
    }

    const updatedProject = await Projects.findByIdAndUpdate(
      projectId,
      { MaterialAvailable },
      { new: true, fields: { MaterialAvailable: 1 } }
    );

    if (!updatedProject) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found or update failed",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "MaterialAvailable updated successfully",
        MaterialAvailable: updatedProject.MaterialAvailable,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update MaterialAvailable",
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
};

// DELETE: Remove a material from MaterialAvailable
export const DELETE = async (req: NextRequest | Request) => {
  await checkValidClient(req);

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const materialId = searchParams.get("materialId");

    if (!projectId || !materialId) {
      return NextResponse.json(
        {
          success: false,
          message: "Project ID and Material ID are required",
        },
        {
          status: 400,
        }
      );
    }

    await connect();

    const project = await Projects.findById(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found",
        },
        {
          status: 404,
        }
      );
    }

    const initialLength = project.MaterialAvailable?.length || 0;
    project.MaterialAvailable = (project.MaterialAvailable || []).filter(
      (m: MaterialSubdoc) => String(m._id) !== materialId
    );

    if (project.MaterialAvailable.length === initialLength) {
      return NextResponse.json(
        {
          success: false,
          message: "Material not found",
        },
        {
          status: 404,
        }
      );
    }

    await project.save();

    return NextResponse.json(
      {
        success: true,
        message: "Material deleted successfully",
        MaterialAvailable: project.MaterialAvailable,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete material",
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
};