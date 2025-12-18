import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { ObjectId } from "mongodb";
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
  cost?: number;
  sectionId?: string;
  miniSectionId?: string;
};

// GET: Fetch MaterialUsed for a project
export const GET = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");
    const sectionId = searchParams.get("sectionId");

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
      { MaterialUsed: 1, MaterialAvailable: 1 }
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

    // Get MaterialUsed array
    const allUsed = project.MaterialUsed || [];

    // If sectionId is provided, filter MaterialUsed to that section
    const filteredUsed = sectionId
      ? allUsed.filter(
          (m: MaterialSubdoc) => String(m.sectionId) === String(sectionId)
        )
      : allUsed;

    // FIXED: Return MaterialUsed instead of MaterialAvailable
    return NextResponse.json(
      {
        success: true,
        message: "Material used fetched successfully",
        MaterialUsed: filteredUsed, // ✅ Return MaterialUsed!
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
    // CONFIRMED: available.cost is per-unit cost (from frontend MaterialFormModal)
    const costPerUnit = Number(available.cost || 0);
    const costOfUsedMaterial = costPerUnit * qnt;

    console.log('\n💰 COST CALCULATION:');
    console.log('  - Per-unit cost (from available.cost):', costPerUnit);
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

    // Prepare used material clone (include section/miniSection IDs)
    const usedClone: MaterialSubdoc = {
      name: available.name,
      unit: available.unit,
      specs: available.specs || {},
      qnt: qnt,
      cost: costOfUsedMaterial, // ✅ Use calculated cost for the specific quantity
      sectionId: String(sectionId),
      miniSectionId:
        miniSectionId ||
        (available as unknown as { miniSectionId?: string }).miniSectionId ||
        undefined,
    };

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
        arrayFilters: [{ "elem._id": new ObjectId(materialId) }],
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
