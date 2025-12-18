import { models, model, Schema } from "mongoose";
import { AmenitiesSchema } from "./utils/Amenities";
import { MaterialSchema } from "./Xsite/materials-activity";

const SectionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    images: [String],
  },
  { _id: true }
);

const FlatInfoSchema = new Schema({
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
  },

  images: {
    type: [String],
    required: true,
  },

  totalFlats: {
    type: Number,
    required: true,
  },

  totalBookedFlats: {
    type: Number,
    required: true,
  },

  bhk: {
    type: Number,
    required: true,
  },

  totalArea: {
    type: Number,
    required: true,
  },

  video: {
    type: String,
  },
});

const buildingSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      require: true,
    },

    description: {
      type: String,
      required: false,
    },

    location: {
      type: String,
      required: false,
    },

    area: {
      type: Number,
      require: false,
    },

    images: {
      type: [String],
      required: false,
    },

    section: {
      type: [SectionSchema],
      required: false,
    },

    flatInfo: {
      type: [FlatInfoSchema],
      required: false,
    },

    amenities: {
      type: [AmenitiesSchema],
      required: false,
    },

    MaterialUsed: {
      type: [MaterialSchema],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Building = models.Building || model("Building", buildingSchema);

export { Building };
