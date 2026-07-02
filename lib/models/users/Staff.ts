import { models, model, Schema } from "mongoose";

const ClientAssignmentSchema = new Schema(
  {
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
    isContractor: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Simplified project assignment schema
const ProjectAssignmentSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      required: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
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
    // Optional: track assignment status
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },
    // Agreed monthly payment for this staff member on this specific project
    monthlyPayment: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

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
    type: [ProjectAssignmentSchema],
    required: false,
    default: [],
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    required: false,
  },
  permissions: {
    type: [
      {
        type: String,
        enum: ['addMaterial', 'addMaterialUsage', 'addOtherCost', 'addEquipmentCost', 'contractor', 'generateReport'],
      }
    ],
    default: [],
  },
});

// Safe model registration to prevent data loss during redeployment
let Staff;
try {
  // In production, always reuse existing model to prevent schema conflicts
  if (models.Staff) {
    Staff = models.Staff;
  } else {
    Staff = model("Staff", StaffSchema);
  }
} catch (error) {
  // Fallback to existing model if registration fails
  Staff = models.Staff || model("Staff", StaffSchema);
}

export { Staff };
