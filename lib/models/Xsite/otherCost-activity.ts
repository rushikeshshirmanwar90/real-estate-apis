import { model, models, Schema, Model } from "mongoose";

// Embedded item schema describing a single other-cost line inside an activity log
const OtherCostItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: false,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    unit: {
      type: String,
      required: false,
      default: 'item',
    },

    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'paid'],
      default: 'pending',
    },

    sectionId: {
      type: String,
      required: false,
    },

    miniSectionId: {
      type: String,
      required: false,
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const UserSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    fullName: {
      type: String,
      required: true,
    },

    userType: {
      type: String,
      enum: ["admin", "staff"],
      required: false, // Optional for backward compatibility
    },
  },
  { _id: false, timestamps: false }
);

const OtherCostActivitySchema = new Schema({
  user: {
    type: UserSchema,
    required: true,
  },

  clientId: {
    type: String,
    required: true,
  },

  projectId: {
    type: String,
    required: true,
  },

  projectName: {
    type: String,
    required: false,
  },

  sectionName: {
    type: String,
    required: false,
  },

  miniSectionName: {
    type: String,
    required: false,
  },

  otherCosts: {
    type: [OtherCostItemSchema],
    required: true,
  },

  message: {
    type: String,
    required: false,
  },

  activity: {
    type: String,
    required: true,
    enum: ["added", "updated", "approved"],
    default: "added",
  },

  date: {
    type: String,
    required: true,
  },
});

// Safe model registration to prevent data loss during redeployment
let OtherCostActivity: Model<any>;
try {
  if (models.OtherCostActivity) {
    OtherCostActivity = models.OtherCostActivity;
  } else {
    OtherCostActivity = model("OtherCostActivity", OtherCostActivitySchema);
  }
} catch (error) {
  OtherCostActivity = models.OtherCostActivity || model("OtherCostActivity", OtherCostActivitySchema);
}

export { OtherCostActivity };
