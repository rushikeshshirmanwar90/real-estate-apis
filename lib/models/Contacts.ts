import { model, models, Schema } from "mongoose";

const ContactSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    firstName: {
      type: String,
      required: false,
    },

    lastName: {
      type: String,
      required: false,
    },

    email: {
      type: String,
      required: false,
    },

    phoneNumber: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Safe model registration to prevent data loss during redeployment
let Contacts;
try {
  if (models.Contacts) {
    Contacts = models.Contacts;
  } else {
    Contacts = model("Contacts", ContactSchema);
  }
} catch (error) {
  Contacts = models.Contacts || model("Contacts", ContactSchema);
}

export { Contacts };
