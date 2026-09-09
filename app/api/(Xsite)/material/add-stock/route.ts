import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import {
  safeRedisKeysCache,
  safeRedisDelCache
} from "@/lib/utils/redis-helpers";
import { notifyMaterialActivityCreated } from "@/lib/services/notificationService";
import {
  upsertCommitment,
  autoResolveCommitment,
  refreshCommitmentAmountIfActive,
} from "@/lib/services/paymentCommitmentService";

// Vendor bill photo uploaded via POST /api/material/bill-upload. Only the hosted
// URL travels with the material — never the image binary.
type BillImage = {
  url: string;
  publicId?: string;
  uploadedAt?: Date;
};

// Keeps only entries that carry a usable http(s) URL and drops duplicates, so a
// malformed client payload can never write junk bill records. Mirrors the same
// helper in material/route.ts.
const sanitizeBillImages = (
  raw: Array<{ url?: string; publicId?: string; uploadedAt?: string }> | null | undefined
): BillImage[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const cleaned: BillImage[] = [];

  for (const entry of raw) {
    const url = typeof entry?.url === "string" ? entry.url.trim() : "";
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);

    const uploadedAt = entry?.uploadedAt ? new Date(entry.uploadedAt) : undefined;
    cleaned.push({
      url,
      ...(entry?.publicId ? { publicId: String(entry.publicId) } : {}),
      uploadedAt:
        uploadedAt && !Number.isNaN(uploadedAt.getTime()) ? uploadedAt : new Date(),
    });
  }

  return cleaned;
};

// Union of two bill lists, first-seen URL wins (used when batches merge).
const mergeBillImages = (existing: BillImage[] = [], incoming: BillImage[] = []): BillImage[] => {
  const byUrl = new Map<string, BillImage>();
  for (const bill of [...existing, ...incoming]) {
    if (bill?.url && !byUrl.has(bill.url)) byUrl.set(bill.url, bill);
  }
  return Array.from(byUrl.values());
};

