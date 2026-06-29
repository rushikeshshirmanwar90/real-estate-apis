import { Schema, model, models } from "mongoose";

// Embedded schema — stored inside Project/Building documents
const EmbeddedOtherCostSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    sectionId: {
      type: String,
      required: false,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
    // String for embedded docs (no ObjectId population)
    addedBy: {
      type: String,
      required: false,
    },
    addedByName: {
      type: String,
      required: false,
    },
    updatedBy: {
      type: String,
      required: false,
    },
  },
  { timestamps: true, _id: true }
);

// Standalone schema — queried directly for listing / analytics
const OtherCostSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: false,
    },
    // Entity references (same pattern as Labor)
    entityType: {
      type: String,
      required: true,
      enum: ["project", "building", "otherSection", "rowHouse"],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "entityModel",
    },
    entityModel: {
      type: String,
      required: true,
      enum: ["Projects", "Building", "OtherSection", "RowHouse"],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      required: true,
    },
    sectionId: {
      type: String,
      required: false,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },
    addedByName: {
      type: String,
      required: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },
  },
  { timestamps: true, _id: true }
);

// Pre-save: derive entityModel from entityType
OtherCostSchema.pre("save", function (next) {
  const map: Record<string, "Projects" | "Building" | "OtherSection" | "RowHouse"> = {
    project: "Projects",
    building: "Building",
    otherSection: "OtherSection",
    rowHouse: "RowHouse",
  };
  if (this.entityType) this.entityModel = map[this.entityType] || "Projects";
  next();
});

// Safe model registration
let OtherCost: any;
try {
  OtherCost = models.OtherCost || model("OtherCost", OtherCostSchema);
} catch {
  OtherCost = models.OtherCost || model("OtherCost", OtherCostSchema);
}

export { EmbeddedOtherCostSchema, OtherCost };
