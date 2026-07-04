import { Schema, model, models } from "mongoose";

const ContractorSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      required: true,
    },
    sectionId: {
      type: String,
      required: false,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    contractType: {
      type: String,
      required: true,
    },
    paymentSchedule: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    usedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    payments: {
      type: [
        {
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          paymentDate: {
            type: Date,
            default: Date.now,
          },
          paymentType: {
            type: String,
            enum: ["daily", "weekly", "monthly", "advance", "final"],
            required: true,
          },
          notes: {
            type: String,
            required: false,
          },
        },
      ],
      default: [],
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

let Contractor;
try {
  if (models.Contractor) {
    Contractor = models.Contractor;
  } else {
    Contractor = model("Contractor", ContractorSchema);
  }
} catch (error) {
  Contractor = models.Contractor || model("Contractor", ContractorSchema);
}

export { Contractor };
