import { model, models, Schema } from "mongoose";
import { MaterialSchema } from "./Xsite/materials-activity";
import { EmbeddedLaborSchema } from "./Xsite/Labor";
import { EmbeddedOtherCostSchema } from "./Xsite/OtherCost";

const OtherSectionSchema = new Schema({
  name: {
    type: String,
    require: true,
  },

  projectId: {
    type: String,
    require: true,
  },

  images: {
    type: [String],
    require: false,
  },

  area: {
    type: Number,
    require: false,
  },

  description: {
    type: String,
    require: false,
  },

  MaterialUsed: {
    type: [MaterialSchema],
    required: false,
  },

  Labors: {
    type: [EmbeddedLaborSchema],
    required: false,
  },

  OtherCosts: {
    type: [EmbeddedOtherCostSchema],
    required: false,
  },

  isCompleted: {
    type: Boolean,
    default: false,
  },
});

// Safe model registration to prevent data loss during redeployment
let OtherSection;
try {
  if (models.OtherSection) {
    OtherSection = models.OtherSection;
  } else {
    OtherSection = model("OtherSection", OtherSectionSchema);
  }
} catch (error) {
  OtherSection = models.OtherSection || model("OtherSection", OtherSectionSchema);
}

export { OtherSection };
