import { models, model, Schema } from "mongoose";

const AdminSchema = new Schema({
  clientId: {
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

  email: {
    type: String,
    required: true,
  },

  phoneNumber: {
    type: Number,
    required: true,
  },

  password: {
    type: String,
    required: false,
  },
});

export const Admin = models.Admin || model("Admin", AdminSchema);
