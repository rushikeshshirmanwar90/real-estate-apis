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

// Unit Type Schema for different types of units (1BHK, 2BHK, shops, etc.)
const UnitTypeSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['1BHK', '2BHK', '3BHK', '4BHK', "5BHK", "6BHK", 'Studio', 'Shop', 'Office', 'Parking', 'Storage', 'Other'],
  },
  count: {
    type: Number,
    required: true,
    min: 0,
  },
  bookedCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  area: {
    type: Number, // Area per unit in sq ft
    required: false,
  },
  pricePerSqFt: {
    type: Number,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
}, { _id: true });

// Individual Unit Schema for specific unit details
const UnitSchema = new Schema({
  unitNumber: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Shop', 'Office', 'Parking', 'Storage', 'Other'],
  },
  area: {
    type: Number, // Area in sq ft
    required: true,
  },
  price: {
    type: Number,
    required: false,
  },
  status: {
    type: String,
    required: true,
    enum: ['Available', 'Booked', 'Sold', 'Reserved', 'Under Construction'],
    default: 'Available',
  },
  customerInfo: {
    name: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
  },
  bookingDate: {
    type: Date,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
  images: [String],
}, { _id: true });

// Floor Schema with detailed unit information
const FloorSchema = new Schema({
  floorNumber: {
    type: Number,
    required: true,
  },
  floorName: {
    type: String, // e.g., "Ground Floor", "First Floor", "Basement", "Mezzanine"
    required: false,
  },
  floorType: {
    type: String,
    enum: ['Residential', 'Commercial', 'Mixed', 'Parking', 'Amenity', 'Other'],
    default: 'Residential',
  },
  totalUnits: {
    type: Number,
    required: true,
    min: 0,
  },
  totalBookedUnits: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  // Summary of unit types on this floor
  unitTypes: {
    type: [UnitTypeSchema],
    required: false,
    default: [],
  },
  // Detailed individual units
  units: {
    type: [UnitSchema],
    required: false,
    default: [],
  },
  floorPlan: {
    type: String, // URL to floor plan image
    required: false,
  },
  images: [String],
  amenities: [String], // Floor-specific amenities
  description: {
    type: String,
    required: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: true, timestamps: true });

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

    // Building specifications
    totalFloors: {
      type: Number,
      required: false,
      min: 0,
    },

    totalUnits: {
      type: Number,
      required: false,
      min: 0,
    },

    totalBookedUnits: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },

    buildingType: {
      type: String,
      enum: ['Residential', 'Commercial', 'Mixed Use', 'Industrial', 'Other'],
      default: 'Residential',
    },

    images: {
      type: [String],
      required: false,
    },

    section: {
      type: [SectionSchema],
      required: false,
    },

    // New floors array with detailed floor information
    floors: {
      type: [FloorSchema],
      required: false,
      default: [],
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

    // Building-wide unit type summary
    unitTypeSummary: {
      type: [UnitTypeSchema],
      required: false,
      default: [],
    },

    // Construction and legal information
    constructionStatus: {
      type: String,
      enum: ['Planning', 'Under Construction', 'Completed', 'Ready to Move'],
      default: 'Planning',
    },

    approvals: {
      type: [String], // Array of approval types/numbers
      required: false,
    },

    completionDate: {
      type: Date,
      required: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better performance
buildingSchema.index({ projectId: 1 });
buildingSchema.index({ 'floors.floorNumber': 1 });
buildingSchema.index({ 'floors.units.status': 1 });
buildingSchema.index({ 'floors.units.type': 1 });

const Building = models.Building || model("Building", buildingSchema);

export { Building, FloorSchema, UnitSchema, UnitTypeSchema };
