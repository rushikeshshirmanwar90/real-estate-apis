import { Schema, model, models } from "mongoose";

const CustomerSchema = new Schema(
  {
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
      unique: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
    },

    password: {
      type: String,
      required: false,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "client",
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    myFlats: [
      {
        buildingId: {
          type: Schema.Types.ObjectId,
          ref: "Building",
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
        unitNumber: {
          type: String,
          required: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        bookingId: {
          type: Schema.Types.ObjectId,
          ref: "Booking",
        }
      },
    ],

    // Booking References
    bookings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],

    qrCodeData: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Customer = models.Customers || model("Customers", CustomerSchema);
