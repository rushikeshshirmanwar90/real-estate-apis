import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { MiniSection } from "@/lib/models/MiniSection";
import { Section } from "@/lib/models/Section";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { notifyMaterialActivityCreated } from "@/lib/services/notificationService";

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

type MaterialUsage = {
  materialId: string;
  quantity: number;
};

type UserInfo = {
  userId: string;
  fullName: string;
};

export const GET = async (req: NextRequest | Request) => {
  return NextResponse.json(
    {
      success: false,
      error: "GET method not supported for batch material usage. Use POST instead.",
    },
    { status: 405 }
  );
};

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();
    const body = await req.json();
    const { projectId, materialUsages, miniSectionId, sectionId, clientId, user } = body;

    console.log('\n========================================');
    console.log('📝 BATCH MATERIAL USAGE API - REQUEST RECEIVED');
    console.log('========================================');
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('========================================\n');

    // Validation
    if (!projectId || !Array.isArray(materialUsages) || materialUsages.length === 0 || !sectionId) {
      console.error('❌ Validation failed:', {
        projectId: !!projectId,
        materialUsages: Array.isArray(materialUsages) ? materialUsages.length : 'not array',
        sectionId: !!sectionId
      });
      return NextResponse.json(
        {
          success: false,
          error: "projectId, sectionId and materialUsages array are required",
        },
        { status: 400 }
      );
    }

    // Validate clientId for activity logging
    if (!clientId) {
      console.error('❌ clientId is required for activity logging');
      return NextResponse.json(
        {
          success: false,
          error: "clientId is required for activity logging",
        },
        { status: 400 }
      );
    }

    // Validate user info for activity logging
    if (!user || !user.userId || !user.fullName) {
      console.error('❌ User info validation failed:', user);
      return NextResponse.json(
        {
          success: false,
          error: "user object with userId and fullName is required for activity logging",
        },
        { status: 400 }
      );
    }

    // Validate each material usage
    for (const usage of materialUsages) {
      if (!usage.materialId || typeof usage.quantity !== "number" || usage.quantity <= 0) {
        console.error('❌ Material usage validation failed:', usage);
        return NextResponse.json(
          {
            success: false,
            error: "Each material usage must have materialId and positive quantity",
          },
          { status: 400 }
        );
      }
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
    console.log('Available materials count:', project.MaterialAvailable?.length || 0);

    const usedMaterials: MaterialSubdoc[] = [];
    const materialUpdates: Array<{ materialId: string; quantity: number }> = [];
    let totalCostOfUsedMaterials = 0;

    // Process each material usage
    for (const usage of materialUsages) {
      const { materialId, quantity } = usage;

      console.log(`\n🔍 Processing material: ${materialId}, quantity: ${quantity}`);

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
            
            console.log(`   Material ${(m as any).name}: ID match=${sameId}, Section match=${sameSection}`);
            return sameId && sameSection;
          } catch (error) {
            console.error('   Error matching material:', error);
            return false;
          }
        }
      );

      if (availIndex == null || availIndex < 0) {
        console.error(`❌ Material not found: ${materialId}`);
        console.log('Available materials:');
        project.MaterialAvailable?.forEach((m: any, idx: number) => {
          console.log(`  ${idx}: ${m.name} (ID: ${m._id}, Section: ${m.sectionId || 'none'})`);
        });
        
        return NextResponse.json(
          {
            success: false,
            error: `Material with ID ${materialId} not found in MaterialAvailable`,
          },
          { status: 404 }
        );
      }

      const available = project.MaterialAvailable![availIndex] as MaterialSubdoc;
      
      // ✅ FIXED: Robust cost calculation with validation and fallbacks
      let perUnitCost = 0;
      
      // Try to get per-unit cost from various possible fields
      if (available.perUnitCost !== undefined && available.perUnitCost !== null && !isNaN(Number(available.perUnitCost))) {
        perUnitCost = Number(available.perUnitCost);
      } else if ((available as any).cost !== undefined && (available as any).cost !== null && !isNaN(Number((available as any).cost))) {
        // Fallback to legacy 'cost' field
        perUnitCost = Number((available as any).cost);
      } else {
        // Default to 0 if no valid cost found
        perUnitCost = 0;
        console.warn(`⚠️ No valid cost found for material ${available.name}, using 0`);
      }
      
      // Ensure perUnitCost is a valid number
      if (isNaN(perUnitCost) || !isFinite(perUnitCost)) {
        perUnitCost = 0;
        console.warn(`⚠️ Invalid perUnitCost for material ${available.name}, using 0`);
      }
      
      const totalCostForUsage = perUnitCost * quantity;
      
      // Validate the calculated total cost
      if (isNaN(totalCostForUsage) || !isFinite(totalCostForUsage)) {
        console.error(`❌ Invalid total cost calculation for ${available.name}: ${perUnitCost} * ${quantity} = ${totalCostForUsage}`);
        return NextResponse.json(
          {
            success: false,
            error: `Invalid cost calculation for material ${available.name}. Please check material cost data.`,
          },
          { status: 400 }
        );
      }

      console.log(`✅ Material found: ${available.name}`);
      console.log(`💰 Cost calculation:`);
      console.log(`  - Raw perUnitCost field: ${available.perUnitCost} (type: ${typeof available.perUnitCost})`);
      console.log(`  - Raw cost field (legacy): ${(available as any).cost} (type: ${typeof (available as any).cost})`);
      console.log(`  - Calculated per-unit cost: ${perUnitCost}`);
      console.log(`  - Quantity being used: ${quantity}`);
      console.log(`  - Total cost for quantity used: ${totalCostForUsage}`);
      console.log(`  - Available quantity: ${Number(available.qnt || 0)}`);

      // Check sufficient quantity
      if (Number(available.qnt || 0) < quantity) {
        console.error(`❌ Insufficient quantity for ${available.name}`);
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient quantity available for ${available.name}. Available: ${Number(
              available.qnt || 0
            )}, Requested: ${quantity}`,
          },
          { status: 400 }
        );
      }

      // Prepare used material clone with validated cost values
      const usedClone: MaterialSubdoc = {
        name: available.name,
        unit: available.unit,
        specs: available.specs || {},
        qnt: quantity,
        perUnitCost: perUnitCost, // Already validated above
        totalCost: totalCostForUsage, // Already validated above
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

      usedMaterials.push(usedClone);
      materialUpdates.push({ materialId, quantity });
      
      // Validate before adding to total cost
      if (isNaN(totalCostForUsage) || !isFinite(totalCostForUsage)) {
        console.error(`❌ Invalid cost to add to total: ${totalCostForUsage}`);
        return NextResponse.json(
          {
            success: false,
            error: `Invalid cost calculation for material ${available.name}`,
          },
          { status: 400 }
        );
      }
      
      totalCostOfUsedMaterials += totalCostForUsage;
    }

    console.log(`\n📊 Processing summary:`);
    console.log(`  - Materials to process: ${usedMaterials.length}`);
    console.log(`  - Total cost: ${totalCostOfUsedMaterials}`);

    // Final validation before database operations
    if (isNaN(totalCostOfUsedMaterials) || !isFinite(totalCostOfUsedMaterials)) {
      console.error(`❌ Invalid total cost before database operations: ${totalCostOfUsedMaterials}`);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid total cost calculation. Cannot proceed with material usage.",
        },
        { status: 400 }
      );
    }

    // Validate all used materials have valid cost values
    for (const material of usedMaterials) {
      if (isNaN(material.perUnitCost) || isNaN(material.totalCost) || 
          !isFinite(material.perUnitCost) || !isFinite(material.totalCost)) {
        console.error(`❌ Invalid cost values in material ${material.name}:`, {
          perUnitCost: material.perUnitCost,
          totalCost: material.totalCost
        });
        return NextResponse.json(
          {
            success: false,
            error: `Invalid cost values for material ${material.name}. Cannot save to database.`,
          },
          { status: 400 }
        );
      }
    }

    // Perform batch updates
    const bulkOperations: any[] = [];

    // Update available quantities
    for (const update of materialUpdates) {
      bulkOperations.push({
        updateOne: {
          filter: { _id: new Types.ObjectId(projectId) },
          update: {
            $inc: {
              "MaterialAvailable.$[elem].qnt": -update.quantity,
            },
          },
          arrayFilters: [{ "elem._id": new Types.ObjectId(update.materialId) }],
        },
      });
    }

    // Add used materials
    bulkOperations.push({
      updateOne: {
        filter: { _id: new Types.ObjectId(projectId) },
        update: {
          $push: {
            MaterialUsed: { $each: usedMaterials },
          },
        },
      },
    });

    console.log(`\n🔄 Executing ${bulkOperations.length} database operations...`);

    // Execute bulk operations
    await Projects.bulkWrite(bulkOperations);

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

    console.log(`\n✅ BATCH MATERIAL USAGE COMPLETED:`);
    console.log(`  - Materials processed: ${usedMaterials.length}`);
    console.log(`  - Total cost of used materials: ${totalCostOfUsedMaterials}`);
    console.log(`  - Mini-section: ${miniSectionId}`);
    console.log(`  - Remaining available materials: ${cleanedProject?.MaterialAvailable?.length || 0}`);
    console.log(`  - Total used materials: ${cleanedProject?.MaterialUsed?.length || 0}`);

    // 🎯 LOG MATERIAL ACTIVITY FOR NOTIFICATION PAGE
    console.log(`\n📝 LOGGING MATERIAL ACTIVITY...`);
    console.log('========================================');
    console.log('🔍 MATERIAL ACTIVITY LOGGING DEBUG');
    console.log('========================================');
    
    try {
      // ✅ NEW: Fetch section and mini-section names from database
      let sectionName = '';
      let miniSectionName = '';
      let projectName = '';
      
      console.log('🔍 Fetching section and mini-section names...');
      console.log(`  - Mini-section ID: ${miniSectionId}`);
      console.log(`  - Section ID: ${sectionId}`);
      console.log(`  - Project ID: ${projectId}`);
      
      // Get project name
      try {
        const projectDoc = await Projects.findById(projectId).select('name');
        if (projectDoc) {
          projectName = projectDoc.name;
          console.log(`  - Project name: ${projectName}`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch project name:', error);
      }
      
      // Get mini-section name if miniSectionId is provided
      if (miniSectionId) {
        try {
          const miniSectionDoc = await MiniSection.findById(miniSectionId).select('name sectionId');
          if (miniSectionDoc) {
            miniSectionName = miniSectionDoc.name;
            console.log(`  - Mini-section name: ${miniSectionName}`);
            
            // If we don't have sectionId but mini-section has it, use it
            if (!sectionId && miniSectionDoc.sectionId) {
              sectionId = miniSectionDoc.sectionId;
              console.log(`  - Section ID from mini-section: ${sectionId}`);
            }
          } else {
            console.warn(`⚠️ Mini-section not found for ID: ${miniSectionId}`);
          }
        } catch (error) {
          console.error('❌ Error fetching mini-section:', error);
        }
      }
      
      // Get section name if sectionId is provided
      if (sectionId) {
        try {
          const sectionDoc = await Section.findById(sectionId).select('name');
          if (sectionDoc) {
            sectionName = sectionDoc.name;
            console.log(`  - Section name: ${sectionName}`);
          } else {
            console.warn(`⚠️ Section not found for ID: ${sectionId}`);
          }
        } catch (error) {
          console.error('❌ Error fetching section:', error);
        }
      }
      
      console.log('✅ Names fetched successfully:');
      console.log(`  - Project: ${projectName || 'Not found'}`);
      console.log(`  - Section: ${sectionName || 'Not found'}`);
      console.log(`  - Mini-section: ${miniSectionName || 'Not found'}`);
      
      // Prepare materials for activity logging (match MaterialActivity schema)
      const activityMaterials = usedMaterials.map(material => ({
        name: material.name,
        unit: material.unit,
        specs: material.specs || {},
        qnt: material.qnt,
        perUnitCost: material.perUnitCost,
        totalCost: material.totalCost,
        addedAt: new Date()
      }));

      console.log('📦 ACTIVITY MATERIALS PREPARED:');
      console.log(JSON.stringify(activityMaterials, null, 2));

      // ✅ ENHANCED: Create better activity message with actual names
      let activityMessage = '';
      if (miniSectionName) {
        activityMessage = `Used ${usedMaterials.length} material${usedMaterials.length > 1 ? 's' : ''} in ${miniSectionName}${totalCostOfUsedMaterials > 0 ? ` (₹${totalCostOfUsedMaterials.toLocaleString('en-IN')})` : ''}`;
      } else if (sectionName) {
        activityMessage = `Used ${usedMaterials.length} material${usedMaterials.length > 1 ? 's' : ''} in ${sectionName}${totalCostOfUsedMaterials > 0 ? ` (₹${totalCostOfUsedMaterials.toLocaleString('en-IN')})` : ''}`;
      } else {
        activityMessage = `Used ${usedMaterials.length} material${usedMaterials.length > 1 ? 's' : ''} in mini-section${totalCostOfUsedMaterials > 0 ? ` (₹${totalCostOfUsedMaterials.toLocaleString('en-IN')})` : ''}`;
      }

      // ✅ ENHANCED: Create activity log entry with proper section names
      const materialActivityPayload = {
        user: {
          userId: user.userId,
          fullName: user.fullName
        },
        clientId: clientId,
        projectId: projectId,
        projectName: projectName || undefined, // Only include if we have it
        sectionName: sectionName || undefined, // Only include if we have it
        miniSectionName: miniSectionName || undefined, // Only include if we have it
        materials: activityMaterials,
        message: activityMessage,
        activity: "used",
        date: new Date().toISOString()
      };

      console.log('📋 ENHANCED MATERIAL ACTIVITY PAYLOAD:');
      console.log(JSON.stringify(materialActivityPayload, null, 2));

      const materialActivity = new MaterialActivity(materialActivityPayload);

      console.log('💾 SAVING MATERIAL ACTIVITY TO DATABASE...');
      const savedActivity = await materialActivity.save();
      
      console.log(`✅ MATERIAL ACTIVITY SAVED SUCCESSFULLY!`);

      // Send notification to project admins (async, don't wait for it)
      notifyMaterialActivityCreated(savedActivity)
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

      console.log(`========================================`);
      console.log(`📊 SAVED ACTIVITY DETAILS:`);
      console.log(`  - Activity ID: ${savedActivity._id}`);
      console.log(`  - User: ${savedActivity.user.fullName} (${savedActivity.user.userId})`);
      console.log(`  - Client ID: ${savedActivity.clientId}`);
      console.log(`  - Project ID: ${savedActivity.projectId}`);
      console.log(`  - Project Name: ${savedActivity.projectName || 'Not set'}`);
      console.log(`  - Section Name: ${savedActivity.sectionName || 'Not set'}`);
      console.log(`  - Mini-Section Name: ${savedActivity.miniSectionName || 'Not set'}`);
      console.log(`  - Materials count: ${savedActivity.materials.length}`);
      console.log(`  - Activity type: ${savedActivity.activity}`);
      console.log(`  - Date: ${savedActivity.date}`);
      console.log(`  - Message: ${savedActivity.message}`);
      console.log(`  - Total cost: ₹${totalCostOfUsedMaterials.toLocaleString('en-IN')}`);
      console.log(`========================================`);

      // 🔍 VERIFY THE ACTIVITY WAS SAVED BY QUERYING IT BACK
      console.log(`\n🔍 VERIFYING ACTIVITY WAS SAVED...`);
      try {
        const verifyActivity = await MaterialActivity.findById(savedActivity._id);
        if (verifyActivity) {
          console.log(`✅ VERIFICATION SUCCESS: Activity found in database`);
          console.log(`  - Verified ID: ${verifyActivity._id}`);
          console.log(`  - Verified Activity: ${verifyActivity.activity}`);
          console.log(`  - Verified Materials: ${verifyActivity.materials.length}`);
          console.log(`  - Verified Client ID: ${verifyActivity.clientId}`);
        } else {
          console.log(`❌ VERIFICATION FAILED: Activity not found in database!`);
        }
      } catch (verifyError) {
        console.error(`❌ VERIFICATION ERROR:`, verifyError);
      }

      // 🔍 CHECK TOTAL COUNT OF MATERIAL ACTIVITIES FOR THIS CLIENT
      console.log(`\n📊 CHECKING TOTAL MATERIAL ACTIVITIES FOR CLIENT...`);
      try {
        const totalCount = await MaterialActivity.countDocuments({ clientId: clientId });
        const usedCount = await MaterialActivity.countDocuments({ clientId: clientId, activity: 'used' });
        console.log(`✅ TOTAL MATERIAL ACTIVITIES FOR CLIENT: ${totalCount}`);
        console.log(`✅ TOTAL "USED" ACTIVITIES FOR CLIENT: ${usedCount}`);
      } catch (countError) {
        console.error(`❌ COUNT ERROR:`, countError);
      }
      
    } catch (activityError) {
      console.error('❌ FAILED TO LOG MATERIAL ACTIVITY:');
      console.error('========================================');
      
      if (activityError instanceof Error) {
        console.error('Error message:', activityError.message);
        console.error('Error stack:', activityError.stack);
      } else {
        console.error('Unknown error type:', activityError);
      }
      
      console.error('Error details:', JSON.stringify(activityError, null, 2));
      console.error('========================================');
      // Don't fail the main operation if activity logging fails
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${usedMaterials.length} materials to used materials`,
        data: {
          projectId: cleanedProject?._id,
          sectionId: sectionId,
          miniSectionId: miniSectionId,
          materialAvailable: cleanedProject?.MaterialAvailable,
          materialUsed: cleanedProject?.MaterialUsed,
          usedMaterials: usedMaterials,
          totalCostOfUsedMaterials: totalCostOfUsedMaterials,
          spent: cleanedProject?.spent,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in batch-material-usage:", msg);
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