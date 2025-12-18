import { model, models, Schema } from "mongoose";

const SectionSchema = new Schema(
  {
    sectionId: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: false,
    },

    type: {
      type: String,
      enum: ["building", "row-house", "other", "basic"],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const FlatSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    flatId: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const updateSchema = new Schema(
  {
    projectId: {
      type: String,
      required: true,
    },

    Section: {
      type: SectionSchema,
      required: true,
    },

    Flat: {
      type: FlatSchema,
      required: false,
    },

    images: {
      type: [String],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Updates = models.Updates || model("Updates", updateSchema);
