import { Schema, model, models } from "mongoose";

// Booking Schema - Main booking record
const BookingSchema = new Schema(
  {
    // Customer Information
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customers",
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerMobile: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: false,
    },

    // Property Information
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Projects",
      required: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },
    buildingName: {
      type: String,
      required: true,
    },
    floorId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    flatNumber: {
      type: String,
      required: true,
    },
    flatType: {
      type: String,
      required: true,
      enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Shop', 'Office', 'Parking', 'Storage', 'Other'],
    },
    flatArea: {
      type: Number,
      required: true,
    },

    // Pricing Information
    originalPrice: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      required: false,
    },
    finalPrice: {
      type: Number,
      required: true,
    },

    // References to other documents
    registryId: {
      type: Schema.Types.ObjectId,
      ref: "Registry",
      required: false,
    },

    paymentScheduleId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentSchedule",
      required: false,
    },

    // Booking Metadata
    bookingDate: {
      type: Date,
      default: Date.now,
    },

    remarks: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
BookingSchema.index({ customerId: 1 });
BookingSchema.index({ projectId: 1 });
BookingSchema.index({ buildingId: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ customerMobile: 1 });
BookingSchema.index({ bookingDate: -1 });

export const Booking = models.Booking || model("Booking", BookingSchema);
