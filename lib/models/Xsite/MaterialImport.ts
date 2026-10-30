import { model, models, Schema, Model } from "mongoose";

const StockSchema = new Schema(
  {
    id: { type: String, required: true },
    qnt: { type: Number, required: true },
  },
  { _id: false }
);

// One record per Excel material import done from the super-admin panel.
// The entries it created carry `importId` = this record's _id, so it can be undone.
const MaterialImportSchema = new Schema(
  {
    projectId: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    projectName: { type: String, required: false },
    fileName: { type: String, required: false, trim: true },
    importedBy: { type: String, required: false },

    purchaseCount: { type: Number, required: true, default: 0 },
    usageCount: { type: Number, required: true, default: 0 },
    // Sum of purchase costs added to project.spent (subtracted again on undo)
    totalCost: { type: Number, required: true, default: 0 },
    // Stock entries this import added, with their quantity at import time.
    // Undo is refused if any of them changed since (used or edited in the app).
    stock: { type: [StockSchema], default: [] },

    status: {
      type: String,
      enum: ["applied", "undone"],
      default: "applied",
    },
    undoneAt: { type: Date, required: false },
  },
  { timestamps: true }
);

let MaterialImport: Model<any>;
try {
  MaterialImport = models.MaterialImport || model("MaterialImport", MaterialImportSchema);
} catch {
  MaterialImport = model("MaterialImport", MaterialImportSchema);
}

export { MaterialImport };
