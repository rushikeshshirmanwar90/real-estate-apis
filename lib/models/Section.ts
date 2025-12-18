import { model, models, Schema } from "mongoose";

const SectionSchema = new Schema(
  {
    name: {
      type: String,
      require: true,
    },

    type: {
      type: String,
      require: true,
      enum: ["row-house", "buildings", "other"],
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
    },
  },
  {
    timestamps: true,
  }
);

const Section = models.Section || model("Section", SectionSchema);

export { Section };
