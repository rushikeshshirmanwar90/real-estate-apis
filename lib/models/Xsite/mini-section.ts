import { model, models, Schema, Model } from "mongoose";
import { MaterialSchema } from "./materials-activity";
import { EmbeddedLaborSchema } from "./Labor";

const SectionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    sectionId: {
      type: String,
      required: false,
      trim: true,
    },

    projectId: {
      type: String,
      required: false,
      trim: true,
    },

    projectDetails: {
      projectName: {
        type: String,
        required: false,
        trim: true,
      },
      projectId: {
        type: String,
        required: false,
        trim: true,
      },
    },

    mainSectionDetails: {
      sectionName: {
        type: String,
        required: false,
        trim: true,
      },
      sectionId: {
        type: String,
        required: false,
        trim: true,
      },
    },

    description: {
      type: String,
      required: false,
    },

    images: {
      type: [String],
      required: false,
    },

    MaterialUsed: {
      type: [MaterialSchema],
      required: false,
    },

    Labors: {
      type: [EmbeddedLaborSchema],
      required: false,
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      required: false,
    },

    completedBy: {
      type: String,
      required: false,
    },

    // References a Phase subdocument _id within this mini-section's parent
    // section's ConstructionTracker document — see lib/models/Xsite/construction-tracker.ts
    activePhaseId: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

// Pre-save hook to automatically synchronize root and nested IDs
SectionSchema.pre("save", function (next) {
  if (!this.sectionId && this.mainSectionDetails?.sectionId) {
    this.sectionId = this.mainSectionDetails.sectionId;
  }
  if (!this.projectId && this.projectDetails?.projectId) {
    this.projectId = this.projectDetails.projectId;
  }
  if (!this.mainSectionDetails?.sectionId && this.sectionId) {
    this.mainSectionDetails = {
      ...(this.mainSectionDetails || {}),
      sectionId: this.sectionId,
    };
  }
  if (!this.projectDetails?.projectId && this.projectId) {
    this.projectDetails = {
      ...(this.projectDetails || {}),
      projectId: this.projectId,
    };
  }
  next();
});

// Safe model registration to prevent data loss during redeployment
let MiniSection: Model<any>;
try {
  if (models.MiniSection) {
    MiniSection = models.MiniSection;
  } else {
    MiniSection = model("MiniSection", SectionSchema);
  }
} catch (error) {
  MiniSection = models.MiniSection || model("MiniSection", SectionSchema);
}

export { MiniSection };
