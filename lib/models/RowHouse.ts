import { model, models, Schema } from "mongoose";
import { AmenitiesSchema } from "./utils/Amenities";
import { MaterialSchema } from "./Xsite/materials-activity";
import { EmbeddedLaborSchema } from "./Xsite/Labor";
import { EmbeddedOtherCostSchema } from "./Xsite/OtherCost";

const RowHouseSchema = new Schema(
  {
    name: {
      type: String,
      require: true,
    },

    totalHouse: {
      type: Number,
      require: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      require: true,
    },

    description: {
      type: String,
      require: false,
    },

    images: {
      type: [String],
      require: false,
    },

    bookedHouse: {
      type: Number,
      require: false,
    },

    area: {
      type: Number,
      require: false,
    },

    amenities: {
      type: [AmenitiesSchema],
      required: false,
    },

    MaterialUsed: {
      type: [MaterialSchema],
      required: false,
    },

    Labors: {
      type: [EmbeddedLaborSchema],
      required: false,
    },

    OtherCosts: {
      type: [EmbeddedOtherCostSchema],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Safe model registration to prevent data loss during redeployment
let RowHouse;
try {
  if (models.RowHouse) {
    RowHouse = models.RowHouse;
  } else {
    RowHouse = model("RowHouse", RowHouseSchema);
  }
} catch (error) {
  RowHouse = models.RowHouse || model("RowHouse", RowHouseSchema);
}

export { RowHouse };
