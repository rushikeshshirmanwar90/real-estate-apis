import { model, models, Schema } from "mongoose";
import { AmenitiesSchema } from "./utils/Amenities";
import { MaterialSchema } from "./Xsite/materials-activity";

const SectionSchema = new Schema(
  {
    sectionId: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["row house", "building", "other"],
    },
    materialUsed: [MaterialSchema],
    MaterialAvailable: [MaterialSchema],
  },
  { _id: true }
);

const MaterialUsedSchema = new Schema(
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
    cost: {
      type: Number,
      default: 0,
    },
    sectionId: {
      type: String,
      required: true,
    },
    miniSectionId: {
      type: String,
      required: false,
    },
    // explicit addedAt for material usage entries
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const StaffSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    images: {
      type: [String],
      required: false,
    },

    state: {
      type: String,
      required: false,
    },

    city: {
      type: String,
      required: false,
    },

    area: {
      type: String,
      required: false,
    },

    address: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    projectType: {
      type: String,
      required: false,
      enum: ["ongoing", "upcoming", "completed"],
      default: "ongoing",
    },

    longitude: {
      type: Number,
      required: false,
    },

    latitude: {
      type: Number,
      required: false,
    },

    section: {
      type: [SectionSchema],
      required: false,
    },

    amenities: {
      type: [AmenitiesSchema],
      required: false,
    },

    assignedStaff: {
      type: [StaffSchema],
      required: false,
    },

    budget: {
      type: Number,
      required: false,
    },

    spent: {
      type: Number,
      required: false,
      default: 0,
    },

    progress: {
      type: Number,
      required: false,
    },

    MaterialUsed: {
      type: [MaterialUsedSchema],
      required: false,
    },

    MaterialAvailable: {
      type: [MaterialSchema],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Normalize section.type to match enum values before validation
type SectionDoc = { type?: string } & Record<string, unknown>;

projectSchema.pre("validate", function (this: unknown, next) {
  try {
    const doc = this as { section?: SectionDoc[] };
    if (Array.isArray(doc.section)) {
      doc.section.forEach((sec) => {
        if (!sec || !sec.type) return;
        const t = String(sec.type).toLowerCase().trim();
        if (t.includes("build")) {
          sec.type = "building";
        } else if (
          t.includes("row") ||
          t.includes("row house") ||
          t.includes("row-house")
        ) {
          sec.type = "row house";
        } else {
          sec.type = "other";
        }
      });
    }
  } catch {
    // swallow normalization errors - validation will catch invalid values
  }
  next();
});

const Projects = models.Projects || model("Projects", projectSchema);

export { Projects };
