import connect from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { NextRequest } from "next/server";
import { MaterialActivity as ImportedMaterials } from "@/lib/models/Xsite/materials-activity";
import { MiniSection as Section } from "@/lib/models/Xsite/mini-section";

export const POST = async (req: NextRequest | Request) => {
  try {
    const { requestId, materials } = await req.json();

    // Validate requestId
    if (!requestId) {
      return errorResponse("requestId is required", 400);
    }

    await connect();

    // Find the requested material
    const findRequestMaterial = await ImportedMaterials.findById(requestId);

    const sectionId = findRequestMaterial?.sectionId;

    if (!findRequestMaterial) {
      return errorResponse("Material request not found", 404);
    }

    // Check if request is approved
    if (findRequestMaterial.status === "pending") {
      return errorResponse("Request is not approved yet", 400);
    }

    // Check if already imported
    if (findRequestMaterial.status === "imported") {
      return errorResponse("Material request already imported", 409);
    }

    // ✅ ZERO-TOLERANCE PRICE POLICY FOR IMPORT ROUTE
    // Apply same merge logic as main material route to prevent price conflicts
    
    console.log('\n🔒 IMPORT ROUTE - ZERO-TOLERANCE PRICE POLICY ACTIVE');
    console.log('=====================================================');
    console.log('Applying same merge rules as main material route:');
    console.log('  ✓ Same name, unit, specs, AND exact same price = MERGE');
    console.log('  ✗ Any price difference = CREATE SEPARATE ENTRY');
    console.log('');

    // Get current section materials
    const currentSection = await Section.findById(sectionId);
    if (!currentSection) {
      return errorResponse("Section not found", 404);
    }

    const existingMaterials = currentSection.MaterialAvailable || [];
    const materialsToAdd = [];
    const materialsToMerge = [];

    // Process each material with zero-tolerance price policy
    for (const material of materials) {
      const materialName = material.name;
      const unit = material.unit;
      const specs = material.specs || {};
      const qnt = Number(material.qnt || 0);
      const perUnitCost = Number(material.perUnitCost || material.cost || 0);
      const totalCost = Number(material.totalCost || (perUnitCost * qnt) || 0);

      console.log(`\n🔍 Processing: ${materialName} (${qnt} ${unit} @ ₹${perUnitCost})`);

      // Find exact match: name + unit + specs + price must ALL be identical
      let exactMatchIndex = -1;
      
      for (let i = 0; i < existingMaterials.length; i++) {
        const existing = existingMaterials[i];
        
        const nameMatch = existing.name === materialName;
        const unitMatch = existing.unit === unit;
        const specsMatch = JSON.stringify(existing.specs || {}) === JSON.stringify(specs);
        const priceMatch = Number(existing.perUnitCost || 0) === Number(perUnitCost);
        
        console.log(`  Existing Material ${i + 1}: ${existing.name}`);
        console.log(`    Name: ${nameMatch}, Unit: ${unitMatch}, Specs: ${specsMatch}, Price: ${priceMatch}`);
        
        if (nameMatch && unitMatch && specsMatch && priceMatch) {
          console.log(`🎯 PERFECT MATCH - Will merge`);
          exactMatchIndex = i;
          break;
        } else if (nameMatch && unitMatch && specsMatch && !priceMatch) {
          console.log(`🚫 PRICE MISMATCH: ₹${existing.perUnitCost} ≠ ₹${perUnitCost} - Will create separate`);
        }
      }

      if (exactMatchIndex >= 0) {
        // Merge with existing material
        materialsToMerge.push({
          index: exactMatchIndex,
          additionalQnt: qnt,
          additionalTotalCost: totalCost
        });
        console.log(`  ✅ MERGE: Adding ${qnt} to existing material`);
      } else {
        // Create new material entry
        materialsToAdd.push({
          name: materialName,
          unit,
          specs,
          qnt,
          perUnitCost,
          totalCost,
          addedAt: new Date()
        });
        console.log(`  📦 CREATE: New separate entry`);
      }
    }

    // Execute merges first
    for (const merge of materialsToMerge) {
      const existing = existingMaterials[merge.index];
      existing.qnt = (existing.qnt || 0) + merge.additionalQnt;
      existing.totalCost = (existing.totalCost || 0) + merge.additionalTotalCost;
      console.log(`  ✅ Merged: ${existing.name} now has ${existing.qnt} ${existing.unit}`);
    }

    // Add new materials
    const finalMaterialsArray = [...existingMaterials, ...materialsToAdd];

    console.log(`\n📊 IMPORT SUMMARY:`);
    console.log(`  - Materials to merge: ${materialsToMerge.length}`);
    console.log(`  - New materials to add: ${materialsToAdd.length}`);
    console.log(`  - Final materials count: ${finalMaterialsArray.length}`);
    console.log('=====================================================\n');

    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      {
        $set: {
          MaterialAvailable: finalMaterialsArray
        }
      },
      { new: true, runValidators: true }
    );

    // Check if any update failed
    if (!updatedSection) {
      return errorResponse("Failed to update materials in all locations", 500);
    }

    // Update material request status
    const updateMaterialRequest = await ImportedMaterials.findByIdAndUpdate(
      requestId,
      {
        status: "imported",
      },
      { new: true, runValidators: true }
    );

    if (!updateMaterialRequest) {
      return errorResponse("Failed to update material request status", 500);
    }

    // Return success response
    return successResponse(
      findRequestMaterial,
      "material imported successfully",
      200
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/import-material:", error);

    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }

    return errorResponse("Unknown error occurred", 500);
  }
};