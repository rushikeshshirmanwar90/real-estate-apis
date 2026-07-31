import { model, models, Schema, Model } from "mongoose";

// A vendor bill photo captured on the payment step of the Add Material form.
// Only the hosted URL is stored (never the binary), so activity documents stay
// small and the notification feed can render thumbnails straight from the CDN.
export const BillImageSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    // Cloudinary public_id — kept so a bill can be replaced or deleted later.
    publicId: {
      type: String,
      required: false,
      trim: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

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

    // Vendor bill date entered by the user on the payment step. Optional —
    // materials added before this field existed (or without a bill) stay undefined.
    billingDate: {
      type: Date,
      required: false,
    },

    // Photos of the vendor bill uploaded on the payment step. `default: undefined`
    // (not []) so materials added without a bill stay undefined and the UI shows
    // no bill section for them, matching how paymentStatus behaves above.
    billImages: {
      type: [BillImageSchema],
      required: false,
      default: undefined,
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

  // Bill photos for the whole batch, mirrored up from the materials. One bill
  // normally covers every material in a single purchase, so keeping a copy here
  // lets the notification feed render it without scanning each material.
  billImages: {
    type: [BillImageSchema],
    required: false,
    default: undefined,
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