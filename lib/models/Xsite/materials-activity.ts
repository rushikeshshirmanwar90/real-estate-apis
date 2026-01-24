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

    perUnitCost: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },

    cost: {
      type: Number,
      required: false,
      min: 0,
      default: function() {
        return this.totalCost || 0;
      }
    },

    sectionId: {
      type: String,
      required: false,
    },

    miniSectionId: {
      type: String,
      required: false,
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

  projectName: {
    type: String,
    required: false,
  },

  sectionName: {
    type: String,
    required: false,
  },

  miniSectionName: {
    type: String,
    required: false,
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