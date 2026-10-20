import { Types } from "mongoose";
import {
  PartnerEntry,
  Partnership,
  PartnershipActor,
  PartnershipDoc,
  PartnerType,
} from "@/lib/models/Xsite/Partnership";
import {
  PartnershipTransaction,
  PAYMENT_CATEGORIES,
  PaymentCategory,
} from "@/lib/models/Xsite/PartnershipTransaction";

// ─── Paid by ────────────────────────────────────────────────────────────────
// Sent by the app's "Paid by" picker on every payment form when the project
// has a partnership: one partner paid out of pocket, or the money came from
// the shared pool.

export type PaidBy = { type: "partner"; partnerId: string } | { type: "pool" };

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const parsePaidBy = (raw: unknown): Result<PaidBy | null> => {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "object") return { ok: false, error: "paidBy must be an object" };

  const value = raw as { type?: unknown; partnerId?: unknown };
  if (value.type === "pool") return { ok: true, value: { type: "pool" } };
  if (value.type === "partner" && typeof value.partnerId === "string" && value.partnerId.trim()) {
    return { ok: true, value: { type: "partner", partnerId: value.partnerId.trim() } };
  }
  return { ok: false, error: "paidBy must be { type: 'pool' } or { type: 'partner', partnerId }" };
};

export interface PaymentAttribution {
  partnership: PartnershipDoc;
  paidBy: PaidBy;
  partner?: PartnerEntry;
}

// Checks the payer against the project's active partnership before the payment
// itself is written, so a bad payer never leaves a half-recorded payment.
// Resolves to null when there's nothing to attribute: no payer was sent (older
// app versions) or the project has no active partnership.
export const resolvePaymentAttribution = async (
  projectId: unknown,
  rawPaidBy: unknown
): Promise<Result<PaymentAttribution | null>> => {
  const parsed = parsePaidBy(rawPaidBy);
  if (!parsed.ok) return parsed;
  const paidBy = parsed.value;
  if (!paidBy) return { ok: true, value: null };

  const id = String(projectId ?? "");
  if (!Types.ObjectId.isValid(id)) return { ok: true, value: null };

  const partnership = await Partnership.findOne({
    projectId: new Types.ObjectId(id),
    status: "active",
  }).lean<PartnershipDoc>();
  if (!partnership) return { ok: true, value: null };

  if (paidBy.type === "pool") return { ok: true, value: { partnership, paidBy } };

  const partner = partnership.partners.find(
    (p) => p.partnerId === paidBy.partnerId && p.status === "active"
  );
  if (!partner) {
    return { ok: false, error: "The selected partner isn't part of this project's partnership" };
  }
  return { ok: true, value: { partnership, paidBy, partner } };
};

// ─── Recording payments ─────────────────────────────────────────────────────

export interface LedgerPaymentLine {
  category: PaymentCategory;
  amount: number;
  // Ids of the cost row this money paid for; deleting that row voids the line
  sourceIds: Array<string | Types.ObjectId | null | undefined>;
  label?: string;
  description?: string;
  date?: Date;
}

export interface LedgerResult {
  status: "recorded" | "skipped" | "failed";
  count: number;
  message?: string;
}

// Writes ledger lines for payments that were just saved. Never throws: the
// payment has already succeeded, so a ledger problem is reported back to the
// app (which tells the user) instead of failing the whole request.
export const recordAttributedPayments = async (
  attribution: PaymentAttribution | null,
  lines: LedgerPaymentLine[],
  recordedBy?: PartnershipActor
): Promise<LedgerResult> => {
  if (!attribution) return { status: "skipped", count: 0 };

  const docs = lines
    .filter((line) => roundMoney(Number(line.amount) || 0) > 0)
    .map((line) => ({
      partnershipId: attribution.partnership._id,
      clientId: attribution.partnership.clientId,
      projectId: attribution.partnership.projectId,
      kind: "payment",
      category: line.category,
      amount: roundMoney(Number(line.amount)),
      paidFrom: attribution.paidBy.type,
      partnerId: attribution.partner?.partnerId,
      partnerName: attribution.partner?.name,
      source: {
        entity: line.category,
        ids: line.sourceIds.filter(Boolean).map(String),
        label: line.label,
      },
      description: line.description || line.label || "",
      date: line.date || new Date(),
      recordedBy,
    }));

  if (docs.length === 0) return { status: "skipped", count: 0 };

  try {
    await PartnershipTransaction.insertMany(docs);
    return { status: "recorded", count: docs.length };
  } catch (error) {
    console.error("⚠️ Partnership ledger write failed (the payment itself was saved):", error);
    return {
      status: "failed",
      count: 0,
      message: "Payment saved, but it couldn't be added to the partnership account",
    };
  }
};

