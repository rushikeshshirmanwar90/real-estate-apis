import { model, models, Schema, Model } from "mongoose";
import { MaterialSchema } from "./materials-activity";

const SectionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    projectDetails: {
      projectName: {
        type: String,
        required: true,
        trim: true,
      },
      projectId: {
        type: String,
        required: true,
        trim: true,
      },
    },

    mainSectionDetails: {
      // project section
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

    MaterialUsed: {
      type: [MaterialSchema],
      required: false,
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    // References a Phase subdocument _id within this mini-section's parent
    // section's ConstructionTracker document — see lib/models/Xsite/construction-tracker.ts
    activePhaseId: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

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
