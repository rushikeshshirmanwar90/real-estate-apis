import { model, models, Schema } from "mongoose";
import { MaterialSchema } from "./Xsite/materials-activity";
import { EmbeddedLaborSchema } from "./Xsite/Labor";

const MiniSectionSchema = new Schema({
  name: {
    type: String,
    required: true,
  },

  sectionId: {
    type: String,
    required: true,
  },

  projectId: {
    type: String,
    required: true,
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
}, {
  timestamps: true,
});

// Safe model registration to prevent data loss during redeployment
let MiniSection;
try {
  if (models.MiniSection) {
    MiniSection = models.MiniSection;
  } else {
    MiniSection = model("MiniSection", MiniSectionSchema);
  }
} catch (error) {
  MiniSection = models.MiniSection || model("MiniSection", MiniSectionSchema);
}

export { MiniSection };