import { Schema, model, models } from "mongoose";

const PaymentSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    percentage: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const PropertySchema = new Schema({
  projectId: {
    type: String,
    required: true,
  },
  projectName: {
    type: String,
    required: true,
  },
  sectionId: {
    type: String,
    required: true,
  },
  sectionName: {
    type: String,
    required: true,
  },
  sectionType: {
    type: String,
    required: true,
    enum: ["row house", "Buildings"],
  },
  flatId: {
    type: String,
    required: false,
    default: "",
  },
  flatName: {
    type: String,
    required: true,
    default: "",
  },
  payments: {
    type: [PaymentSchema],
    required: false,
  },
});

const CustomerDetailsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    property: {
      type: [PropertySchema],
      required: true,
    },
    flatInfoId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "FlatInfo",
    },
  },
  {
    timestamps: true,
  }
);

export const CustomerDetails =
  models.CustomerDetails || model("CustomerDetails", CustomerDetailsSchema);
