import connect from "@/lib/db";
import { checkValidClient } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { Partnership, PartnershipDoc } from "@/lib/models/Xsite/Partnership";
import {
  CONTRIBUTION_CATEGORIES,
  ContributionCategory,
  PartnershipTransaction,
} from "@/lib/models/Xsite/PartnershipTransaction";
import { parsePaidBy, resolveActor, roundMoney } from "@/lib/services/partnershipService";

// The ledger of one partnership. Payments arrive from the regular cost screens
// (see recordAttributedPayments); this route lists the ledger, records money
// partners put into the pool, and corrects lines.

const MAX_AMOUNT = 1_000_000_000_000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const unauthorized = (error: unknown) =>
  NextResponse.json(
    { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
    { status: 401 }
  );

// GET /api/partnership/transactions?partnershipId=&page=1&limit=50&includeVoid=false
// Newest first.
export const GET = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return unauthorized(error);
  }

  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const partnershipId = searchParams.get("partnershipId") || "";
    if (!Types.ObjectId.isValid(partnershipId)) return errorResponse("Valid partnershipId is required", 400);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );
    const includeVoid = searchParams.get("includeVoid") === "true";

    const query: Record<string, unknown> = { partnershipId: new Types.ObjectId(partnershipId) };
    if (!includeVoid) query.status = "active";

    const [transactions, total] = await Promise.all([
      PartnershipTransaction.find(query)
        .sort({ date: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PartnershipTransaction.countDocuments(query),
    ]);

    return successResponse({
      transactions,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("GET /api/partnership/transactions error:", error);
    return errorResponse("Failed to load the partnership account", 500, error);
  }
};

// POST /api/partnership/transactions — a partner puts money into the pool
// body: { partnershipId, partnerId, amount, category: 'initial' | 'additional', date?, description?, recordedBy? }
export const POST = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return unauthorized(error);
  }

  try {
    await connect();
    const body = await req.json();
    const partnershipId = String(body?.partnershipId || "");
    const partnerId = String(body?.partnerId || "");
    const category = String(body?.category || "additional") as ContributionCategory;
    const amount = Number(body?.amount);

    if (!Types.ObjectId.isValid(partnershipId)) return errorResponse("Valid partnershipId is required", 400);
    if (!(CONTRIBUTION_CATEGORIES as readonly string[]).includes(category)) {
      return errorResponse("category must be initial or additional", 400);
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
      return errorResponse("Enter an amount greater than 0", 400);
    }

    let date = new Date();
    if (body?.date) {
      date = new Date(String(body.date));
      if (Number.isNaN(date.getTime())) return errorResponse("date must be a valid date", 400);
    }

    const partnership = await Partnership.findById(partnershipId).lean<PartnershipDoc>();
    if (!partnership) return errorResponse("Partnership not found", 404);
    if (partnership.status !== "active") return errorResponse("This partnership is closed", 400);

    const partner = partnership.partners.find((p) => p.partnerId === partnerId && p.status === "active");
    if (!partner) return errorResponse("Choose a partner on this project", 400);

    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 500) : "";
    const transaction = await PartnershipTransaction.create({
      partnershipId: partnership._id,
      clientId: partnership.clientId,
      projectId: partnership.projectId,
      kind: "contribution",
      category,
      amount: roundMoney(amount),
      paidFrom: "partner",
      partnerId: partner.partnerId,
      partnerName: partner.name,
      description: description || (category === "initial" ? "Initial amount" : "Added to the pool"),
      date,
      recordedBy: resolveActor(req, body),
    });

    return successResponse(transaction.toObject(), "Amount added", 201);
  } catch (error) {
    console.error("POST /api/partnership/transactions error:", error);
    return errorResponse("Failed to add the amount", 500, error);
  }
};

// PATCH /api/partnership/transactions
//   { transactionId, action: 'void', reason? }            — take a wrong line out of the totals
//   { transactionId, action: 'reassign', paidBy }         — fix who paid a payment
export const PATCH = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return unauthorized(error);
  }

  try {
    await connect();
    const body = await req.json();
    const transactionId = String(body?.transactionId || "");
    const action = String(body?.action || "");
    if (!Types.ObjectId.isValid(transactionId)) return errorResponse("Valid transactionId is required", 400);

    const transaction = await PartnershipTransaction.findById(transactionId);
    if (!transaction) return errorResponse("Entry not found", 404);
    if (transaction.status !== "active") return errorResponse("This entry was already removed", 400);

    const actor = resolveActor(req, body);

    if (action === "void") {
      const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";
      transaction.status = "void";
      transaction.voidedAt = new Date();
      transaction.voidReason = reason || "Removed from the partnership account";
      transaction.voidedBy = actor;
      await transaction.save();
      return successResponse(transaction.toObject(), "Entry removed");
    }

    if (action === "reassign") {
      if (transaction.kind !== "payment") return errorResponse("Only payments can change who paid", 400);

      const parsed = parsePaidBy(body?.paidBy);
      if (!parsed.ok) return errorResponse(parsed.error, 400);
      const paidBy = parsed.value;
      if (!paidBy) return errorResponse("Choose who paid", 400);

      if (paidBy.type === "pool") {
        transaction.paidFrom = "pool";
        transaction.partnerId = undefined;
        transaction.partnerName = undefined;
      } else {
        const partnership = await Partnership.findById(transaction.partnershipId).lean<PartnershipDoc>();
        const partner = partnership?.partners.find(
          (p) => p.partnerId === paidBy.partnerId && p.status === "active"
        );
        if (!partner) return errorResponse("Choose a partner on this project", 400);
        transaction.paidFrom = "partner";
        transaction.partnerId = partner.partnerId;
        transaction.partnerName = partner.name;
      }
      await transaction.save();
      return successResponse(transaction.toObject(), "Payment updated");
    }

    return errorResponse("action must be void or reassign", 400);
  } catch (error) {
    console.error("PATCH /api/partnership/transactions error:", error);
    return errorResponse("Failed to update the entry", 500, error);
  }
};