export async function POST(request: NextRequest) {
    try {
        await connect();

        const body = await request.json();
        const {
            materialId,
            quantity,
            perUnitCost,
            contractor_name,
            clientId,
            // No defaults — left undefined when the caller doesn't send payment info,
            // so the batch isn't falsely marked as "unpaid".
            paymentStatus,
            amountPaid,
            billingDate: rawBillingDate,
            billImages: rawBillImages,
            // Required when paymentStatus is 'partial'/'unpaid' — when the vendor
            // will be paid. Drives the payment-commitment reminder/overdue notifications.
            commitmentDate: rawCommitmentDate,
        } = body;

        console.log('\n========================================');
        console.log('📦 ADD STOCK REQUEST');
        console.log('========================================');
        console.log('Material ID:', materialId);
        console.log('Quantity:', quantity);
        console.log('Per Unit Cost:', perUnitCost);
        console.log('Contractor / Vendor:', contractor_name);
        console.log('Payment Status:', paymentStatus);
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

        const hasPaymentInfo = paymentStatus !== undefined || amountPaid !== undefined;

        // Optional vendor bill photos from the payment step.
        const billImages = sanitizeBillImages(rawBillImages);

        // Optional vendor bill date — only stored when the caller sent a valid date.
        let billingDate: Date | undefined;
        if (rawBillingDate) {
            const parsed = new Date(rawBillingDate);
            if (Number.isNaN(parsed.getTime())) {
                return NextResponse.json(
                    { success: false, error: 'billingDate must be a valid date' },
                    { status: 400 }
                );
            }
            billingDate = parsed;
        }

        // Commitment date — required whenever the vendor is left partially/unpaid
        // on this batch, so there's always a promise date for the reminder/overdue cron.
        let commitmentDate: Date | undefined;
        if (paymentStatus === 'partial' || paymentStatus === 'unpaid') {
            if (!rawCommitmentDate) {
                return NextResponse.json(
                    { success: false, error: 'commitmentDate is required when paymentStatus is partial or unpaid' },
                    { status: 400 }
                );
            }
            const parsedCommitment = new Date(rawCommitmentDate);
            if (Number.isNaN(parsedCommitment.getTime())) {
                return NextResponse.json(
                    { success: false, error: 'commitmentDate must be a valid date' },
                    { status: 400 }
                );
            }
            commitmentDate = parsedCommitment;
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
        let newEntryReason: 'cost' | 'vendor' | 'cost_and_vendor' | undefined = undefined;

        // Check if per unit cost is different
        const hasNewCost = perUnitCost !== undefined && perUnitCost !== null && perUnitCost >= 0;
        const isDifferentCost = hasNewCost && Math.abs(perUnitCost - oldPerUnitCost) > 0.01; // Allow small floating point differences

        // Check if vendor/contractor is different
        const incomingVendor = (contractor_name || '').trim().toLowerCase();
        const existingVendor = (material.contractor_name || '').trim().toLowerCase();
        const isDifferentVendor = incomingVendor !== '' && incomingVendor !== existingVendor;

        if (isDifferentCost || isDifferentVendor) {
            // ✅ CREATE NEW MATERIAL ENTRY with different cost and/or vendor
            if (isDifferentCost && isDifferentVendor) newEntryReason = 'cost_and_vendor';
            else if (isDifferentVendor) newEntryReason = 'vendor';
            else newEntryReason = 'cost';

            console.log('\n🆕 CREATING NEW MATERIAL ENTRY');
            console.log('Reason:', newEntryReason);
            console.log('Old Per Unit Cost:', oldPerUnitCost, '-> New Per Unit Cost:', perUnitCost);
            console.log('Old Vendor:', material.contractor_name, '-> New Vendor:', contractor_name);

            const effectiveCost = hasNewCost ? perUnitCost : oldPerUnitCost;
            const newTotalCost = quantity * effectiveCost;
            addedCost = newTotalCost;

            const newMaterial: any = {
                _id: new Types.ObjectId(),
                name: material.name,
                unit: material.unit,
                specs: material.specs || {},
                qnt: quantity,
                perUnitCost: effectiveCost,
                totalCost: newTotalCost,
                sectionId: material.sectionId,
                createdAt: new Date(),
                // Only record payment when the caller sent it; otherwise leave undefined.
                ...(hasPaymentInfo
                    ? {
                        paymentStatus: paymentStatus || 'unpaid',
                        amountPaid: Number(amountPaid) || 0,
                    }
                    : {}),
                ...(billingDate ? { billingDate } : {}),
                // Left undefined when no bill was uploaded, so the UI shows no bill section.
                ...(billImages.length > 0 ? { billImages } : {}),
            };

            // Set contractor_name if provided
            if (contractor_name && contractor_name.trim()) {
                newMaterial.contractor_name = contractor_name.trim();
            }

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

            // Track a payment commitment for this new batch when it's left partial/unpaid.
            if (newMaterial.paymentStatus === 'partial' || newMaterial.paymentStatus === 'unpaid') {
                try {
                    await upsertCommitment({
                        clientId: project.clientId,
                        projectId: project._id,
                        projectName: project.name,
                        entityType: 'material',
                        entityId: updatedMaterial._id,
                        entityLabel: material.name,
                        vendorName: contractor_name || undefined,
                        amountDue: Math.max(0, addedCost - Number(newMaterial.amountPaid || 0)),
                        totalCost: addedCost,
                        // Guaranteed present — required above whenever paymentStatus is partial/unpaid.
                        commitmentDate: commitmentDate!,
                    });
                } catch (commitmentError) {
                    console.error('⚠️ Payment commitment tracking failed for new batch (non-fatal):', commitmentError);
                }
            }

            console.log('\n✅ NEW MATERIAL CREATED:');
            console.log('Material ID:', updatedMaterial._id);
            console.log('Quantity:', updatedMaterial.qnt);
            console.log('Per Unit Cost:', updatedMaterial.perUnitCost);
            console.log('Total Cost:', updatedMaterial.totalCost);

        } else {
            // ✅ MERGE WITH EXISTING MATERIAL (Same cost or no cost provided, same vendor)
            console.log('\n🔄 MERGING WITH EXISTING MATERIAL (Same Cost & Vendor)');

            const newQuantity = oldQuantity + quantity;
            const currentPerUnitCost = hasNewCost ? perUnitCost : oldPerUnitCost;
            addedCost = quantity * currentPerUnitCost;
            const newTotalCost = oldTotalCost + addedCost;

            // Build $set update - also update contractor_name if provided and same
            const setUpdate: Record<string, any> = {
                'MaterialAvailable.$.qnt': newQuantity,
                'MaterialAvailable.$.totalCost': newTotalCost,
                ...(hasNewCost && { 'MaterialAvailable.$.perUnitCost': perUnitCost }),
            };

            // If contractor_name supplied and matches existing, keep it updated (in case of casing fix)
            if (contractor_name && contractor_name.trim()) {
                setUpdate['MaterialAvailable.$.contractor_name'] = contractor_name.trim();
            }

            // Accumulate the vendor payment across the merged batches and re-derive the
            // overall status against the new combined total cost, so a fully-paid batch
            // merged with an unpaid one correctly becomes "partial". Only do this when
            // payment info exists on either side — otherwise the merged entry stays
            // undefined (no payment recorded).
            const existingHasPayment =
                material.paymentStatus !== undefined || material.amountPaid !== undefined;
            let mergedPaymentStatus: 'full' | 'partial' | 'unpaid' | undefined;
            let mergedAmountPaid: number | undefined;

            if (hasPaymentInfo || existingHasPayment) {
                const oldAmountPaid = Number(material.amountPaid || 0);
                mergedAmountPaid = oldAmountPaid + (Number(amountPaid) || 0);
                mergedPaymentStatus =
                    newTotalCost > 0 && mergedAmountPaid >= newTotalCost - 0.01
                        ? 'full'
                        : mergedAmountPaid > 0
                            ? 'partial'
                            : 'unpaid';

                setUpdate['MaterialAvailable.$.amountPaid'] = mergedAmountPaid;
                setUpdate['MaterialAvailable.$.paymentStatus'] = mergedPaymentStatus;
            }

            // A new batch's bill date supersedes the old one on merge (latest bill wins);
            // when the new batch has no bill date the existing one is kept.
            if (billingDate) {
                setUpdate['MaterialAvailable.$.billingDate'] = billingDate;
            }

            // Bill photos accumulate instead of replacing — each merged batch had its
            // own vendor bill, and all of them stay auditable on the stock entry.
            const mergedBillImages = mergeBillImages(material.billImages, billImages);
            if (mergedBillImages.length > 0) {
                setUpdate['MaterialAvailable.$.billImages'] = mergedBillImages;
            }

            const updatedProject = await Projects.findOneAndUpdate(
                {
                    _id: project._id,
                    'MaterialAvailable._id': new Types.ObjectId(materialId)
                },
                {
                    $set: setUpdate,
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

            // Track/clear the payment commitment for this batch against its
            // freshly-recomputed merged status. Never let a commitment-tracking
            // hiccup fail an otherwise-successful material merge.
            if (mergedPaymentStatus) {
                try {
                    const mergedAmountDue = Math.max(0, newTotalCost - Number(mergedAmountPaid || 0));
                    if (mergedPaymentStatus === 'full') {
                        await autoResolveCommitment('material', updatedMaterial._id, 'paid_full');
                    } else {
                        if (commitmentDate) {
                            // commitmentDate is guaranteed present here whenever the
                            // incoming item's own paymentStatus is partial/unpaid
                            // (validated above) — creates or updates the open commitment.
                            await upsertCommitment({
                                clientId: project.clientId,
                                projectId: project._id,
                                projectName: project.name,
                                entityType: 'material',
                                entityId: updatedMaterial._id,
                                entityLabel: material.name,
                                vendorName: contractor_name || material.contractor_name || undefined,
                                amountDue: mergedAmountDue,
                                totalCost: newTotalCost,
                                commitmentDate,
                            });
                        } else {
                            // The merge only became partial/unpaid because of the pre-existing
                            // batch's debt (this incoming batch was fully paid or carried no
                            // payment info) — no new date to record. Just refresh the amount
                            // on any open commitment.
                            await refreshCommitmentAmountIfActive('material', updatedMaterial._id, mergedAmountDue, newTotalCost);
                        }
                    }
                } catch (commitmentError) {
                    console.error('⚠️ Payment commitment tracking failed for merged batch (non-fatal):', commitmentError);
                }
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
                fullName: 'Unknown User',
                userType: undefined as string | undefined
            };

            if (userDetailsHeader) {
                try {
                    const userDetails = JSON.parse(userDetailsHeader);
                    user = {
                        userId: userDetails._id || userDetails.id || clientId,
                        fullName: userDetails.fullName ||
                                 (userDetails.firstName && userDetails.lastName
                                     ? `${userDetails.firstName} ${userDetails.lastName}`
                                     : userDetails.firstName || userDetails.lastName || userDetails.name || 'Unknown User'),
                        userType: userDetails.userType || undefined,
                    };
                } catch (parseError) {
                    console.warn('⚠️ Failed to parse user details from header:', parseError);
                }
            }

            // 🧾 Bill photos from this batch only — taken from the request input
            // rather than updatedMaterial because a merged batch's stored list also
            // carries bills from earlier purchases, which don't belong to this activity.
            const activityBillImages = billImages;

            // Create material activity payload
            const materialActivityPayload: any = {
                clientId: String(clientId),
                projectId: String(project._id),
                projectName: project.name || 'Unknown Project',
                sectionName: material.sectionName || undefined,
                miniSectionName: material.miniSectionName || undefined,
                // Top-level contractor_name for the activity feed
                contractor_name: (contractor_name && contractor_name.trim()) ? contractor_name.trim() : (material.contractor_name || undefined),
                materials: [{
                    name: updatedMaterial.name,
                    unit: updatedMaterial.unit,
                    specs: updatedMaterial.specs || {},
                    qnt: quantity, // The quantity that was added
                    perUnitCost: updatedMaterial.perUnitCost || 0,
                    totalCost: addedCost, // The cost of the added quantity
                    cost: addedCost, // For backward compatibility
                    contractor_name: updatedMaterial.contractor_name || undefined,
                    sectionId: updatedMaterial.sectionId || undefined,
                    miniSectionId: updatedMaterial.miniSectionId || undefined,
                    billingDate: billingDate || undefined,
                    billImages: activityBillImages.length > 0 ? activityBillImages : undefined,
                    addedAt: new Date(),
                }],
                message: action === 'created'
                    ? `Added ${quantity} ${updatedMaterial.unit} of ${updatedMaterial.name} as new entry${newEntryReason === 'vendor' ? ` from vendor ${contractor_name}` : newEntryReason === 'cost_and_vendor' ? ` from vendor ${contractor_name} at ₹${perUnitCost}/${updatedMaterial.unit}` : ` at ₹${perUnitCost}/${updatedMaterial.unit}`}`
                    : `Added ${quantity} ${updatedMaterial.unit} to existing ${updatedMaterial.name} stock`,
                activity: 'imported' as const,
                date: new Date().toISOString(),
                user: user,
                // Omitted entirely when no bill was uploaded, so the card hides its bill row.
                ...(activityBillImages.length > 0 ? { billImages: activityBillImages } : {}),
            };

            console.log('📦 Material Activity Payload:');
            console.log(JSON.stringify(materialActivityPayload, null, 2));

            const materialActivity = new MaterialActivity(materialActivityPayload);
            await materialActivity.save();

            console.log('✅ Material activity created successfully:', materialActivity._id);

            // Invalidate material activity cache
            const activityKeys = await safeRedisKeysCache(`materialActivity:*`);
            if (activityKeys.length > 0) {
                await safeRedisDelCache(...activityKeys);
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
            const materialKeys = await safeRedisKeysCache(`material:${project._id}:*`);
            if (materialKeys.length > 0) {
                await safeRedisDelCache(...materialKeys);
                console.log(`🗑️ Invalidated ${materialKeys.length} material cache keys`);
            }

            // Invalidate project cache
            await safeRedisDelCache(`project:${project._id}`);
            const projectKeys = await safeRedisKeysCache(`projects:*`);
            if (projectKeys.length > 0) {
                await safeRedisDelCache(...projectKeys);
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
                    paymentStatus: updatedMaterial.paymentStatus,
                    amountPaid: updatedMaterial.amountPaid,
                    billingDate: updatedMaterial.billingDate,
                    billImages: updatedMaterial.billImages,
                },
                addedQuantity: quantity,
                addedCost: addedCost,
                newQuantity: updatedMaterial.qnt,
                oldQuantity: action === 'created' ? 0 : oldQuantity,
                projectId: project._id,
                projectName: project.name,
                isNewEntry: action === 'created',
                newEntryReason: newEntryReason,
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
