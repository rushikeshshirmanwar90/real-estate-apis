import connect from "@/lib/db";
import { PaymentCommitment, PaymentCommitmentDoc } from "@/lib/models/Xsite/PaymentCommitment";
import { Types } from "mongoose";

export interface UpsertCommitmentInput {
  clientId: string | Types.ObjectId;
  projectId: string | Types.ObjectId;
  projectName: string;
  entityType: "material" | "contractor";
  entityId: string | Types.ObjectId;
  entityLabel: string;
  vendorName?: string;
  amountDue: number;
  totalCost: number;
  commitmentDate: Date | string;
  createdBy?: { userId?: string; fullName?: string; userType?: string };
}

/**
 * Create a commitment for an entity, or — if one already exists and is
 * unresolved — refresh its amountDue/totalCost in place without touching the
 * commitmentDate/status. A partial payment reducing the balance shouldn't
 * silently move the promise date; only `recommitCommitment` does that.
 */
export const upsertCommitment = async (
  input: UpsertCommitmentInput
): Promise<PaymentCommitmentDoc> => {
  await connect();

  const existing = await PaymentCommitment.findOne({
    entityType: input.entityType,
    entityId: input.entityId,
  });

  if (existing && existing.status !== "resolved") {
    existing.amountDue = input.amountDue;
    existing.totalCost = input.totalCost;
    if (input.vendorName) existing.vendorName = input.vendorName;
    await existing.save();
    return existing.toObject();
  }

  // Either no commitment exists yet, or the previous one was resolved
  // (fully paid) and a new balance has since appeared — start fresh.
  const created = await PaymentCommitment.create({
    clientId: input.clientId,
    projectId: input.projectId,
    projectName: input.projectName,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    vendorName: input.vendorName,
    amountDue: input.amountDue,
    totalCost: input.totalCost,
    commitmentDate: new Date(input.commitmentDate),
    status: "pending",
    createdBy: input.createdBy,
  });

  return created.toObject();
};

/**
 * The "missed it, here's the next date" flow. Pushes the superseded date
 * into history and re-arms the reminder/overdue cycle for the new date.
 */
export const recommitCommitment = async (
  commitmentId: string,
  newCommitmentDate: Date | string
): Promise<PaymentCommitmentDoc | null> => {
  await connect();

  const commitment = await PaymentCommitment.findById(commitmentId);
  if (!commitment) return null;

  commitment.history.push({
    commitmentDate: commitment.commitmentDate,
    amountDueAtTime: commitment.amountDue,
    missedAt: new Date(),
  });
  commitment.commitmentDate = new Date(newCommitmentDate);
  commitment.status = "pending";
  commitment.reminderSentAt = null;
  commitment.overdueNotifiedAt = null;
  commitment.resolvedAt = null;
  commitment.resolvedReason = undefined;

  await commitment.save();
  return commitment.toObject();
};

/**
 * Silently resolves a commitment (no notification — only the cron notifies).
 * Called from the payment-recording routes the moment a balance hits zero.
 */
export const autoResolveCommitment = async (
  entityType: "material" | "contractor",
  entityId: string | Types.ObjectId,
  resolvedReason: "paid_full" | "manually_cleared" = "paid_full"
): Promise<void> => {
  await connect();

  await PaymentCommitment.updateMany(
    { entityType, entityId, status: { $ne: "resolved" } },
    { $set: { status: "resolved", resolvedAt: new Date(), resolvedReason } }
  );
};

/**
 * Resolve a commitment by its own id (manual write-off from the app).
 */
export const resolveCommitmentById = async (
  commitmentId: string
): Promise<PaymentCommitmentDoc | null> => {
  await connect();

  const commitment = await PaymentCommitment.findByIdAndUpdate(
    commitmentId,
    { $set: { status: "resolved", resolvedAt: new Date(), resolvedReason: "manually_cleared" } },
    { new: true }
  );
  return commitment ? commitment.toObject() : null;
};

/**
 * Refreshes amountDue/totalCost on an existing, unresolved commitment for an
 * entity — a no-op if none exists. Used where the caller has a new balance
 * but no new commitmentDate to record (e.g. a plain payment top-up), so it
 * must never create a commitment that would need a date it doesn't have.
 */
export const refreshCommitmentAmountIfActive = async (
  entityType: "material" | "contractor",
  entityId: string | Types.ObjectId,
  amountDue: number,
  totalCost: number
): Promise<void> => {
  await connect();

  await PaymentCommitment.updateOne(
    { entityType, entityId, status: { $ne: "resolved" } },
    { $set: { amountDue, totalCost } }
  );
};

/**
 * Batch lookup for GET listings — one query per screen load, keyed by
 * entityId so the caller can attach `commitment` to each row.
 */
export const findActiveCommitments = async (
  entityType: "material" | "contractor",
  entityIds: (string | Types.ObjectId)[]
): Promise<Map<string, PaymentCommitmentDoc>> => {
  await connect();

  if (entityIds.length === 0) return new Map();

  const rows = await PaymentCommitment.find({
    entityType,
    entityId: { $in: entityIds },
    status: { $ne: "resolved" },
  }).lean();

  const map = new Map<string, PaymentCommitmentDoc>();
  rows.forEach((row: any) => {
    map.set(String(row.entityId), row as PaymentCommitmentDoc);
  });
  return map;
};
