import { Schema, model, models, Model, Types } from "mongoose";

// Tracks a promised payment date for money still owed to a vendor (material
// purchase batch) or a contractor. One live (unresolved) row per entity —
// superseded dates move into `history` instead of piling up new rows, so
// "does this entity currently have an overdue commitment" is a single lookup.

const PaymentCommitmentHistorySchema = new Schema(
  {
    commitmentDate: {
      type: Date,
      required: true,
    },
    amountDueAtTime: {
      type: Number,
      required: false,
      min: 0,
    },
    missedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const CreatedBySchema = new Schema(
  {
    userId: { type: String, required: false },
    fullName: { type: String, required: false },
    userType: { type: String, required: false },
  },
  { _id: false }
);

const PaymentCommitmentSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      required: true,
      index: true,
    },

    // Denormalized so notification copy never needs an extra project lookup.
    projectName: {
      type: String,
      required: true,
    },

    entityType: {
      type: String,
      enum: ["material", "contractor"],
      required: true,
    },

    // MaterialAvailable subdocument _id, or Contractor document _id.
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    // Display name at the time the commitment was made, e.g.
    // "Cement (OPC 53)" or "Ramesh Kumar — Electrical Works".
    entityLabel: {
      type: String,
      required: true,
    },

    // Vendor/contractor name, when known (material batches carry
    // contractor_name; contractor commitments already have the name in
    // entityLabel so this stays empty for those).
    vendorName: {
      type: String,
      required: false,
      trim: true,
    },

    amountDue: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },

    commitmentDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "reminded", "overdue", "resolved"],
      default: "pending",
      index: true,
    },

    // Dedupe markers so the daily cron never sends the same reminder or
    // overdue notification twice for the same commitment date.
    reminderSentAt: {
      type: Date,
      default: null,
    },

    overdueNotifiedAt: {
      type: Date,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolvedReason: {
      type: String,
      enum: ["paid_full", "manually_cleared"],
      required: false,
    },

    history: {
      type: [PaymentCommitmentHistorySchema],
      default: [],
    },

    createdBy: {
      type: CreatedBySchema,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// One live commitment per entity.
PaymentCommitmentSchema.index({ entityType: 1, entityId: 1 }, { unique: true });
// Cron scan: due-soon / overdue rows in date order.
PaymentCommitmentSchema.index({ status: 1, commitmentDate: 1 });
// Dashboard/listing joins.
PaymentCommitmentSchema.index({ clientId: 1, status: 1 });

export interface PaymentCommitmentDoc {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId: Types.ObjectId;
  projectName: string;
  entityType: "material" | "contractor";
  entityId: Types.ObjectId;
  entityLabel: string;
  vendorName?: string;
  amountDue: number;
  totalCost: number;
  commitmentDate: Date;
  status: "pending" | "reminded" | "overdue" | "resolved";
  reminderSentAt: Date | null;
  overdueNotifiedAt: Date | null;
  resolvedAt: Date | null;
  resolvedReason?: "paid_full" | "manually_cleared";
  history: { commitmentDate: Date; amountDueAtTime?: number; missedAt: Date }[];
  createdBy?: { userId?: string; fullName?: string; userType?: string };
  createdAt: Date;
  updatedAt: Date;
}

// Safe model registration to prevent data loss during redeployment
let PaymentCommitment: Model<any>;
try {
  if (models.PaymentCommitment) {
    PaymentCommitment = models.PaymentCommitment;
  } else {
    PaymentCommitment = model("PaymentCommitment", PaymentCommitmentSchema);
  }
} catch (error) {
  PaymentCommitment = models.PaymentCommitment || model("PaymentCommitment", PaymentCommitmentSchema);
}

export { PaymentCommitment };
