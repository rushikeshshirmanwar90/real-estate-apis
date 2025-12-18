import { Schema, model, models } from "mongoose";

const CustomerSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
    },

    password: {
      type: String,
      required: false,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "client",
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Customer = models.User || model("User", CustomerSchema);
