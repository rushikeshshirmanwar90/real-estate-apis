import { model, models, Schema } from "mongoose";

/**
 * One entry from a customer's phone book. A single contact can have several
 * phone numbers / emails, so both are stored as arrays.
 */
const ContactEntrySchema = new Schema(
  {
    name: {
      type: String,
      default: "",
    },
    phoneNumbers: {
      type: [String],
      default: [],
    },
    emails: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

/**
 * The full phone book uploaded by a single customer from the Shivai mobile app.
 * We keep ONE document per customer (upserted by customerId) so re-syncing just
 * replaces the previous snapshot instead of piling up duplicates.
 */
const CustomerContactsSchema = new Schema(
  {
    // The client (tenant) the customer belongs to. Derived from the Customer
    // record on upload so the admin panel can scope contacts to its own client.
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "client",
      required: false,
    },

    // Customer identifier as sent by the mobile app (the customer's _id).
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customerName: {
      type: String,
      default: "",
    },

    customerMobile: {
      type: String,
      default: "",
    },

    contacts: {
      type: [ContactEntrySchema],
      default: [],
    },

    // Number of contact entries in the last sync (kept for quick display in the
    // admin panel without loading the whole array).
    contactCount: {
      type: Number,
      default: 0,
    },

    // When the customer last uploaded their contacts.
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Safe model registration to prevent data loss during redeployment
let CustomerContacts;
try {
  if (models.CustomerContacts) {
    CustomerContacts = models.CustomerContacts;
  } else {
    CustomerContacts = model("CustomerContacts", CustomerContactsSchema);
  }
} catch (error) {
  CustomerContacts =
    models.CustomerContacts || model("CustomerContacts", CustomerContactsSchema);
}

export { CustomerContacts };