// Folds per-item results (a request can record several payments) into one
export const combineLedgerResults = (results: LedgerResult[]): LedgerResult => {
  const failed = results.find((r) => r.status === "failed");
  if (failed) return { status: "failed", count: 0, message: failed.message };
  const count = results.reduce((sum, r) => sum + r.count, 0);
  return count > 0 ? { status: "recorded", count } : { status: "skipped", count: 0 };
};

// Called when a cost row is deleted, so its money stops counting toward the
// partnership. Lines are voided (kept for the audit trail), never deleted.
export const voidLedgerForSource = async (
  entity: PaymentCategory,
  ids: Array<string | Types.ObjectId | null | undefined>,
  reason: string
): Promise<number> => {
  const idList = ids.filter(Boolean).map(String);
  if (idList.length === 0) return 0;

  try {
    const result = await PartnershipTransaction.updateMany(
      { status: "active", "source.entity": entity, "source.ids": { $in: idList } },
      { $set: { status: "void", voidedAt: new Date(), voidReason: reason } }
    );
    return result.modifiedCount || 0;
  } catch (error) {
    console.error(`⚠️ Failed to void partnership ledger lines for ${entity}:`, error);
    return 0;
  }
};

// ─── Who is recording ───────────────────────────────────────────────────────
// Partnership screens send `recordedBy`; the cost screens send `user` in the
// body or the x-user-details header, so all three are accepted.

interface ActorInput {
  userId?: unknown;
  _id?: unknown;
  id?: unknown;
  fullName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  name?: unknown;
  userType?: unknown;
  role?: unknown;
}

const asText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const toActor = (raw: unknown): PartnershipActor | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as ActorInput;
  const fullName =
    asText(input.fullName) ||
    [asText(input.firstName), asText(input.lastName)].filter(Boolean).join(" ") ||
    asText(input.name);
  const rawId = input.userId ?? input._id ?? input.id;
  const userId = rawId ? String(rawId) : undefined;
  if (!userId && !fullName) return undefined;
  return {
    userId,
    fullName,
    userType: asText(input.userType) || (input.role ? "staff" : undefined),
  };
};

export const resolveActor = (req: Request, body?: unknown): PartnershipActor | undefined => {
  const fields = (body && typeof body === "object" ? body : {}) as { recordedBy?: unknown; user?: unknown };
  const fromBody = toActor(fields.recordedBy) || toActor(fields.user);
  if (fromBody) return fromBody;

  const header = req.headers.get("x-user-details");
  if (!header) return undefined;
  try {
    return toActor(JSON.parse(header));
  } catch {
    return undefined;
  }
};

export const staffDisplayName = (staff: { firstName?: string; lastName?: string; email?: string }) =>
  [staff.firstName, staff.lastName].filter(Boolean).join(" ").trim() || staff.email || "Partner";

// ─── Summary ────────────────────────────────────────────────────────────────

type ByCategory = Record<PaymentCategory, number> & { total: number };

const emptyByCategory = (): ByCategory => ({
  material: 0,
  contractor: 0,
  labor: 0,
  equipment: 0,
  other: 0,
  total: 0,
});

export interface PartnerSummary {
  partnerId: string;
  partnerType: PartnerType;
  name: string;
  status: "active" | "removed";
  // Money put into the pool
  contributed: { initial: number; additional: number; total: number };
  // Project payments made out of their own pocket
  paid: ByCategory;
  // contributed.total + paid.total
  total: number;
  // Share of everything the partners have put in, 0 until money arrives
  sharePercent: number;
}

export interface PartnershipSummary {
  partners: PartnerSummary[];
  pool: {
    deposited: number;
    spent: ByCategory;
    // Can go negative when more was paid from the pool than went into it
    balance: number;
  };
  totals: {
    contributed: number;
    paidByPartners: number;
    paidFromPool: number;
    // Every tracked project payment, whoever paid it
    spent: number;
    // Everything the partners have put in: contributions + direct payments
    invested: number;
  };
  transactionCount: number;
}

interface LedgerGroupRow {
  _id: {
    partnershipId: Types.ObjectId;
    kind: "contribution" | "payment";
    category: string;
    paidFrom: "partner" | "pool";
    partnerId?: string;
  };
  amount: number;
  count: number;
  partnerName?: string;
}

const isPaymentCategory = (category: string): category is PaymentCategory =>
  (PAYMENT_CATEGORIES as readonly string[]).includes(category);

