import { Model, model, models, Schema, Types } from "mongoose";

// A partnership covers one project. The business (the client account) is always
// a partner; the admin adds registered staff members as further partners. Money
// the partners put into the project's pool, and every payment made on the
// project, is kept in PartnershipTransaction so the app can show who has given
// how much.

export type PartnerType = "owner" | "staff";
export type PartnerStatus = "active" | "removed";

export interface PartnerEntry {
  partnerId: string;
  partnerType: PartnerType;
  name: string;
  email?: string;
  phoneNumber?: string;
  status: PartnerStatus;
  addedAt: Date;
  removedAt?: Date | null;
}

export interface PartnershipActor {
  userId?: string;
  fullName?: string;
  userType?: string;
}

export interface PartnershipDoc {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId: Types.ObjectId;
  projectName: string;
  partners: PartnerEntry[];
  status: "active" | "closed";
  createdBy?: PartnershipActor;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema = new Schema(
  {
    // Client _id for the business (owner); Staff _id for staff partners
    partnerId: {
      type: String,
      required: true,
    },
    partnerType: {
      type: String,
      enum: ["owner", "staff"],
      required: true,
    },
    // Denormalized display name, kept as it was when the partner was added
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: false,
      trim: true,
    },
    // Removed partners stay on the record so their past money is still shown
    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    removedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

export const PartnershipActorSchema = new Schema(
  {
    userId: { type: String, required: false },
    fullName: { type: String, required: false },
    userType: { type: String, required: false },
  },
  { _id: false }
);

const PartnershipSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    // One partnership per project
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      required: true,
      unique: true,
    },

    // Denormalized so partnership lists never need a project lookup
    projectName: {
      type: String,
      required: true,
    },

    partners: {
      type: [PartnerSchema],
      default: [],
    },

    // A closed partnership keeps its history but no longer takes new money
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },

    createdBy: {
      type: PartnershipActorSchema,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Staff partners load "my partnerships" by their own id
PartnershipSchema.index({ "partners.partnerId": 1, status: 1 });

// Safe model registration to prevent data loss during redeployment
let Partnership: Model<any>;
try {
  if (models.Partnership) {
    Partnership = models.Partnership;
  } else {
    Partnership = model("Partnership", PartnershipSchema);
  }
} catch (error) {
  Partnership = models.Partnership || model("Partnership", PartnershipSchema);
}

export { Partnership };
