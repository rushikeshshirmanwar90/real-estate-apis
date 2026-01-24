import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { checkValidClient } from "@/lib/auth";

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
    if (page < 1 || limit < 1 || limit > 1000) {
      return NextResponse.json(
        {
          message: "Invalid pagination parameters. Page must be >= 1, limit must be 1-1000",
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
          _id: new Types.ObjectId(projectId),
          clientId: new Types.ObjectId(clientId),
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

    console.log('\n🚀 MATERIAL API POST REQUEST RECEIVED:');
    console.log('Raw request data:', JSON.stringify(raw, null, 2));

    const materialItems: AddMaterialStockItem[] = Array.isArray(raw) ? raw : [raw];

    if (materialItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "No materials provided" },
        { status: 400 }
      );
    }

    console.log('📋 Processing', materialItems.length, 'material items:');
    materialItems.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        materialName: item.materialName,
        unit: item.unit,
        qnt: item.qnt,
        perUnitCost: item.perUnitCost,
        specs: item.specs,
        mergeIfExists: item.mergeIfExists
      });
    });

    const results: Array<{
      input: Partial<AddMaterialStockItem>;
      success: boolean;
      action?: "merged" | "created";
      message?: string;
      material?: MaterialSubdoc;
      error?: string;
    }> = [];

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

      console.log('\n🔍 DETAILED MERGE DECISION PROCESS:');
      console.log('========================================');
      console.log('Input Material Details:');
      console.log('  - Name:', materialName);
      console.log('  - Unit:', unit);
      console.log('  - Quantity:', qnt);
      console.log('  - Per Unit Cost:', perUnitCost);
      console.log('  - Total Cost:', totalCost);
      console.log('  - Specs:', JSON.stringify(specs));
      console.log('  - Merge If Exists:', mergeIfExists);
      console.log('  - Project ID:', projectId);
      
      // Find project and log current materials
      const project = await Projects.findById(projectId);
      if (!project) {
        results.push({ ...resultBase, error: "project not found" });
        continue;
      }

      project.MaterialAvailable = project.MaterialAvailable || [];
      const availableArr = project.MaterialAvailable as MaterialSubdoc[];
      
      console.log('\nCurrent Materials in Database:');
      console.log('  - Total materials:', availableArr.length);
      availableArr.forEach((material, index) => {
        console.log(`  ${index + 1}. ${material.name}`);
        console.log(`     - Unit: ${material.unit}`);
        console.log(`     - Quantity: ${material.qnt}`);
        console.log(`     - Per Unit Cost: ₹${material.perUnitCost}`);
        console.log(`     - Total Cost: ₹${material.totalCost}`);
        console.log(`     - Specs: ${JSON.stringify(material.specs || {})}`);
      });

      // ✅ FINAL BULLETPROOF SOLUTION: Zero-tolerance price difference policy
      // If ANY price difference exists, NEVER merge - create separate entries
      
      let shouldMerge = false;
      let mergeIndex = -1;
      
      if (mergeIfExists) {
        console.log('\n🔒 ZERO-TOLERANCE PRICE POLICY ACTIVE');
        console.log('=====================================');
        console.log('Rule: Materials merge ONLY if ALL criteria are IDENTICAL:');
        console.log('  ✓ Same name');
        console.log('  ✓ Same unit'); 
        console.log('  ✓ Same specifications');
        console.log('  ✓ EXACT same price (zero tolerance)');
        console.log('');
        
        const availableArr = project.MaterialAvailable as MaterialSubdoc[];
        console.log('Checking new material against', availableArr.length, 'existing materials:');
        console.log('  New Material:', materialName, `(${qnt} ${unit} @ ₹${perUnitCost})`);
        console.log('  Specs:', JSON.stringify(specs));
        
        // Find exact match: name + unit + specs + price must ALL be identical
        let exactMatchIndex = -1;
        
        for (let i = 0; i < availableArr.length; i++) {
          const existing = availableArr[i];
          
          // Check each criteria individually for detailed logging
          const nameMatch = existing.name === materialName;
          const unitMatch = existing.unit === unit;
          const specsMatch = JSON.stringify(existing.specs || {}) === JSON.stringify(specs);
          const priceMatch = Number(existing.perUnitCost || 0) === Number(perUnitCost);
          
          console.log(`\n  Existing Material ${i + 1}: ${existing.name}`);
          console.log(`    Name match: ${nameMatch} (${existing.name} vs ${materialName})`);
          console.log(`    Unit match: ${unitMatch} (${existing.unit} vs ${unit})`);
          console.log(`    Specs match: ${specsMatch}`);
          console.log(`    Price match: ${priceMatch} (₹${existing.perUnitCost} vs ₹${perUnitCost})`);
          
          // ALL criteria must match for merging
          if (nameMatch && unitMatch && specsMatch && priceMatch) {
            console.log(`    🎯 PERFECT MATCH FOUND! All criteria identical.`);
            exactMatchIndex = i;
            break; // Found exact match, no need to continue
          } else if (nameMatch && unitMatch && specsMatch && !priceMatch) {
            console.log(`    🚫 PRICE MISMATCH DETECTED!`);
            console.log(`       Same name/unit/specs but different price: ₹${existing.perUnitCost} ≠ ₹${perUnitCost}`);
            console.log(`       ZERO-TOLERANCE POLICY: Will create separate entry`);
          } else {
            console.log(`    ❌ No match (different name/unit/specs)`);
          }
        }
        
        if (exactMatchIndex >= 0) {
          console.log('\n✅ MERGE APPROVED: Found material with identical name, unit, specs, AND price');
          shouldMerge = true;
          mergeIndex = exactMatchIndex;
        } else {
          console.log('\n🚫 MERGE DENIED: No material found with identical name, unit, specs, AND price');
          console.log('   Creating new entry to maintain separation');
          shouldMerge = false;
        }
        
      } else {
        console.log('\n📦 MERGE DISABLED BY SETTING - CREATING NEW ENTRY');
        shouldMerge = false;
      }
      
      console.log('\n🎯 FINAL MERGE DECISION:');
      console.log('  - Should Merge:', shouldMerge);
      console.log('  - Merge Index:', mergeIndex);
      console.log('  - Reason:', shouldMerge ? 'Exact price match found' : 'Price differences detected or no matches');
      console.log('========================================\n');
      
      // Execute merge or create based on the decision above
      if (shouldMerge && mergeIndex >= 0) {
        console.log('\n✅ EXECUTING MERGE (Prices are identical)');
        
        const existing = (project.MaterialAvailable as MaterialSubdoc[])[mergeIndex];
        const oldQnt = Number(existing.qnt || 0);
        const oldPerUnitCost = Number(existing.perUnitCost || 0);
        const oldTotalCost = Number(existing.totalCost || 0);
        const newQnt = oldQnt + qnt;
        const newTotalCost = oldTotalCost + totalCost;

        console.log('💰 MERGE CALCULATION:');
        console.log('  - Old:', oldQnt, 'units @', oldPerUnitCost, '= ₹', oldTotalCost);
        console.log('  - Adding:', qnt, 'units @', perUnitCost, '= ₹', totalCost);
        console.log('  - Total:', newQnt, 'units @', oldPerUnitCost, '= ₹', newTotalCost);

        // Update the existing material
        existing.qnt = newQnt;
        existing.perUnitCost = oldPerUnitCost; // Keep original price (they're the same anyway)
        existing.totalCost = newTotalCost;
        project.spent = (project.spent || 0) + totalCost;

        const saved = await project.save();

        if (saved) {
          const updatedMaterial = (saved.MaterialAvailable || []).find((m: MaterialSubdoc) =>
            m.name === materialName &&
            m.unit === unit &&
            JSON.stringify(m.specs || {}) === JSON.stringify(specs) &&
            Number(m.perUnitCost || 0) === Number(perUnitCost)
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
        
        console.log('✅ MERGE COMPLETED - MOVING TO NEXT MATERIAL');
        continue; // Skip to next material
      }
      
      // If we reach here, we're creating a new material entry
      console.log('\n📦 CREATING NEW MATERIAL ENTRY');
      console.log('  - Reason:', shouldMerge ? 'Merge failed' : 'Price differences detected or merge disabled');

      // Create new batch using findByIdAndUpdate
      // Assign an explicit _id to material subdocuments so other APIs can reference them reliably
      
      console.log('\n💰 IMPORT COST CALCULATION:');
      console.log('  - Material:', materialName);
      console.log('  - Per-unit cost:', perUnitCost);
      console.log('  - Quantity:', qnt);
      console.log('  - Total cost for import:', totalCost);
      
      const newMaterial: MaterialSubdoc = {
        _id: new Types.ObjectId(),
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