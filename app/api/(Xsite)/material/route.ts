import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { checkValidClient } from "@/lib/auth";
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisKeysCache,
  safeRedisDelCache
} from "@/lib/utils/redis-helpers";
import { errorResponse } from "@/lib/utils/api-response";
import { notifyMaterialActivityCreated } from "@/lib/services/notificationService";
import {
  upsertCommitment,
  autoResolveCommitment,
  refreshCommitmentAmountIfActive,
  findActiveCommitments,
} from "@/lib/services/paymentCommitmentService";

type Specs = Record<string, unknown>;

// Vendor bill photo uploaded via POST /api/material/bill-upload. Only the hosted
// URL travels with the material — never the image binary.
type BillImage = {
  url: string;
  publicId?: string;
  uploadedAt?: Date;
};

type AddMaterialStockItem = {
  projectId: string;
  materialName: string;
  unit: string;
  specs?: Specs;
  qnt: number | string;
  perUnitCost: number | string;
  mergeIfExists?: boolean;
  contractor_name?: string;
  paymentStatus?: 'full' | 'partial' | 'unpaid';
  amountPaid?: number;
  billingDate?: string;
  billImages?: Array<{ url?: string; publicId?: string; uploadedAt?: string }> | null;
  // Required when paymentStatus is 'partial'/'unpaid' — when the vendor will
  // be paid. Drives the payment-commitment reminder/overdue notifications.
  commitmentDate?: string;
};

type MaterialSubdoc = {
  _id?: Types.ObjectId | string;
  name: string;
  unit: string;
  specs?: Specs;
  qnt: number;
  perUnitCost: number;
  totalCost: number;
  contractor_name?: string;
  paymentStatus?: 'full' | 'partial' | 'unpaid';
  amountPaid?: number;
  billingDate?: Date;
  billImages?: BillImage[];
};

