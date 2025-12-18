import { model, models, Schema } from "mongoose";

export const MaterialSchema = new Schema(
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

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const UserSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    fullName: {
      type: String,
      required: true,
    },
  },
  { _id: false, timestamps: false }
);

const MaterialActivitySchema = new Schema({
  user: {
    type: UserSchema,
    required: true,
  },

  clientId: {
    type: String,
    required: true,
  },

  projectId: {
    type: String,
    required: true,
  },

  materials: {
    type: [MaterialSchema],
    required: true,
  },

  message: {
    type: String,
    required: false,
  },

  activity: {
    type: String,
    required: true,
    enum: ["imported", "used"],
  },
  date: {
    type: String,
    required: true,
  },
});

export const MaterialActivity =
  models.MaterialActivity || model("MaterialActivity", MaterialActivitySchema);
