import { model, models, Schema } from "mongoose";

const propertyDetailsSchema = new Schema(
  {
    name: { type: String, required: true },
    id: { type: String, required: true },
  },
  {
    _id: false,
  }
);

const userDetailsSchema = new Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  {
    _id: false,
  }
);

const LeadSchema = new Schema({
  clientId: {
    type: String,
    required: true,
  },

  projectName: {
    type: String,
    required: true,
  },

  projectType: {
    type: String,
    enum: ["building", "rowhouse"],
    required: true,
  },

  propertyDetails: {
    type: propertyDetailsSchema,
    required: true,
  },

  userDetails: {
    type: userDetailsSchema,
    required: true,
  },
});

const Lead = models.Lead || model("Lead", LeadSchema);

export { Lead };
