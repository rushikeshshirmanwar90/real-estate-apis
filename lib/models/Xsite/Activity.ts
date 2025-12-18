import { model, models, Schema } from "mongoose";

// User Schema - Who performed the action
const UserSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
  },
  { _id: false }
);

// Changed Data Schema - What was changed (before/after)
const ChangedDataSchema = new Schema(
  {
    field: {
      type: String,
      required: false,
    },
    oldValue: {
      type: Schema.Types.Mixed,
      required: false,
    },
    newValue: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  { _id: false }
);

// Activity Schema
const ActivitySchema = new Schema(
  {
    // User who performed the action
    user: {
      type: UserSchema,
      required: true,
    },

    // Client and Project identification
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      required: false,
      index: true,
    },
    projectName: {
      type: String,
      required: false,
    },

    // Section identification (if applicable)
    sectionId: {
      type: String,
      required: false,
    },
    sectionName: {
      type: String,
      required: false,
    },

    // Mini-section identification (if applicable)
    miniSectionId: {
      type: String,
      required: false,
    },
    miniSectionName: {
      type: String,
      required: false,
    },

    // Activity details
    activityType: {
      type: String,
      required: true,
      enum: [
        // Project activities
        "project_created",
        "project_updated",
        "project_deleted",

        // Section activities
        "section_created",
        "section_updated",
        "section_deleted",

        // Mini-section activities
        "mini_section_created",
        "mini_section_updated",
        "mini_section_deleted",

        // Staff activities
        "staff_assigned",
        "staff_removed",
        "staff_added",

        // Other activities
        "other",
      ],
      index: true,
    },

    // Activity category for filtering
    category: {
      type: String,
      required: true,
      enum: [
        "project",
        "section",
        "mini_section",
        "material",
        "staff",
        "other",
      ],
      index: true,
    },

    // Action performed
    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete", "assign", "remove", "import", "use"],
    },

    // Description of the activity
    description: {
      type: String,
      required: true,
    },

    // Optional message or notes
    message: {
      type: String,
      required: false,
    },

    // Changed data (for update operations)
    changedData: {
      type: [ChangedDataSchema],
      required: false,
    },

    // Additional metadata
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },

    // IP address (optional)
    ipAddress: {
      type: String,
      required: false,
    },

    // Device information (optional)
    deviceInfo: {
      type: String,
      required: false,
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for better query performance
ActivitySchema.index({ clientId: 1, createdAt: -1 });
ActivitySchema.index({ projectId: 1, createdAt: -1 });
ActivitySchema.index({ activityType: 1, createdAt: -1 });
ActivitySchema.index({ "user.userId": 1, createdAt: -1 });

export const Activity = models.Activity || model("Activity", ActivitySchema);
