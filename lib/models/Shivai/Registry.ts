import { Schema, model, models } from "mongoose";

// Registry Schema - Step 1 of booking process
const RegistrySchema = new Schema(
  {
    // Reference to Booking
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // Personal Information (Required - provided during property assignment)
    customerName: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^\d{10}$/.test(v);
        },
        message: 'Mobile number must be 10 digits'
      }
    },

    // Property Selection (Required - provided during property assignment)
    projectName: {
      type: String,
      required: true,
    },
    flatNumber: {
      type: String,
      required: true,
    },

    // Status (Required - always provided)
    status: {
      type: String,
      required: true,
      enum: ['draft', 'submitted', 'verified', 'approved', 'rejected'],
      default: 'draft',
    },

    // Personal Details (Optional - to be filled by customer later)
    address: {
      type: String,
      required: false,
    },

    // Document Information (Optional - to be filled by customer later)
    aadharNumber: {
      type: String,
      required: false,
      validate: {
        validator: function(v: string) {
          // Only validate if value is provided
          return !v || /^\d{12}$/.test(v);
        },
        message: 'Aadhar number must be 12 digits'
      }
    },
    panNumber: {
      type: String,
      required: false,
      uppercase: true,
      validate: {
        validator: function(v: string) {
          // Only validate if value is provided
          return !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: 'Invalid PAN number format'
      }
    },

    // Direction Details (Optional - What's around the flat)
    directions: {
      north: {
        type: String,
        required: false,
      },
      south: {
        type: String,
        required: false,
      },
      east: {
        type: String,
        required: false,
      },
      west: {
        type: String,
        required: false,
      },
    },

    // Document Uploads (Optional - for future use)
    documents: {
      aadharDocument: {
        type: String,
        required: false,
      },
      panDocument: {
        type: String,
        required: false,
      },
      addressProof: {
        type: String,
        required: false,
      },
      photo: {
        type: String,
        required: false,
      },
    },

    // Verification Details (Optional - filled by admin)
    verifiedBy: {
      type: String,
      required: false,
    },
    verifiedAt: {
      type: Date,
      required: false,
    },
    verificationRemarks: {
      type: String,
      required: false,
    },

    // Rejection Details (Optional - filled by admin if rejected)
    rejectedBy: {
      type: String,
      required: false,
    },
    rejectedAt: {
      type: Date,
      required: false,
    },
    rejectionReason: {
      type: String,
      required: false,
    },

    // Additional Information (Optional)
    remarks: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
RegistrySchema.index({ bookingId: 1 });
RegistrySchema.index({ mobileNumber: 1 });
RegistrySchema.index({ aadharNumber: 1 });
RegistrySchema.index({ panNumber: 1 });
RegistrySchema.index({ status: 1 });

// Clear the model cache if it exists to ensure schema updates are applied
if (models.Registry) {
  delete models.Registry;
}

export const Registry = model("Registry", RegistrySchema);
