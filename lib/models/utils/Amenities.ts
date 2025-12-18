import { Schema } from "mongoose";

export const AmenitiesSchema = new Schema(
  {
    icon: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);
