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

// Safe model registration to prevent data loss during redeployment
let Admin;
try {
  if (models.Admin) {
    Admin = models.Admin;
  } else {
    Admin = model("Admin", AdminSchema);
  }
} catch (error) {
  Admin = models.Admin || model("Admin", AdminSchema);
}

export { Admin };
