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
  cost: number | string;
  mergeIfExists?: boolean;
};

type MaterialSubdoc = {
  _id?: Types.ObjectId | string;
  name: string;
  unit: string;
  specs?: Specs;
  qnt: number;
  cost?: number;
};

// GET: Fetch MaterialAvailable for a project
export const GET = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");

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

    await connect();

    const project = await Projects.findOne(
      {
        _id: new ObjectId(projectId),
        clientId: new ObjectId(clientId),
      },
      { MaterialAvailable: 1 }
    );

    if (!project) {
      return NextResponse.json(
        {
          message: "Project not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Material available fetched successfully",
        MaterialAvailable: project.MaterialAvailable || [],
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
        cost: rawCost,
        mergeIfExists = true,
      } = item as AddMaterialStockItem;

      const resultBase = { input: item, success: false };

      // Basic validation and coercion
      const qnt = typeof rawQnt === "string" ? Number(rawQnt) : rawQnt;
      const cost = typeof rawCost === "string" ? Number(rawCost) : rawCost;

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

      if (typeof cost !== "number" || Number.isNaN(cost)) {
        results.push({ ...resultBase, error: "cost must be a number" });
        continue;
      }

      if (qnt <= 0) {
        results.push({
          ...resultBase,
          error: "Quantity must be greater than 0",
        });
        continue;
      }

      if (cost < 0) {
        results.push({ ...resultBase, error: "Cost cannot be negative" });
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
          const oldCostPerUnit = Number(existing.cost || 0);
          const newQnt = oldQnt + qnt;
          // Calculate weighted average per-unit cost
          const totalOldCost = oldCostPerUnit * oldQnt;
          const totalNewCost = cost * qnt;
          const combinedTotalCost = totalOldCost + totalNewCost;
          const newCostPerUnit = newQnt > 0 ? combinedTotalCost / newQnt : 0;

          console.log('\n💰 MERGE COST CALCULATION:');
          console.log('  - Material:', materialName);
          console.log('  - Old quantity:', oldQnt, '@ ₹', oldCostPerUnit, 'per unit = ₹', totalOldCost);
          console.log('  - New quantity:', qnt, '@ ₹', cost, 'per unit = ₹', totalNewCost);
          console.log('  - Combined quantity:', newQnt, '@ ₹', newCostPerUnit.toFixed(2), 'per unit = ₹', combinedTotalCost);
          console.log('  - Adding to spent:', totalNewCost);

          // update fields on the document and save
          existing.qnt = newQnt;
          existing.cost = newCostPerUnit; // Store weighted average per-unit cost
          project.spent = (project.spent || 0) + totalNewCost; // Add only the new total cost

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
      const totalCostForImport = cost * qnt;
      
      console.log('\n💰 IMPORT COST CALCULATION:');
      console.log('  - Material:', materialName);
      console.log('  - Per-unit cost:', cost);
      console.log('  - Quantity:', qnt);
      console.log('  - Total cost for import:', totalCostForImport);
      
      const newMaterial: MaterialSubdoc = {
        _id: new ObjectId(),
        name: materialName,
        unit,
        specs: specs || {},
        qnt: Number(qnt),
        cost: Number(cost), // Store per-unit cost
      };

      const updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        {
          $push: {
            MaterialAvailable: newMaterial,
          },
          $inc: {
            spent: cost * qnt, // FIXED: Add total cost (per-unit cost × quantity) to spent
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
