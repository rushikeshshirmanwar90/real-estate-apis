import mongoose, { Schema, model, models } from "mongoose";

/**
 * A support/contact phone number added by the admin from the Shivai app.
 * Numbers belong to a project (a project can have many); customers see the
 * numbers of their own project(s) on the home screen and can tap to call.
 */
const ContactNumberSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      required: true,
      index: true,
    },
    // Denormalized for display (same pattern as Booking.projectName)
    projectName: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Dev hot-reload keeps the previously registered model (and its old schema).
// If the cached schema is missing newer fields, drop it so it re-registers.
if (models.ContactNumber && !models.ContactNumber.schema.path("projectId")) {
  mongoose.deleteModel("ContactNumber");
}

// Safe model registration to prevent data loss during redeployment
let ContactNumber;
try {
  if (models.ContactNumber) {
    ContactNumber = models.ContactNumber;
  } else {
    ContactNumber = model("ContactNumber", ContactNumberSchema);
  }
} catch (error) {
  ContactNumber = models.ContactNumber || model("ContactNumber", ContactNumberSchema);
}

export { ContactNumber };
