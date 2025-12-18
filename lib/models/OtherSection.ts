import { model, models, Schema } from "mongoose";
import { MaterialSchema } from "./Xsite/materials-activity";

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
});

export const OtherSection =
  models.OtherSection || model("OtherSection", OtherSectionSchema);
