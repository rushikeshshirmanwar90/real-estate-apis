import { models, model, Schema } from "mongoose";

const ClientAssignmentSchema = new Schema({
  clientId: {
    type: String,
    required: true,
  },
  clientName: {
    type: String,
    required: true,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const StaffSchema = new Schema({
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
  },
  email: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: false,
  },

  clients: {
    type: [ClientAssignmentSchema],
    required: false,
    default: [],
  },
  role: {
    type: String,
    enum: ["site-engineer", "supervisor", "manager"],
    required: true,
  },
  assignedProjects: {
    type: [String],
    required: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    required: false,
  },
});

export const Staff = models.Staff || model("Staff", StaffSchema);