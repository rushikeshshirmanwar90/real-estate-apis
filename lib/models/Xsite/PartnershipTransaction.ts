import { Model, model, models, Schema, Types } from "mongoose";
import { PartnershipActor, PartnershipActorSchema } from "./Partnership";

// One line in a project partnership's ledger.
//
//   contribution — money a partner puts into the pool (the initial amount or a
//                  later top-up)
//   payment      — a project expense, paid by one partner out of their own
//                  pocket or taken from the pool
//
// Payments recorded through the regular cost screens carry `source`, which
// points back at the cost row (material batch, contractor, labor entry…) so
// deleting that row voids its line here. Lines are never hard-deleted.

export const TRANSACTION_KINDS = ["contribution", "payment"] as const;
export const CONTRIBUTION_CATEGORIES = ["initial", "additional"] as const;
export const PAYMENT_CATEGORIES = ["material", "contractor", "labor", "equipment", "other"] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number];
export type ContributionCategory = (typeof CONTRIBUTION_CATEGORIES)[number];
export type PaymentCategory = (typeof PAYMENT_CATEGORIES)[number];
export type TransactionCategory = ContributionCategory | PaymentCategory;
export type PaidFrom = "partner" | "pool";

export interface PartnershipTransactionDoc {
  _id: Types.ObjectId;
  partnershipId: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId: Types.ObjectId;
  kind: TransactionKind;
  category: TransactionCategory;
  amount: number;
  paidFrom: PaidFrom;
  partnerId?: string;
  partnerName?: string;
  source?: { entity: PaymentCategory; ids: string[]; label?: string };
  description: string;
  date: Date;
  status: "active" | "void";
  voidedAt?: Date | null;
  voidReason?: string;
  voidedBy?: PartnershipActor;
  recordedBy?: PartnershipActor;
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema = new Schema(
  {
    entity: {
      type: String,
      enum: [...PAYMENT_CATEGORIES],
      required: true,
    },
    // Every id the cost row is known by (e.g. embedded and standalone labor ids)
    ids: {
      type: [String],
      default: [],
    },
    // e.g. "Cement (OPC 53) — Shree Traders" or "Ramesh Kumar — Electrical Works"
    label: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { _id: false }
);

const PartnershipTransactionSchema = new Schema(
  {
    partnershipId: {
      type: Schema.Types.ObjectId,
      ref: "Partnership",
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      required: true,
    },
    kind: {
      type: String,
      enum: [...TRANSACTION_KINDS],
      required: true,
    },
    category: {
      type: String,
      enum: [...CONTRIBUTION_CATEGORIES, ...PAYMENT_CATEGORIES],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    // Contributions always come from a partner; payments from a partner or the pool
    paidFrom: {
      type: String,
      enum: ["partner", "pool"],
      required: true,
    },
    partnerId: {
      type: String,
      required: false,
    },
    // Name at the time, so the ledger still reads right after a partner leaves
    partnerName: {
      type: String,
      required: false,
    },
    source: {
      type: SourceSchema,
      required: false,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    // When the money actually moved (can be earlier than createdAt)
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "void"],
      default: "active",
    },
    voidedAt: {
      type: Date,
      default: null,
    },
    voidReason: {
      type: String,
      required: false,
      trim: true,
    },
    voidedBy: {
      type: PartnershipActorSchema,
      required: false,
    },
    recordedBy: {
      type: PartnershipActorSchema,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ledger listing and summary aggregation
PartnershipTransactionSchema.index({ partnershipId: 1, status: 1, date: -1 });
// Voiding the lines of a deleted cost row
PartnershipTransactionSchema.index({ "source.entity": 1, "source.ids": 1 });

// Safe model registration to prevent data loss during redeployment
let PartnershipTransaction: Model<any>;
try {
  if (models.PartnershipTransaction) {
    PartnershipTransaction = models.PartnershipTransaction;
  } else {
    PartnershipTransaction = model("PartnershipTransaction", PartnershipTransactionSchema);
  }
} catch (error) {
  PartnershipTransaction =
    models.PartnershipTransaction || model("PartnershipTransaction", PartnershipTransactionSchema);
}

export { PartnershipTransaction };
