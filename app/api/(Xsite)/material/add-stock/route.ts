import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { checkValidClient } from "@/lib/auth";
import { client } from "@/lib/redis";
import { notifyMaterialActivityCreated } from "@/lib/services/notificationService";
 
export async function POST(request: NextRequest) {
    try {
        // Validate client authentication
        await checkValidClient(request);
        
        await connect();

        const body = await request.json();
        const { materialId, quantity, perUnitCost, clientId } = body;

        console.log('\n========================================');
        console.log('📦 ADD STOCK REQUEST');
        console.log('========================================');
        console.log('Material ID:', materialId);
        console.log('Quantity:', quantity);
        console.log('Per Unit Cost:', perUnitCost);
        console.log('Client ID:', clientId);
        console.log('========================================\n');

        // Validation
        if (!materialId) {
            return NextResponse.json(
                { success: false, error: 'Material ID is required' },
                { status: 400 }
            );
        }

        if (!Types.ObjectId.isValid(materialId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid material ID format' },
                { status: 400 }
            );
        }

        if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
            return NextResponse.json(
                { success: false, error: 'Valid quantity is required (must be a positive number)' },
                { status: 400 }
            );
        }

        if (!clientId) {
            return NextResponse.json(
                { success: false, error: 'Client ID is required' },
                { status: 400 }
            );
        }

        if (!Types.ObjectId.isValid(clientId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid client ID format' },
                { status: 400 }
            );
        }

        // Validate perUnitCost if provided
        if (perUnitCost !== undefined && perUnitCost !== null) {
            if (typeof perUnitCost !== 'number' || perUnitCost < 0) {
                return NextResponse.json(
                    { success: false, error: 'Per unit cost must be a non-negative number' },
                    { status: 400 }
                );
            }
        }

        // Find the project containing this material
        const project = await Projects.findOne({
            'MaterialAvailable._id': new Types.ObjectId(materialId),
            clientId: new Types.ObjectId(clientId)
        });

        if (!project) {
            return NextResponse.json(
                { success: false, error: 'Material not found or you do not have permission to modify it' },
                { status: 404 }
            );
        }

        // Find the specific material in the array
        const materialIndex = project.MaterialAvailable.findIndex(
            (m: any) => String(m._id) === materialId
        );

        if (materialIndex === -1) {
            return NextResponse.json(
                { success: false, error: 'Material not found in project' },
                { status: 404 }
            );
        }

        const material = project.MaterialAvailable[materialIndex];

        // Store old values for logging
        const oldQuantity = Number(material.qnt) || 0;
        const oldTotalCost = Number(material.totalCost) || 0;
        const oldPerUnitCost = Number(material.perUnitCost) || 0;

        console.log('\n📊 EXISTING MATERIAL:');
        console.log('Quantity:', oldQuantity);
        console.log('Per Unit Cost:', oldPerUnitCost);
        console.log('Total Cost:', oldTotalCost);
        console.log('Name:', material.name);
        console.log('Unit:', material.unit);
        console.log('Specs:', JSON.stringify(material.specs));

        let addedCost = 0;
        let updatedMaterial: any;
        let action: 'merged' | 'created' = 'merged';

        // Check if per unit cost is different
        const hasNewCost = perUnitCost !== undefined && perUnitCost !== null && perUnitCost >= 0;
        const isDifferentCost = hasNewCost && Math.abs(perUnitCost - oldPerUnitCost) > 0.01; // Allow small floating point differences

        if (isDifferentCost) {
            // ✅ CREATE NEW MATERIAL ENTRY with different cost
            console.log('\n🆕 CREATING NEW MATERIAL ENTRY (Different Cost)');
            console.log('Old Per Unit Cost:', oldPerUnitCost);
            console.log('New Per Unit Cost:', perUnitCost);
            console.log('Cost Difference:', Math.abs(perUnitCost - oldPerUnitCost));

            const newTotalCost = quantity * perUnitCost;
            addedCost = newTotalCost;

            const newMaterial = {
                _id: new Types.ObjectId(),
                name: material.name,
                unit: material.unit,
                specs: material.specs || {},
                qnt: quantity,
                perUnitCost: perUnitCost,
                totalCost: newTotalCost,
                sectionId: material.sectionId,
                createdAt: new Date(),
            };

            console.log('\n📦 NEW MATERIAL TO ADD:');
            console.log(JSON.stringify(newMaterial, null, 2));

            // Use findByIdAndUpdate with $push to add new material
            const updatedProject = await Projects.findByIdAndUpdate(
                project._id,
                {
                    $push: { MaterialAvailable: newMaterial },
                    $inc: { spent: addedCost }
                },
                { new: true }
            );

            if (!updatedProject) {
                throw new Error('Failed to create new material entry');
            }

            // Find the newly created material in the updated project
            updatedMaterial = updatedProject.MaterialAvailable.find(
                (m: any) => String(m._id) === String(newMaterial._id)
            );

            if (!updatedMaterial) {
                throw new Error('New material entry not found after creation');
            }

            action = 'created';

            console.log('\n✅ NEW MATERIAL CREATED:');
            console.log('Material ID:', updatedMaterial._id);
            console.log('Quantity:', updatedMaterial.qnt);
            console.log('Per Unit Cost:', updatedMaterial.perUnitCost);
            console.log('Total Cost:', updatedMaterial.totalCost);

        } else {
            // ✅ MERGE WITH EXISTING MATERIAL (Same cost or no cost provided)
            console.log('\n🔄 MERGING WITH EXISTING MATERIAL (Same Cost)');
            
            const newQuantity = oldQuantity + quantity;
            const currentPerUnitCost = hasNewCost ? perUnitCost : oldPerUnitCost;
            addedCost = quantity * currentPerUnitCost;
            const newTotalCost = oldTotalCost + addedCost;

            // Update the material in the array using findOneAndUpdate
            const updatedProject = await Projects.findOneAndUpdate(
                {
                    _id: project._id,
                    'MaterialAvailable._id': new Types.ObjectId(materialId)
                },
                {
                    $set: {
                        'MaterialAvailable.$.qnt': newQuantity,
                        'MaterialAvailable.$.totalCost': newTotalCost,
                        ...(hasNewCost && { 'MaterialAvailable.$.perUnitCost': perUnitCost })
                    },
                    $inc: { spent: addedCost }
                },
                { new: true }
            );

            if (!updatedProject) {
                throw new Error('Failed to update material');
            }

            // Find the updated material
            updatedMaterial = updatedProject.MaterialAvailable.find(
                (m: any) => String(m._id) === materialId
            );

            if (!updatedMaterial) {
                throw new Error('Updated material not found');
            }

            console.log('\n✅ MATERIAL MERGED:');
            console.log('New Quantity:', updatedMaterial.qnt);
            console.log('Per Unit Cost:', updatedMaterial.perUnitCost);
            console.log('New Total Cost:', updatedMaterial.totalCost);
            console.log('Added Cost:', addedCost);
        }

        console.log('\n✅ Material updated successfully');
        console.log('Action:', action);
        console.log('========================================\n');

        // ✅ CREATE MATERIAL ACTIVITY ENTRY for notification system
        try {
            console.log('📝 Creating material activity entry...');
            
            // Get user info from request headers or body
            const userDetailsHeader = request.headers.get('x-user-details');
            let user = {
                userId: clientId,
                fullName: 'Unknown User'
            };

            if (userDetailsHeader) {
                try {
                    const userDetails = JSON.parse(userDetailsHeader);
                    user = {
                        userId: userDetails._id || userDetails.id || clientId,
                        fullName: userDetails.fullName || 
                                 (userDetails.firstName && userDetails.lastName 
                                     ? `${userDetails.firstName} ${userDetails.lastName}` 
                                     : userDetails.firstName || userDetails.lastName || userDetails.name || 'Unknown User')
                    };
                } catch (parseError) {
                    console.warn('⚠️ Failed to parse user details from header:', parseError);
                }
            }

            // Create material activity payload
            const materialActivityPayload = {
                clientId: String(clientId),
                projectId: String(project._id),
                projectName: project.name || 'Unknown Project',
                sectionName: material.sectionName || undefined,
                miniSectionName: material.miniSectionName || undefined,
                materials: [{
                    name: updatedMaterial.name,
                    unit: updatedMaterial.unit,
                    specs: updatedMaterial.specs || {},
                    qnt: quantity, // The quantity that was added
                    perUnitCost: updatedMaterial.perUnitCost || 0,
                    totalCost: addedCost, // The cost of the added quantity
                    cost: addedCost, // For backward compatibility
                    sectionId: updatedMaterial.sectionId || undefined,
                    miniSectionId: updatedMaterial.miniSectionId || undefined,
                    addedAt: new Date(),
                }],
                message: action === 'created' 
                    ? `Added ${quantity} ${updatedMaterial.unit} of ${updatedMaterial.name} as new entry at ₹${perUnitCost}/${updatedMaterial.unit}`
                    : `Added ${quantity} ${updatedMaterial.unit} to existing ${updatedMaterial.name} stock`,
                activity: 'imported' as const,
                date: new Date().toISOString(),
                user: user,
            };

            console.log('📦 Material Activity Payload:');
            console.log(JSON.stringify(materialActivityPayload, null, 2));

            const materialActivity = new MaterialActivity(materialActivityPayload);
            await materialActivity.save();

            console.log('✅ Material activity created successfully:', materialActivity._id);

            // Invalidate material activity cache
            const activityKeys = await client.keys(`materialActivity:*`);
            if (activityKeys.length > 0) {
                await Promise.all(activityKeys.map(key => client.del(key)));
                console.log(`🗑️ Invalidated ${activityKeys.length} material activity cache keys`);
            }

            // Send notification (async, don't wait for it)
            notifyMaterialActivityCreated(materialActivity)
                .then(result => {
                    if (result.success) {
                        console.log(`✅ Add stock notification completed: ${result.deliveredCount}/${result.recipientCount} delivered (${result.processingTimeMs}ms)`);
                    } else {
                        console.error(`❌ Add stock notification failed: ${result.errors.length} errors, ${result.failedCount} failed deliveries`);
                        result.errors.forEach(error => {
                            console.error(`   - ${error.type}: ${error.message}`);
                        });
                    }
                })
                .catch(notifError => {
                    console.error('⚠️ Notification error (non-critical):', notifError);
                });

        } catch (activityError) {
            console.error('⚠️ Failed to create material activity (non-critical):', activityError);
            // Don't fail the request if activity creation fails
        }

        // Invalidate cache for this project
        try {
            console.log('🔄 Invalidating cache...');
            const materialKeys = await client.keys(`material:${project._id}:*`);
            if (materialKeys.length > 0) {
                await Promise.all(materialKeys.map(key => client.del(key)));
                console.log(`🗑️ Invalidated ${materialKeys.length} material cache keys`);
            }
            
            // Invalidate project cache
            await client.del(`project:${project._id}`);
            const projectKeys = await client.keys(`projects:*`);
            if (projectKeys.length > 0) {
                await Promise.all(projectKeys.map(key => client.del(key)));
                console.log(`🗑️ Invalidated ${projectKeys.length} project cache keys`);
            }
            console.log('✅ Cache invalidated successfully');
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
            // Don't fail the request if cache invalidation fails
        }

        return NextResponse.json({
            success: true,
            message: action === 'created' 
                ? `Successfully created new material entry with ${quantity} ${updatedMaterial.unit} at ₹${perUnitCost}/${updatedMaterial.unit}`
                : `Successfully added ${quantity} ${updatedMaterial.unit} to existing stock`,
            action: action,
            data: {
                material: {
                    _id: updatedMaterial._id,
                    name: updatedMaterial.name,
                    unit: updatedMaterial.unit,
                    qnt: updatedMaterial.qnt,
                    perUnitCost: updatedMaterial.perUnitCost,
                    totalCost: updatedMaterial.totalCost,
                    specs: updatedMaterial.specs,
                },
                addedQuantity: quantity,
                addedCost: addedCost,
                newQuantity: updatedMaterial.qnt,
                oldQuantity: action === 'created' ? 0 : oldQuantity,
                projectId: project._id,
                projectName: project.name,
                isNewEntry: action === 'created',
            }
        });

    } catch (error: any) {
        console.error('\n========================================');
        console.error('❌ ERROR ADDING STOCK');
        console.error('========================================');
        console.error('Error Type:', error?.constructor?.name);
        console.error('Error Message:', error?.message);
        console.error('Error Stack:', error?.stack);
        console.error('========================================\n');
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to add stock',
                details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
            },
            { status: 500 }
        );
    }
}
