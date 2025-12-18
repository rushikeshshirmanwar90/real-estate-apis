import { model, models, Schema } from "mongoose";

const ReferenceCustomerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    contactNumber: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const LeadSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  contactNumber: {
    type: String,
    required: true,
    unique: true,
  },
});

const ReferencedLeadsSchema = new Schema({
  clientId: {
    type: String,
    required: true,
  },
  referenceCustomer: ReferenceCustomerSchema,
  leads: [LeadSchema],
});

ReferencedLeadsSchema.index(
  {
    clientId: 1,
    "referenceCustomer.contactNumber": 1,
  },
  {
    unique: true,
    name: "clientId_referenceCustomer_contactNumber_unique", // Give it a specific name
  }
);

export const ReferenceLeads =
  models.ReferencedLeads || model("ReferencedLeads", ReferencedLeadsSchema);
