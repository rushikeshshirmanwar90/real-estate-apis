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

// Safe model registration to prevent data loss during redeployment
let Section;
try {
  if (models.Section) {
    Section = models.Section;
  } else {
    Section = model("Section", SectionSchema);
  }
} catch (error) {
  Section = models.Section || model("Section", SectionSchema);
}

export { Section };
