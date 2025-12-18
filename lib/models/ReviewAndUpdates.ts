import { model, models, Schema } from "mongoose";

const ReviewSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },

  firstName: {
    type: String,
    required: true,
  },

  lastName: {
    type: String,
    required: true,
  },

  review: {
    type: String,
    required: true,
  },
});

const UpdateSchema = new Schema({
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

  reviews: {
    type: [ReviewSchema],
    required: false,
  },
});

const ReviewAndUpdateSchema = new Schema({
  updateSectionType: {
    type: String,
    required: true,
    enum: ["projects", "buildings", "row-house", "other"],
  },

  sectionId: {
    type: String,
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  updates: {
    type: [UpdateSchema],
    required: true,
  },
});

export const ReviewAndUpdates =
  models.ReviewAndUpdates || model("ReviewAndUpdates", ReviewAndUpdateSchema);