// One aggregation for any number of partnerships, folded per partnership.
export const buildSummaries = async (
  partnerships: PartnershipDoc[]
): Promise<Map<string, PartnershipSummary>> => {
  const summaries = new Map<string, PartnershipSummary>();
  if (partnerships.length === 0) return summaries;

  const rows: LedgerGroupRow[] = await PartnershipTransaction.aggregate([
    {
      $match: {
        partnershipId: { $in: partnerships.map((p) => p._id) },
        status: "active",
      },
    },
    {
      $group: {
        _id: {
          partnershipId: "$partnershipId",
          kind: "$kind",
          category: "$category",
          paidFrom: "$paidFrom",
          partnerId: "$partnerId",
        },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
        partnerName: { $first: "$partnerName" },
      },
    },
  ]);

  for (const partnership of partnerships) {
    const key = String(partnership._id);
    const ownRows = rows.filter((row) => String(row._id.partnershipId) === key);

    const byPartner = new Map<string, PartnerSummary>();
    const partnerRow = (partnerId: string, fallbackName?: string): PartnerSummary => {
      let summary = byPartner.get(partnerId);
      if (!summary) {
        summary = {
          partnerId,
          partnerType: "staff",
          name: fallbackName || "Former partner",
          status: "removed",
          contributed: { initial: 0, additional: 0, total: 0 },
          paid: emptyByCategory(),
          total: 0,
          sharePercent: 0,
        };
        byPartner.set(partnerId, summary);
      }
      return summary;
    };

    for (const partner of partnership.partners) {
      const summary = partnerRow(partner.partnerId, partner.name);
      summary.partnerType = partner.partnerType;
      summary.name = partner.name;
      summary.status = partner.status;
    }

    const pool = { deposited: 0, spent: emptyByCategory(), balance: 0 };
    let transactionCount = 0;

    for (const row of ownRows) {
      const amount = Number(row.amount) || 0;
      const { kind, category, paidFrom, partnerId } = row._id;
      transactionCount += row.count;

      if (kind === "contribution" && partnerId) {
        const summary = partnerRow(partnerId, row.partnerName);
        if (category === "initial") summary.contributed.initial += amount;
        else summary.contributed.additional += amount;
        summary.contributed.total += amount;
        pool.deposited += amount;
      } else if (kind === "payment" && isPaymentCategory(category)) {
        if (paidFrom === "pool") {
          pool.spent[category] += amount;
          pool.spent.total += amount;
        } else if (partnerId) {
          const summary = partnerRow(partnerId, row.partnerName);
          summary.paid[category] += amount;
          summary.paid.total += amount;
        }
      }
    }

    // Removed partners with no money on record add nothing to the picture
    const partnerSummaries = Array.from(byPartner.values()).filter(
      (p) => p.status === "active" || p.contributed.total > 0 || p.paid.total > 0
    );

    let invested = 0;
    for (const p of partnerSummaries) {
      p.contributed.initial = roundMoney(p.contributed.initial);
      p.contributed.additional = roundMoney(p.contributed.additional);
      p.contributed.total = roundMoney(p.contributed.total);
      for (const category of PAYMENT_CATEGORIES) p.paid[category] = roundMoney(p.paid[category]);
      p.paid.total = roundMoney(p.paid.total);
      p.total = roundMoney(p.contributed.total + p.paid.total);
      invested += p.total;
    }
    for (const p of partnerSummaries) {
      p.sharePercent = invested > 0 ? Math.round((p.total / invested) * 1000) / 10 : 0;
    }

    // Owner first, then everyone else by what they've put in
    partnerSummaries.sort((a, b) => {
      if (a.partnerType !== b.partnerType) return a.partnerType === "owner" ? -1 : 1;
      return b.total - a.total;
    });

    pool.deposited = roundMoney(pool.deposited);
    for (const category of PAYMENT_CATEGORIES) pool.spent[category] = roundMoney(pool.spent[category]);
    pool.spent.total = roundMoney(pool.spent.total);
    pool.balance = roundMoney(pool.deposited - pool.spent.total);

    const paidByPartners = roundMoney(partnerSummaries.reduce((sum, p) => sum + p.paid.total, 0));
    summaries.set(key, {
      partners: partnerSummaries,
      pool,
      totals: {
        contributed: pool.deposited,
        paidByPartners,
        paidFromPool: pool.spent.total,
        spent: roundMoney(paidByPartners + pool.spent.total),
        invested: roundMoney(invested),
      },
      transactionCount,
    });
  }

  return summaries;
};
