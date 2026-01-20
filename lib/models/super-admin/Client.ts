import { model, models, Schema } from "mongoose";

const clientSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    staffs: {
      type: [String],
      required: false
    },
    logo: {
      type: String,
      required: false, // Changed to false since it's optional in the form
    },
    license: {
      type: Number,
      required: false,
      default: 0
    }
  },
  {
    timestamps: true,
  }
);

export const Client = models.Client || model("Client", clientSchema);
