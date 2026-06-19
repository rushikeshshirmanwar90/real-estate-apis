import { model, models, Schema } from "mongoose";

const PHASE_STATUS_VALUES = ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"];

const SubPhaseSchema = new Schema(
  {
    name: { type: String, required: true },
    progress: { type: Number, default: 0 },
    status: { type: String, enum: PHASE_STATUS_VALUES, default: "NOT_STARTED" },
  },
  { _id: true },
);

const DailyUpdateSchema = new Schema(
  {
    date: { type: Date, required: true },
    status: { type: String, enum: PHASE_STATUS_VALUES, required: true },
    progress: { type: Number, required: true },
    remarks: { type: String, default: "" },
    contractorRemarks: { type: String, default: "" },
    delayReason: { type: String, default: "" },
    siteIssues: { type: String, default: "" },
    nextAction: { type: String, default: "" },
    addedBy: { type: String, default: "" },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } },
);

const PhaseImageSchema = new Schema(
  {
    category: { type: String, enum: ["before", "progress", "completion"], required: true },
    imageUrl: { type: String, required: true },
    caption: { type: String, default: "" },
    uploadedBy: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const PhaseDocumentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["drawings", "BOQ", "site_instructions", "inspection_reports", "bills", "work_orders"],
      required: true,
    },
    url: { type: String, required: true },
    name: { type: String, required: true },
    uploadedBy: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const PhaseSchema = new Schema(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    status: { type: String, enum: PHASE_STATUS_VALUES, default: "NOT_STARTED" },
    progress: { type: Number, default: 0 },
    subPhases: { type: [SubPhaseSchema], default: [] },
    dailyUpdates: { type: [DailyUpdateSchema], default: [] },
    images: { type: [PhaseImageSchema], default: [] },
    documents: { type: [PhaseDocumentSchema], default: [] },
  },
  { _id: true },
);

// One document per mini-section — each mini-section tracks its own independent
// progress through the same phase template, instead of sharing one phase list
// with its sibling mini-sections under the same main section.
const ConstructionTrackerSchema = new Schema(
  {
    miniSectionId: { type: String, required: true, trim: true, unique: true },
    projectId: { type: String, required: true, trim: true },
    projectName: { type: String, required: true, trim: true },
    sectionName: { type: String, required: true, trim: true },
    overallProgress: { type: Number, default: 0 },
    phases: { type: [PhaseSchema], default: [] },
  },
  { timestamps: true },
);

// Safe model registration to prevent data loss during redeployment
let ConstructionTracker;
try {
  if (models.ConstructionTracker) {
    ConstructionTracker = models.ConstructionTracker;
  } else {
    ConstructionTracker = model("ConstructionTracker", ConstructionTrackerSchema);
  }
} catch (error) {
  ConstructionTracker = models.ConstructionTracker || model("ConstructionTracker", ConstructionTrackerSchema);
}

export { ConstructionTracker };
