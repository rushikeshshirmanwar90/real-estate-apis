import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import {
  safeRedisDelCache,
  safeRedisKeysCache,
} from "@/lib/utils/redis-helpers";

// POST /api/material/payment
// Records a vendor payment against one or more material batches (variants of a
// grouped material card). The incoming amount is distributed across the batches
// that still have an outstanding balance, and each batch's paymentStatus is
// recomputed against its own totalCost.
//
// body: { projectId, clientId, materialIds: string[], amountPaid: number }
export const POST = async (request: NextRequest) => {
  try {
    await connect();

    const body = await request.json();
    const { projectId, clientId, materialIds, amountPaid } = body || {};

    // ── Validation ────────────────────────────────────────────────────────
    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Valid projectId is required" },
        { status: 400 }
      );
    }
    if (!clientId || !Types.ObjectId.isValid(clientId)) {
      return NextResponse.json(
        { success: false, error: "Valid clientId is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(materialIds) || materialIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "materialIds must be a non-empty array" },
        { status: 400 }
      );
    }
    const payment = Number(amountPaid);
    if (!payment || Number.isNaN(payment) || payment <= 0) {
      return NextResponse.json(
        { success: false, error: "amountPaid must be a positive number" },
        { status: 400 }
      );
    }

    const idSet = new Set(materialIds.map((id: any) => String(id)));

    const project = await Projects.findOne({
      _id: new Types.ObjectId(projectId),
      clientId: new Types.ObjectId(clientId),
    });
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // ── Collect the target batches that still owe money ───────────────────
    // Only batches that already carry a recorded payment status participate, so
    // this stays consistent with what the card shows as "due".
    const availableArr: any[] = project.MaterialAvailable || [];
    const targets = availableArr.filter(
      (m: any) => idSet.has(String(m._id)) && m.paymentStatus != null
    );

    if (targets.length === 0) {
      return NextResponse.json(
        { success: false, error: "No payable material batches found" },
        { status: 404 }
      );
    }

    const totalDueBefore = targets.reduce(
      (sum: number, m: any) =>
        sum + Math.max(0, (Number(m.totalCost) || 0) - (Number(m.amountPaid) || 0)),
      0
    );

    if (totalDueBefore <= 0.01) {
      return NextResponse.json(
        { success: false, error: "This material is already fully paid" },
        { status: 400 }
      );
    }

    // Clamp so an over-payment never exceeds what's actually owed.
    let remainingToApply = Math.min(payment, totalDueBefore);
    const appliedAmount = remainingToApply;

    // ── Distribute the payment across batches (fill each due in order) ────
    const batchUpdates: {
      id: string;
      amountPaid: number;
      paymentStatus: string;
    }[] = [];
    for (const m of targets) {
      if (remainingToApply <= 0.01) break;
      const cost = Number(m.totalCost) || 0;
      const paid = Number(m.amountPaid) || 0;
      const due = Math.max(0, cost - paid);
      if (due <= 0) continue;

      const applyHere = Math.min(due, remainingToApply);
      const newPaid = paid + applyHere;
      m.amountPaid = newPaid;
      m.paymentStatus =
        cost > 0 && newPaid >= cost - 0.01
          ? "full"
          : newPaid > 0
            ? "partial"
            : "unpaid";
      batchUpdates.push({
        id: String(m._id),
        amountPaid: newPaid,
        paymentStatus: m.paymentStatus,
      });
      remainingToApply -= applyHere;
    }

    // Update only the affected batches atomically instead of project.save() —
    // a full save re-validates every embedded document in the project, so any
    // legacy subdocument that predates a now-required field (e.g. old Labors
    // without a description) would fail validation and block the payment.
    if (batchUpdates.length > 0) {
      const setOps: Record<string, any> = {};
      const arrayFilters: Record<string, any>[] = [];
      batchUpdates.forEach((u, i) => {
        setOps[`MaterialAvailable.$[b${i}].amountPaid`] = u.amountPaid;
        setOps[`MaterialAvailable.$[b${i}].paymentStatus`] = u.paymentStatus;
        arrayFilters.push({ [`b${i}._id`]: new Types.ObjectId(u.id) });
      });
      await Projects.updateOne(
        { _id: project._id },
        { $set: setOps },
        { arrayFilters }
      );
    }

    // ── Recompute the aggregate for the affected batches ──────────────────
    const updated = (project.MaterialAvailable || []).filter((m: any) =>
      idSet.has(String(m._id))
    );
    const totalCost = updated.reduce(
      (s: number, m: any) => s + (Number(m.totalCost) || 0),
      0
    );
    const totalPaid = updated.reduce(
      (s: number, m: any) => s + (Number(m.amountPaid) || 0),
      0
    );
    const amountRemaining = Math.max(0, totalCost - totalPaid);
    const paymentStatus =
      totalCost > 0 && totalPaid >= totalCost - 0.01
        ? "full"
        : totalPaid > 0
          ? "partial"
          : "unpaid";

    // ── Invalidate caches so the next fetch reflects the new payment ──────
    try {
      const materialKeys = await safeRedisKeysCache(`material:${project._id}:*`);
      if (materialKeys.length > 0) await safeRedisDelCache(...materialKeys);
      await safeRedisDelCache(`project:${project._id}`);
    } catch (cacheError) {
      console.error("⚠️ Cache invalidation error (non-critical):", cacheError);
    }

    return NextResponse.json({
      success: true,
      message: `Recorded payment of ₹${appliedAmount.toLocaleString("en-IN")}`,
      data: {
        appliedAmount,
        amountPaid: totalPaid,
        totalCost,
        amountRemaining,
        paymentStatus,
      },
    });
  } catch (error: any) {
    console.error("❌ ERROR RECORDING PAYMENT:", error?.message, error?.stack);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to record payment",
      },
      { status: 500 }
    );
  }
};
