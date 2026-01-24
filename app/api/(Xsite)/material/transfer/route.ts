import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { checkValidClient } from "@/lib/auth";

type Specs = Record<string, unknown>;

type MaterialSubdoc = {
  _id?: Types.ObjectId | string;
  name: string;
  unit: string;
  specs?: Specs;
  qnt: number;
  perUnitCost: number;
  totalCost: number;
};

// POST: Transfer material from one project to another
export const POST = async (req: NextRequest | Request) => {
  await checkValidClient(req);

  try {
    await connect();
    
    const body = await req.json();
    const {
      fromProjectId,
      toProjectId,
      materialName,
      unit,
      variantId,
      quantity,
      specs = {},
      clientId
    } = body;

    console.log('\n========================================');
    console.log('MATERIAL TRANSFER REQUEST');
    console.log('========================================');
    console.log('From Project:', fromProjectId);
    console.log('To Project:', toProjectId);
    console.log('Material:', materialName);
    console.log('Unit:', unit);
    console.log('Variant ID:', variantId);
    console.log('Quantity:', quantity);
    console.log('Specs:', specs);
    console.log('Client ID:', clientId);
    console.log('========================================\n');

    // Validation
    if (!fromProjectId || !toProjectId || !materialName || !unit || !variantId || !quantity || !clientId) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required: fromProjectId, toProjectId, materialName, unit, variantId, quantity, clientId",
        },
        { status: 400 }
      );
    }

    if (fromProjectId === toProjectId) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot transfer material to the same project",
        },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be greater than 0",
        },
        { status: 400 }
      );
    }

    // Find both projects
    const [fromProject, toProject] = await Promise.all([
      Projects.findOne({ _id: new Types.ObjectId(fromProjectId), clientId: new Types.ObjectId(clientId) }),
      Projects.findOne({ _id: new Types.ObjectId(toProjectId), clientId: new Types.ObjectId(clientId) })
    ]);

    if (!fromProject) {
      return NextResponse.json(
        {
          success: false,
          message: "Source project not found",
        },
        { status: 404 }
      );
    }

    if (!toProject) {
      return NextResponse.json(
        {
          success: false,
          message: "Target project not found",
        },
        { status: 404 }
      );
    }

    // Find the material variant in the source project
    const materialIndex = fromProject.MaterialAvailable?.findIndex((m: MaterialSubdoc) => 
      String(m._id) === variantId
    );

    if (materialIndex === -1 || materialIndex === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Material variant not found in source project",
        },
        { status: 404 }
      );
    }

    const sourceMaterial = fromProject.MaterialAvailable[materialIndex] as MaterialSubdoc;

    // Check if enough quantity is available
    if (sourceMaterial.qnt < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient quantity. Available: ${sourceMaterial.qnt} ${unit}, Requested: ${quantity} ${unit}`,
        },
        { status: 400 }
      );
    }

    // Calculate costs
    const perUnitCost = sourceMaterial.perUnitCost || 0;
    const transferCost = perUnitCost * quantity;

    console.log('\n💰 TRANSFER COST CALCULATION:');
    console.log('  - Per-unit cost:', perUnitCost);
    console.log('  - Transfer quantity:', quantity);
    console.log('  - Transfer cost:', transferCost);

    // Start transaction-like operations
    try {
      // 1. Update source project - reduce quantity or remove material
      if (sourceMaterial.qnt === quantity) {
        // Remove the material completely
        fromProject.MaterialAvailable.splice(materialIndex, 1);
        console.log('  - Removing material completely from source project');
      } else {
        // Reduce quantity and total cost
        const newQuantity = sourceMaterial.qnt - quantity;
        const newTotalCost = sourceMaterial.totalCost - transferCost;
        
        fromProject.MaterialAvailable[materialIndex].qnt = newQuantity;
        fromProject.MaterialAvailable[materialIndex].totalCost = newTotalCost;
        
        console.log('  - Reducing quantity in source project:', newQuantity);
        console.log('  - New total cost in source project:', newTotalCost);
      }

      // Reduce spent amount from source project
      fromProject.spent = (fromProject.spent || 0) - transferCost;

      // 2. Update target project - add material or merge with existing
      toProject.MaterialAvailable = toProject.MaterialAvailable || [];
      
      // ✅ ZERO-TOLERANCE PRICE POLICY: Check if same material exists with EXACT same price
      // Materials merge ONLY if name, unit, specs, AND price are identical
      const existingIndex = toProject.MaterialAvailable.findIndex((m: MaterialSubdoc) => {
        try {
          const nameMatch = m.name === materialName;
          const unitMatch = m.unit === unit;
          const specsMatch = JSON.stringify(m.specs || {}) === JSON.stringify(specs);
          const priceMatch = Number(m.perUnitCost || 0) === Number(perUnitCost);
          
          console.log('  🔍 Transfer Merge Check:');
          console.log('    - Name match:', nameMatch, `(${m.name} vs ${materialName})`);
          console.log('    - Unit match:', unitMatch, `(${m.unit} vs ${unit})`);
          console.log('    - Specs match:', specsMatch);
          console.log('    - Price match:', priceMatch, `(₹${m.perUnitCost} vs ₹${perUnitCost})`);
          
          // ALL criteria must match for merging (including price)
          const perfectMatch = nameMatch && unitMatch && specsMatch && priceMatch;
          
          if (nameMatch && unitMatch && specsMatch && !priceMatch) {
            console.log('    🚫 PRICE MISMATCH: Same material with different price found');
            console.log('    📦 Will create separate entry to maintain price separation');
          }
          
          return perfectMatch;
        } catch {
          return false;
        }
      });

      if (existingIndex >= 0) {
        // ✅ MERGE WITH IDENTICAL MATERIAL (same price, so no averaging needed)
        const existing = toProject.MaterialAvailable[existingIndex] as MaterialSubdoc;
        const oldQnt = existing.qnt || 0;
        const oldTotalCost = existing.totalCost || 0;
        const newQnt = oldQnt + quantity;
        const newTotalCost = oldTotalCost + transferCost;
        // Keep the same per-unit cost (since prices are identical)
        const samePerUnitCost = existing.perUnitCost || 0;

        existing.qnt = newQnt;
        existing.perUnitCost = samePerUnitCost; // No price averaging - prices are identical
        existing.totalCost = newTotalCost;

        console.log('  ✅ Merging with identical material in target project');
        console.log('    - New quantity in target:', newQnt);
        console.log('    - Keeping same per-unit cost:', samePerUnitCost, '(no averaging needed)');
        console.log('    - New total cost:', newTotalCost);
      } else {
        // Add as new material
        const newMaterial: MaterialSubdoc = {
          _id: new Types.ObjectId(),
          name: materialName,
          unit,
          specs: specs || {},
          qnt: quantity,
          perUnitCost,
          totalCost: transferCost,
        };

        toProject.MaterialAvailable.push(newMaterial);
        console.log('  - Adding as new material to target project');
      }

      // Add spent amount to target project
      toProject.spent = (toProject.spent || 0) + transferCost;

      // 3. Save both projects
      await Promise.all([
        fromProject.save(),
        toProject.save()
      ]);

      console.log('✅ Material transfer completed successfully');

      return NextResponse.json(
        {
          success: true,
          message: `Successfully transferred ${quantity} ${unit} of ${materialName} from ${fromProject.name || 'source project'} to ${toProject.name || 'target project'}`,
          transfer: {
            fromProject: fromProject.name || fromProjectId,
            toProject: toProject.name || toProjectId,
            material: materialName,
            quantity,
            unit,
            transferCost,
            perUnitCost
          }
        },
        { status: 200 }
      );

    } catch (saveError) {
      console.error('❌ Error saving projects during transfer:', saveError);
      throw saveError;
    }

  } catch (error: unknown) {
    console.error('❌ Material Transfer Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to transfer material",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};