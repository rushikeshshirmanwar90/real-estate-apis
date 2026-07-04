import { model, models, Schema, Model } from "mongoose";

export const MaterialSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    unit: {
      type: String,
      required: true,
    },

    specs: {
      type: Object,
      default: {},
    },

    qnt: {
      type: Number,
      required: true,
    },

    perUnitCost: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },

    cost: {
      type: Number,
      required: false,
      min: 0,
      default: function() {
        return this.totalCost || 0;
      }
    },

    contractor_name: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },

    sectionId: {
      type: String,
      required: false,
    },

    miniSectionId: {
      type: String,
      required: false,
    },

    // Vendor payment — intentionally has NO default so materials added without
    // recording payment stay undefined (the UI shows no payment badge for them,
    // rather than a misleading "Unpaid").
    paymentStatus: {
      type: String,
      enum: ['full', 'partial', 'unpaid'],
      required: false,
    },

    amountPaid: {
      type: Number,
      required: false,
      min: 0,
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

const MaterialActivitySchema = new Schema({
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
    index: true,
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

  sectionId: {
    type: String,
    required: false,
  },

  miniSectionId: {
    type: String,
    required: false,
  },

  materials: {
    type: [MaterialSchema],
    required: true,
  },

  contractor_name: {
    type: String,
    required: false,
    trim: true,
    index: true,
  },

  message: {
    type: String,
    required: false,
  },

  activity: {
    type: String,
    required: true,
    enum: ["imported", "used", "transferred"],
  },

  // Transfer details (only for transferred activities)
  transferDetails: {
    type: {
      fromProject: {
        id: { type: String, required: false },
        name: { type: String, required: false }
      },
      toProject: {
        id: { type: String, required: false },
        name: { type: String, required: false }
      }
    },
    required: false
  },

  date: {
    type: String,
    required: true,
  },
});

// Safe model registration to prevent data loss during redeployment
let MaterialActivity: Model<any>;
try {
  if (models.MaterialActivity) {
    MaterialActivity = models.MaterialActivity;
  } else {
    MaterialActivity = model("MaterialActivity", MaterialActivitySchema);
  }
} catch (error) {
  MaterialActivity = models.MaterialActivity || model("MaterialActivity", MaterialActivitySchema);
}

export { MaterialActivity };