// Keeps only entries that carry a usable http(s) URL and drops duplicates, so a
// malformed client payload can never write junk bill records.
const sanitizeBillImages = (raw: AddMaterialStockItem["billImages"]): BillImage[] => {
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

// Merges live PaymentCommitment status onto each material batch. Kept out of
// the Redis-cached payload (which lives for 24h) so an overdue transition
// from the daily cron, or a payment recorded elsewhere, always shows up
// immediately instead of waiting for the material cache to expire.
const attachCommitments = async (materials: any[]): Promise<any[]> => {
  if (!Array.isArray(materials) || materials.length === 0) return materials;
  const ids = materials.map((m) => m?._id).filter(Boolean);
  const commitmentsById = await findActiveCommitments("material", ids);
  return materials.map((m) => ({
    ...m,
    commitment: commitmentsById.get(String(m?._id)) || null,
  }));
};

// ─── GET: Fetch MaterialAvailable ────────────────────────────
export const GET = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
  try {
    const { searchParams } = new URL(req.url);
    const projectId    = searchParams.get("projectId");
    const clientId     = searchParams.get("clientId");
    const sortBy       = searchParams.get("sortBy")             || "createdAt";
    const sortOrder    = searchParams.get("sortOrder")          || "desc";
    const sectionId    = searchParams.get("sectionId");         // ✅ NEW: Section filtering
    const page         = parseInt(searchParams.get("page") || "1");
    const limit        = Math.min(parseInt(searchParams.get("limit") || "10"), 5000); // ✅ Pagination: default 10, max 5000
    const cacheBuster  = searchParams.get("_t");                // ✅ Cache busting parameter (ignored, just for client-side cache bypass)

    if (!projectId || !clientId) {
      return NextResponse.json(
        { message: "Project ID and Client ID are required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(clientId)) {
      return NextResponse.json(
        { message: "Invalid project ID or client ID format" },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { message: "Page and limit must be positive integers" },
        { status: 400 }
      );
    }

    // Bearer token authentication complete
    await connect();

    // Check cache first (exclude cache buster from cache key)
    const cacheKey = `material:${projectId}:${clientId}:${sectionId || 'all'}:${sortBy}:${sortOrder}:${page}:${limit}`;
    console.log(`🔍 Cache key: ${cacheKey}${cacheBuster ? ` (cache buster: ${cacheBuster})` : ''}`);

    const cachedData = await safeRedisGetCache(cacheKey);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
      if (Array.isArray(cacheValue.MaterialAvailable)) {
        cacheValue.MaterialAvailable = await attachCommitments(cacheValue.MaterialAvailable);
      }
      return NextResponse.json(cacheValue, { status: 200 });
    }

    // ✅ NEW: Enhanced pipeline with pagination and section filtering
    const pipeline: any[] = [
      {
        $match: {
          _id:      new Types.ObjectId(projectId),
          clientId: new Types.ObjectId(clientId),
        },
      },
      {
        $unwind: {
          path: "$MaterialAvailable",
          preserveNullAndEmptyArrays: false,
        },
      }
    ];

    // ✅ NEW: Add section filtering if provided
    if (sectionId && sectionId !== 'all-sections') {
      let sectionIdMatchCondition: any;
      
      if (sectionId.includes(',')) {
        sectionIdMatchCondition = { "MaterialAvailable.sectionId": { $in: sectionId.split(',') } };
      } else {
        sectionIdMatchCondition = { "MaterialAvailable.sectionId": sectionId };
      }
      
      pipeline.push({
        $match: {
          $or: [
            sectionIdMatchCondition,
            { "MaterialAvailable.sectionId": { $exists: false } }, // Include global materials
            { "MaterialAvailable.sectionId": null }
          ]
        }
      } as any);
    }

    // Add sorting field
    pipeline.push({
      $addFields: {
        "MaterialAvailable.sortField": {
          $cond: {
            if:   { $eq: [sortBy, "createdAt"] },
            then: { $ifNull: ["$MaterialAvailable.createdAt", new Date()] },
            else: {
              $cond: {
                if:   { $eq: [sortBy, "name"] },
                then: "$MaterialAvailable.name",
                else: {
                  $cond: {
                    if:   { $eq: [sortBy, "totalCost"] },
                    then: "$MaterialAvailable.totalCost",
                    else: "$MaterialAvailable.qnt",
                  },
                },
              },
            },
          },
        },
      },
    });

    // Sort materials
    pipeline.push({ $sort: { "MaterialAvailable.sortField": sortOrder === "asc" ? 1 : -1 } });

    // ✅ NEW: Add pagination
    const skip = (page - 1) * limit;
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    pipeline.push({ $limit: limit });

    // Group results
    pipeline.push({
      $group: {
        _id:        "$_id",
        materials:  { $push: "$MaterialAvailable" },
      },
    });

    // ✅ NEW: Get total count for pagination (separate query for accurate count)
    const countPipeline = [
      {
        $match: {
          _id:      new Types.ObjectId(projectId),
          clientId: new Types.ObjectId(clientId),
        },
      },
      {
        $unwind: {
          path: "$MaterialAvailable",
          preserveNullAndEmptyArrays: false,
        },
      }
    ];

    // Add same section filtering for count
    if (sectionId && sectionId !== 'all-sections') {
      let sectionIdMatchCondition: any;
      
      if (sectionId.includes(',')) {
        sectionIdMatchCondition = { "MaterialAvailable.sectionId": { $in: sectionId.split(',') } };
      } else {
        sectionIdMatchCondition = { "MaterialAvailable.sectionId": sectionId };
      }
      
      countPipeline.push({
        $match: {
          $or: [
            sectionIdMatchCondition,
            { "MaterialAvailable.sectionId": { $exists: false } },
            { "MaterialAvailable.sectionId": null }
          ]
        }
      } as any);
    }

    countPipeline.push({ $count: "total" } as any);

    const [result, countResult] = await Promise.all([
      Projects.aggregate(pipeline),
      Projects.aggregate(countPipeline)
    ]);

    const totalItems = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalItems / limit);

    if (!result || result.length === 0) {
      const projectExists = await Projects.findOne({
        _id:      new Types.ObjectId(projectId),
        clientId: new Types.ObjectId(clientId),
      });

      if (!projectExists) {
        return NextResponse.json({ message: "Project not found" }, { status: 404 });
      }

      const emptyResponse = {
        success:           true,
        message:           sectionId ? "No materials found for the specified section" : "No materials found for this project",
        MaterialAvailable: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      };

      return NextResponse.json(emptyResponse, { status: 200 });
    }

    const data = result[0];

    const responsePayload = {
      success:           true,
      message:           "Material available fetched successfully",
      MaterialAvailable: data.materials || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    // Cache the base response (without live commitment status) with 24-hour expiration
    await safeRedisSetCache(cacheKey, JSON.stringify(responsePayload), 'EX', 86400);

    const responseWithCommitments = {
      ...responsePayload,
      MaterialAvailable: await attachCommitments(responsePayload.MaterialAvailable),
    };

    return NextResponse.json(responseWithCommitments, { status: 200 });
  } catch (error: unknown) {
    console.error("❌ Material GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch MaterialAvailable",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// ─── POST: Add or merge materials ────────────────────────────────────────────
export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
  try {
    await connect();
    const raw = await req.json();

    const materialItems: AddMaterialStockItem[] = Array.isArray(raw) ? raw : [raw];

    if (materialItems.length === 0) {
      return NextResponse.json({ success: false, error: "No materials provided" }, { status: 400 });
    }

    // Who's submitting — attached to any PaymentCommitment created below.
    let commitmentCreatedBy: { userId?: string; fullName?: string; userType?: string } | undefined;
    const userDetailsHeaderForCommitment = req.headers.get('x-user-details');
    if (userDetailsHeaderForCommitment) {
      try {
        const parsed = JSON.parse(userDetailsHeaderForCommitment);
        commitmentCreatedBy = {
          userId: parsed._id || parsed.id || undefined,
          fullName: parsed.fullName ||
            (parsed.firstName && parsed.lastName ? `${parsed.firstName} ${parsed.lastName}` : parsed.firstName || parsed.lastName || parsed.name || undefined),
          userType: parsed.userType || undefined,
        };
      } catch {
        // Non-fatal — commitment is still created, just without createdBy.
      }
    }

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
        contractor_name,
        // No defaults — left undefined when the caller doesn't send payment info,
        // so the material isn't falsely marked as "unpaid".
        paymentStatus,
        amountPaid,
        billingDate: rawBillingDate,
        billImages: rawBillImages,
        commitmentDate: rawCommitmentDate,
      } = item as AddMaterialStockItem;
      const hasPaymentInfo = paymentStatus !== undefined || amountPaid !== undefined;

      // Optional vendor bill photos from the payment step.
      const billImages = sanitizeBillImages(rawBillImages);

      // Optional vendor bill date — only stored when the caller sent a valid date.
      let billingDate: Date | undefined;
      if (rawBillingDate) {
        const parsed = new Date(rawBillingDate);
        if (Number.isNaN(parsed.getTime())) {
          results.push({ input: item, success: false, error: "billingDate must be a valid date" });
          continue;
        }
        billingDate = parsed;
      }

      // Commitment date — required (not optional, unlike billingDate) whenever
      // the vendor is left partially/unpaid, so there's always a promise date
      // for the reminder/overdue cron to track.
      let commitmentDate: Date | undefined;
      if (paymentStatus === 'partial' || paymentStatus === 'unpaid') {
        if (!rawCommitmentDate) {
          results.push({ input: item, success: false, error: "commitmentDate is required when paymentStatus is partial or unpaid" });
          continue;
        }
        const parsedCommitment = new Date(rawCommitmentDate);
        if (Number.isNaN(parsedCommitment.getTime())) {
          results.push({ input: item, success: false, error: "commitmentDate must be a valid date" });
          continue;
        }
        commitmentDate = parsedCommitment;
      }

      // 🔍 DEBUG: Log contractor_name extraction
      console.log('🏗️ Material Item Debug:', {
        materialName,
        contractor_name,
        hasContractorName: !!contractor_name,
        contractorNameType: typeof contractor_name,
        fullItem: item,
      });

      const resultBase = { input: item, success: false };

      const qnt         = typeof rawQnt         === "string" ? Number(rawQnt)         : rawQnt;
      const perUnitCost = typeof rawPerUnitCost  === "string" ? Number(rawPerUnitCost) : rawPerUnitCost;
      const totalCost   = perUnitCost * qnt;

      if (!Types.ObjectId.isValid(projectId)) {
        results.push({ ...resultBase, error: "Invalid project ID format" });
        continue;
      }

      if (!projectId || !materialName || !unit) {
        results.push({ ...resultBase, error: "projectId, materialName and unit are required" });
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
        results.push({ ...resultBase, error: "Quantity must be greater than 0" });
        continue;
      }

      if (perUnitCost < 0) {
        results.push({ ...resultBase, error: "Per unit cost cannot be negative" });
        continue;
      }

      const project = await Projects.findById(projectId);
      if (!project) {
        results.push({ ...resultBase, error: "project not found" });
        continue;
      }

      project.MaterialAvailable = project.MaterialAvailable || [];
      const availableArr = project.MaterialAvailable as MaterialSubdoc[];

      // ── Zero-tolerance price merge logic (unchanged from original) ──────
      let shouldMerge  = false;
      let mergeIndex   = -1;

      if (mergeIfExists) {
        let exactMatchIndex = -1;
        for (let i = 0; i < availableArr.length; i++) {
          const existing = availableArr[i];
          const nameMatch  = existing.name === materialName;
          const unitMatch  = existing.unit === unit;
          const specsMatch = JSON.stringify(existing.specs || {}) === JSON.stringify(specs);
          const priceMatch = Number(existing.perUnitCost || 0) === Number(perUnitCost);

          if (nameMatch && unitMatch && specsMatch && priceMatch) {
            exactMatchIndex = i;
            break;
          }
        }

        if (exactMatchIndex >= 0) {
          shouldMerge = true;
          mergeIndex  = exactMatchIndex;
        }
      }

      // ── Execute merge ────────────────────────────────────────────────────
      if (shouldMerge && mergeIndex >= 0) {
        const existing      = availableArr[mergeIndex];
        const oldQnt        = Number(existing.qnt       || 0);
        const oldPerUnit    = Number(existing.perUnitCost || 0);
        const oldTotalCost  = Number(existing.totalCost  || 0);

        const newQnt        = oldQnt + qnt;
        const newTotalCost  = oldTotalCost + totalCost;

        existing.qnt        = newQnt;
        existing.perUnitCost = oldPerUnit;
        existing.totalCost  = newTotalCost;

        // Accumulate the vendor payment across the merged batches and re-derive the
        // overall status against the new combined total cost, so a fully-paid batch
        // merged with an unpaid one correctly becomes "partial". Only do this when
        // payment info exists on either side — otherwise the merged entry stays
        // undefined (no payment recorded).
        const existingHasPayment =
          existing.amountPaid !== undefined || existing.paymentStatus !== undefined;
        if (hasPaymentInfo || existingHasPayment) {
          const oldAmountPaid = Number(existing.amountPaid || 0);
          const newAmountPaid = oldAmountPaid + (Number(amountPaid) || 0);
          existing.amountPaid = newAmountPaid;
          existing.paymentStatus =
            newTotalCost > 0 && newAmountPaid >= newTotalCost - 0.01
              ? 'full'
              : newAmountPaid > 0
                ? 'partial'
                : 'unpaid';
        }

        // A new batch's bill date supersedes the old one on merge (latest bill wins);
        // when the new batch has no bill date the existing one is kept.
        if (billingDate) {
          existing.billingDate = billingDate;
        }

        // Bill photos accumulate instead of replacing — each merged batch had its
        // own vendor bill, and all of them stay auditable on the stock entry.
        if (billImages.length > 0) {
          existing.billImages = mergeBillImages(existing.billImages, billImages);
        }

        project.spent       = (project.spent || 0) + totalCost;

        const saved = await project.save();

        if (saved) {
          const updatedMaterial = (saved.MaterialAvailable || []).find(
            (m: MaterialSubdoc) =>
              m.name === materialName &&
              m.unit === unit &&
              JSON.stringify(m.specs || {}) === JSON.stringify(specs) &&
              Number(m.perUnitCost || 0) === Number(perUnitCost)
          );

          // Track/clear the payment commitment for this batch against its
          // freshly-recomputed merged status. Never let a commitment-tracking
          // hiccup fail an otherwise-successful material merge.
          try {
            const mergedAmountDue = Math.max(0, newTotalCost - Number(existing.amountPaid || 0));
            if (existing.paymentStatus === 'full') {
              await autoResolveCommitment('material', existing._id!, 'paid_full');
            } else if (existing.paymentStatus === 'partial' || existing.paymentStatus === 'unpaid') {
              if (commitmentDate) {
                // commitmentDate is guaranteed present here whenever the
                // incoming item's own paymentStatus is partial/unpaid
                // (validated above) — creates or updates the open commitment.
                await upsertCommitment({
                  clientId: project.clientId,
                  projectId: project._id,
                  projectName: project.name,
                  entityType: 'material',
                  entityId: existing._id!,
                  entityLabel: materialName,
                  vendorName: contractor_name || existing.contractor_name || undefined,
                  amountDue: mergedAmountDue,
                  totalCost: newTotalCost,
                  commitmentDate,
                  createdBy: commitmentCreatedBy,
                });
              } else {
                // The merge only became partial because of the pre-existing
                // batch's debt (incoming item was fully paid) — no new date to
                // record. Just refresh the amount on any open commitment.
                await refreshCommitmentAmountIfActive('material', existing._id!, mergedAmountDue, newTotalCost);
              }
            }
          } catch (commitmentError) {
            console.error('⚠️ Payment commitment tracking failed for merged batch (non-fatal):', commitmentError);
          }

          results.push({
            ...resultBase,
            success: true,
            action:  "merged",
            message: `Merged ${qnt} ${unit} of ${materialName}. Total now: ${newQnt} ${unit}`,
            material: updatedMaterial as MaterialSubdoc,
          });
        } else {
          results.push({ ...resultBase, success: false, error: "Failed to merge material" });
        }

        continue;
      }

      // ── Create new entry ─────────────────────────────────────────────────
      const newMaterial: MaterialSubdoc = {
        _id:           new Types.ObjectId(),
        name:          materialName,
        unit,
        specs:         specs || {},
        qnt:           Number(qnt),
        perUnitCost:   Number(perUnitCost),
        totalCost:     Number(totalCost),
        contractor_name: contractor_name || undefined,
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

      const updatedProject = await Projects.findByIdAndUpdate(
        projectId,
        {
          $push: { MaterialAvailable: newMaterial },
          $inc:  { spent: totalCost },
        },
        { new: true }
      );

      if (updatedProject) {
        if (newMaterial.paymentStatus === 'partial' || newMaterial.paymentStatus === 'unpaid') {
          try {
            await upsertCommitment({
              clientId: project.clientId,
              projectId: project._id,
              projectName: project.name,
              entityType: 'material',
              entityId: newMaterial._id!,
              entityLabel: materialName,
              vendorName: contractor_name || undefined,
              amountDue: Math.max(0, totalCost - Number(newMaterial.amountPaid || 0)),
              totalCost,
              // Guaranteed present — required above whenever paymentStatus is partial/unpaid.
              commitmentDate: commitmentDate!,
              createdBy: commitmentCreatedBy,
            });
          } catch (commitmentError) {
            console.error('⚠️ Payment commitment tracking failed for new batch (non-fatal):', commitmentError);
          }
        }

        results.push({
          ...resultBase,
          success: true,
          action:  "created",
          message: `Created new batch: ${qnt} ${unit} of ${materialName}`,
          material: newMaterial,
        });
      } else {
        results.push({ ...resultBase, success: false, error: "Failed to create material" });
      }
    }

    // ✅ CREATE MATERIAL ACTIVITY ENTRIES for successful imports
    console.log('\n========================================');
    console.log('📝 CREATING MATERIAL ACTIVITY ENTRIES');
    console.log('========================================');
    
    try {
      // Get user info from request headers
      const userDetailsHeader = req.headers.get('x-user-details');
      let user = {
        userId: 'unknown',
        fullName: 'Unknown User',
        userType: undefined as string | undefined // Add userType field
      };
      
      if (userDetailsHeader) {
        try {
          const userDetails = JSON.parse(userDetailsHeader);
          user = {
            userId: userDetails._id || userDetails.id || 'unknown',
            fullName: userDetails.fullName || 
                     (userDetails.firstName && userDetails.lastName 
                         ? `${userDetails.firstName} ${userDetails.lastName}` 
                         : userDetails.firstName || userDetails.lastName || userDetails.name || 'Unknown User'),
            userType: userDetails.userType || undefined // Extract userType from header
          };
        } catch (parseError) {
          console.warn('⚠️ Failed to parse user details from header:', parseError);
        }
      }
      
      // Group successful results by projectId
      const successfulByProject = new Map<string, typeof results>();
      
      for (const result of results) {
        if (result.success && result.input.projectId) {
          const projectId = result.input.projectId;
          if (!successfulByProject.has(projectId)) {
            successfulByProject.set(projectId, []);
          }
          successfulByProject.get(projectId)!.push(result);
        }
      }
      
      // Create MaterialActivity for each project
      for (const [projectId, projectResults] of Array.from(successfulByProject.entries())) {
        try {
          const project = await Projects.findById(projectId);
          if (!project) {
            console.warn(`⚠️ Project ${projectId} not found for activity logging`);
            continue;
          }
          
          // Get clientId from project
          const clientId = project.clientId;
          
          // Create materials array for activity
          const materials = projectResults.map(result => {
            const billImages = sanitizeBillImages(result.input.billImages);
            return {
              name: result.material?.name || result.input.materialName || 'Unknown',
              unit: result.material?.unit || result.input.unit || 'unit',
              specs: result.material?.specs || result.input.specs || {},
              qnt: result.material?.qnt || Number(result.input.qnt) || 0,
              perUnitCost: result.material?.perUnitCost || Number(result.input.perUnitCost) || 0,
              totalCost: result.material?.totalCost || 0,
              cost: result.material?.totalCost || 0, // For backward compatibility
              contractor_name: result.material?.contractor_name || result.input.contractor_name || undefined, // ✅ NEW: Include contractor_name
              billingDate: result.material?.billingDate || undefined,
              // 🧾 Bill photos from the payment step. Taken from the request input rather
              // than result.material because a merged batch's stored list also carries
              // bills from earlier purchases, which don't belong to this activity.
              billImages: billImages.length > 0 ? billImages : undefined,
              addedAt: new Date(),
            };
          });

          const totalCost = materials.reduce((sum, m) => sum + (m.cost || 0), 0);
          const materialCount = materials.length;

          // ✅ NEW: Extract contractor_name from first material (if available)
          const contractor_name = materials[0]?.contractor_name || undefined;

          // 🧾 One vendor bill normally covers the whole batch, so mirror the union
          // of every material's bills onto the activity for the notification feed.
          const activityBillImages = materials.reduce<BillImage[]>(
            (acc, m) => mergeBillImages(acc, m.billImages || []),
            []
          );
          
          // 🔍 DEBUG: Log contractor_name before creating activity
          console.log('🏗️ MaterialActivity Payload Debug:', {
            projectId,
            materialCount,
            contractor_name,
            hasContractorName: !!contractor_name,
            firstMaterialContractorName: materials[0]?.contractor_name,
            allMaterialsContractorNames: materials.map(m => m.contractor_name),
          });
          
          // Create material activity payload
          const materialActivityPayload = {
            clientId: String(clientId),
            projectId: String(projectId),
            projectName: project.name || 'Unknown Project',
            materials: materials,
            message: materialCount === 1
              ? `Added ${materials[0].qnt} ${materials[0].unit} of ${materials[0].name}`
              : `Added ${materialCount} materials to project`,
            activity: 'imported' as const,
            date: new Date().toISOString(),
            user: user,
            contractor_name: contractor_name, // ✅ NEW: Include contractor_name at activity level
            // Omitted entirely when no bill was uploaded, so the card hides its bill row
            ...(activityBillImages.length > 0 ? { billImages: activityBillImages } : {}),
          };
          
          console.log(`📦 Creating MaterialActivity for project ${projectId}:`, {
            materialCount,
            totalCost,
            projectName: project.name
          });
          
          const materialActivity = new MaterialActivity(materialActivityPayload);
          await materialActivity.save();
          
          console.log(`✅ MaterialActivity created: ${materialActivity._id}`);
          
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
                console.log(`✅ Material import notification completed: ${result.deliveredCount}/${result.recipientCount} delivered`);
              } else {
                console.error(`❌ Material import notification failed: ${result.errors.length} errors`);
              }
            })
            .catch(notifError => {
              console.error('⚠️ Notification error (non-critical):', notifError);
            });
            
        } catch (activityError) {
          console.error(`⚠️ Failed to create MaterialActivity for project ${projectId}:`, activityError);
          // Don't fail the request if activity creation fails
        }
      }
      
      console.log('✅ Material activity creation completed');
      console.log('========================================\n');
      
    } catch (activityError) {
      console.error('⚠️ Material activity creation error (non-critical):', activityError);
      // Don't fail the request if activity creation fails
    }

    // ✅ OPTIMIZED: Update cache instead of just invalidating
    console.log('\n========================================');
    console.log('🔄 UPDATING CACHE AFTER MATERIAL ADD');
    console.log('========================================');

    try {
      // Get all cache keys for this project's materials
      const materialKeys = await safeRedisKeysCache(`material:*`);
      console.log(`📋 Found ${materialKeys.length} cache keys to update`);

      if (materialKeys.length > 0) {
        // Update each cached response with the new materials
        for (const cacheKey of materialKeys) {
          try {
            const cachedData = await safeRedisGetCache(cacheKey);
            if (cachedData) {
              const parsedCache = JSON.parse(cachedData);
              // Check if this cache entry is for the same project
              if (parsedCache.MaterialAvailable && Array.isArray(parsedCache.MaterialAvailable)) {
                console.log(`🔄 Updating cache key: ${cacheKey}`);
                // Get fresh data from database for this specific cache configuration
                const cacheKeyParts = cacheKey.split(':');
                const cachedProjectId = cacheKeyParts[1];

                // Only update if it matches our project
                if (cachedProjectId && materialItems[0]?.projectId === cachedProjectId) {
                  // Fetch fresh data from database
                  const freshProject = await Projects.findById(cachedProjectId);
                  if (freshProject && freshProject.MaterialAvailable) {
                    // Update the cached response with fresh data
                    parsedCache.MaterialAvailable = freshProject.MaterialAvailable;
                    parsedCache.pagination.totalItems = freshProject.MaterialAvailable.length;
                    parsedCache.pagination.totalPages = Math.ceil(
                      freshProject.MaterialAvailable.length / (parsedCache.pagination.itemsPerPage || 20)
                    );

                    // Save updated cache with same expiration (24 hours)
                    await safeRedisSetCache(cacheKey, JSON.stringify(parsedCache), 'EX', 86400);
                    console.log(`✅ Cache updated: ${cacheKey}`);
                  }
                }
              }
            }
          } catch (updateError) {
            console.error(`❌ Error updating cache key ${cacheKey}:`, updateError);
            // If update fails, delete the key to force fresh fetch
            await safeRedisDelCache(cacheKey);
          }
        }
      }

      // Also invalidate project-level caches (these are simpler to regenerate)
      await invalidateCachePattern(`project:*`);
      await invalidateCachePattern(`projects:*`);

      console.log('✅ Cache update completed successfully');
      console.log('========================================\n');
    } catch (cacheError) {
      console.error('❌ Cache update error:', cacheError);
      // If cache update fails, fall back to invalidation
      console.log('⚠️ Falling back to cache invalidation...');
      await invalidateCachePattern(`material:*`);
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in material-available POST:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// ─── PUT: Replace MaterialAvailable array ────────────────────────────────────
export const PUT = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID format" },
        { status: 400 }
      );
    }

    await connect();
    const body = await req.json();
    const { MaterialAvailable } = body;

    if (!MaterialAvailable || !Array.isArray(MaterialAvailable)) {
      return NextResponse.json(
        { success: false, message: "MaterialAvailable must be an array" },
        { status: 400 }
      );
    }

    const updatedProject = await Projects.findByIdAndUpdate(
      projectId,
      { MaterialAvailable },
      { new: true, fields: { MaterialAvailable: 1 } }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { success: false, message: "Project not found or update failed" },
        { status: 404 }
      );
    }

    // Invalidate cache for this project (PUT)
    await invalidateCachePattern(`material:${projectId}:*`);
    await safeRedisDelCache(`project:${projectId}`);
    await invalidateCachePattern(`projects:*`);

    return NextResponse.json(
      {
        success:           true,
        message:           "MaterialAvailable updated successfully",
        MaterialAvailable: updatedProject.MaterialAvailable,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to update MaterialAvailable",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// ─── PATCH: Edit a single MaterialAvailable entry (only if unused) ───────────
export const PATCH = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectId  = searchParams.get("projectId");
    const materialId = searchParams.get("materialId");

    if (!projectId || !materialId) {
      return NextResponse.json(
        { success: false, message: "Project ID and Material ID are required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(materialId)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID or material ID format" },
        { status: 400 }
      );
    }

    await connect();

    const body = await req.json();
    const { name, unit, qnt: rawQnt, perUnitCost: rawPerUnitCost, specs, contractor_name } = body || {};

    const project = await Projects.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    const availableArr = (project.MaterialAvailable || []) as MaterialSubdoc[];
    const target = availableArr.find((m) => String(m._id) === materialId);

    if (!target) {
      return NextResponse.json(
        { success: false, message: "Material not found" },
        { status: 404 }
      );
    }

    // ── Unused guard: block editing if this material has already been used ──
    // Usage entries match imported entries by name + unit (no batch _id reference)
    const usedArr = (project.MaterialUsed || []) as MaterialSubdoc[];
    const hasBeenUsed = usedArr.some(
      (u) => u.name === target.name && u.unit === target.unit
    );

    if (hasBeenUsed) {
      return NextResponse.json(
        { success: false, message: "Cannot edit stock that has already been used" },
        { status: 409 }
      );
    }

    // ── Validate provided numeric fields (mirror POST rules) ──
    const qnt = rawQnt !== undefined
      ? (typeof rawQnt === "string" ? Number(rawQnt) : rawQnt)
      : undefined;
    const perUnitCost = rawPerUnitCost !== undefined
      ? (typeof rawPerUnitCost === "string" ? Number(rawPerUnitCost) : rawPerUnitCost)
      : undefined;

    if (qnt !== undefined && (typeof qnt !== "number" || Number.isNaN(qnt) || qnt <= 0)) {
      return NextResponse.json(
        { success: false, message: "Quantity must be a number greater than 0" },
        { status: 400 }
      );
    }

    if (perUnitCost !== undefined && (typeof perUnitCost !== "number" || Number.isNaN(perUnitCost) || perUnitCost < 0)) {
      return NextResponse.json(
        { success: false, message: "Per unit cost cannot be negative" },
        { status: 400 }
      );
    }

    // ── Apply changes ──
    const oldTotalCost = Number(target.totalCost || 0);

    if (name !== undefined) target.name = name;
    if (unit !== undefined) target.unit = unit;
    if (specs !== undefined) target.specs = specs;
    if (contractor_name !== undefined) target.contractor_name = contractor_name || undefined;
    if (qnt !== undefined) target.qnt = Number(qnt);
    if (perUnitCost !== undefined) target.perUnitCost = Number(perUnitCost);

    const newTotalCost = Number(target.qnt || 0) * Number(target.perUnitCost || 0);
    target.totalCost = newTotalCost;

    // Keep project.spent consistent with the cost delta
    project.spent = (project.spent || 0) + (newTotalCost - oldTotalCost);

    await project.save();

    // Invalidate cache for this project (same as DELETE)
    await invalidateCachePattern(`material:${projectId}:*`);
    await safeRedisDelCache(`project:${projectId}`);
    await invalidateCachePattern(`projects:*`);

    return NextResponse.json(
      {
        success:  true,
        message:  "Material updated successfully",
        material: target,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to update material",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// ─── DELETE: Remove a material from MaterialAvailable ────────────────────────
export const DELETE = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const projectId  = searchParams.get("projectId");
    const materialId = searchParams.get("materialId");

    if (!projectId || !materialId) {
      return NextResponse.json(
        { success: false, message: "Project ID and Material ID are required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(materialId)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID or material ID format" },
        { status: 400 }
      );
    }

    await connect();

    const project = await Projects.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    const initialLength = project.MaterialAvailable?.length || 0;
    project.MaterialAvailable = (project.MaterialAvailable || []).filter(
      (m: MaterialSubdoc) => String(m._id) !== materialId
    );

    if (project.MaterialAvailable.length === initialLength) {
      return NextResponse.json(
        { success: false, message: "Material not found" },
        { status: 404 }
      );
    }

    await project.save();

    // Invalidate cache for this project (DELETE method)
    await invalidateCachePattern(`material:${projectId}:*`);
    await safeRedisDelCache(`project:${projectId}`);
    await invalidateCachePattern(`projects:*`);

    return NextResponse.json(
      {
        success:           true,
        message:           "Material deleted successfully",
        MaterialAvailable: project.MaterialAvailable,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete material",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};