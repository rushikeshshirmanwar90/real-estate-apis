import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId, sanitizeInput } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import mongoose from "mongoose";

// Booking Schema
const bookingSchema = new mongoose.Schema({
  // Customer Information
  customerName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  address: { type: String, required: true },
  adharNumber: { type: String, required: true },
  panNumber: { type: String, required: true },
  
  // Property Information
  projectId: { type: mongoose.Schema.Types.ObjectId, required: true },
  projectName: { type: String, required: true },
  flatId: { type: mongoose.Schema.Types.ObjectId, required: true },
  flatNumber: { type: String, required: true },
  direction: { type: String },
  
  // Payment Information
  electricMeterCharges: { type: Number, default: 0 },
  generatorCharges: { type: Number, default: 0 },
  gstPercentage: { type: Number, default: 0 },
  registrationCharges: { type: String },
  
  // Payment Plan
  selectedPaymentPlan: { type: String, required: true },
  homeLoanAmount: { type: Number },
  homeLoanPercentage: { type: Number },
  selfContributionPercentage: { type: Number },
  
  // Payment Stages
  bookingTokenPayment: { type: Number },
  foundationWork: { type: Number },
  selectedFloorSlab: { type: Number },
  brickworkPlumbingElectrical: { type: Number },
  finalWorks: { type: Number },
  finishingWork: { type: Number },
  registry: { type: Number },
  
  // Payment Dates
  paymentDates: { type: Map, of: String },
  
  // Additional Information
  promoCode: { type: String },
  remarks: { type: String },
  termsAccepted: { type: Boolean, required: true },
  
  // Metadata
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  clientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create or get the model
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

// POST - Create a new booking
export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();

    // Validate required fields
    const requiredFields = [
      'customerName', 'mobileNumber', 'address', 'adharNumber', 'panNumber',
      'projectId', 'projectName', 'flatId', 'flatNumber',
      'selectedPaymentPlan', 'termsAccepted', 'clientId'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return errorResponse(`${field} is required`, 400);
      }
    }

    // Validate ObjectIds
    if (!isValidObjectId(body.projectId)) {
      return errorResponse("Invalid project ID", 400);
    }
    if (!isValidObjectId(body.flatId)) {
      return errorResponse("Invalid flat ID", 400);
    }
    if (!isValidObjectId(body.clientId)) {
      return errorResponse("Invalid client ID", 400);
    }

    // Sanitize string inputs
    const sanitizedData = {
      ...body,
      customerName: sanitizeInput(body.customerName),
      address: sanitizeInput(body.address),
      adharNumber: sanitizeInput(body.adharNumber),
      panNumber: sanitizeInput(body.panNumber),
      flatNumber: sanitizeInput(body.flatNumber),
      direction: body.direction ? sanitizeInput(body.direction) : undefined,
      promoCode: body.promoCode ? sanitizeInput(body.promoCode) : undefined,
      remarks: body.remarks ? sanitizeInput(body.remarks) : undefined,
    };

    // Validate mobile number (10 digits)
    if (!/^[0-9]{10}$/.test(sanitizedData.mobileNumber)) {
      return errorResponse("Invalid mobile number format", 400);
    }

    // Validate Aadhaar (12 digits)
    if (!/^[0-9]{12}$/.test(sanitizedData.adharNumber)) {
      return errorResponse("Invalid Aadhaar number format", 400);
    }

    // Validate PAN (format: ABCDE1234F)
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(sanitizedData.panNumber.toUpperCase())) {
      return errorResponse("Invalid PAN number format", 400);
    }

    // Create booking
    const booking = new Booking({
      ...sanitizedData,
      panNumber: sanitizedData.panNumber.toUpperCase(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await booking.save();

    logger.info("Booking created successfully", { bookingId: booking._id });

    return successResponse(
      {
        booking: {
          id: booking._id,
          customerName: booking.customerName,
          mobileNumber: booking.mobileNumber,
          projectName: booking.projectName,
          flatNumber: booking.flatNumber,
          status: booking.status,
          createdAt: booking.createdAt,
        },
      },
      "Booking created successfully",
      201
    );
  } catch (error: unknown) {
    logger.error("Error creating booking", error);
    return errorResponse("Failed to create booking", 500);
  }
};

// GET - Retrieve bookings
export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("id");
    const clientId = searchParams.get("clientId");
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    // Get single booking by ID
    if (bookingId) {
      if (!isValidObjectId(bookingId)) {
        return errorResponse("Invalid booking ID", 400);
      }

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      return successResponse({ booking }, "Booking retrieved successfully");
    }

    // Build query
    const query: any = {};
    if (clientId) {
      if (!isValidObjectId(clientId)) {
        return errorResponse("Invalid client ID", 400);
      }
      query.clientId = clientId;
    }
    if (customerId) {
      query.createdBy = customerId;
    }
    if (status) {
      query.status = status;
    }

    // Get all bookings matching query
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    return successResponse(
      { bookings, count: bookings.length },
      "Bookings retrieved successfully"
    );
  } catch (error: unknown) {
    logger.error("Error retrieving bookings", error);
    return errorResponse("Failed to retrieve bookings", 500);
  }
};

// PUT - Update booking
export const PUT = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("id");

    if (!bookingId || !isValidObjectId(bookingId)) {
      return errorResponse("Valid booking ID is required", 400);
    }

    const body = await req.json();

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return errorResponse("Booking not found", 404);
    }

    // Update allowed fields
    const allowedUpdates = [
      'status', 'remarks', 'paymentDates', 'bookingTokenPayment',
      'foundationWork', 'selectedFloorSlab', 'brickworkPlumbingElectrical',
      'finalWorks', 'finishingWork', 'registry'
    ];

    allowedUpdates.forEach(field => {
      if (body[field] !== undefined) {
        booking[field] = body[field];
      }
    });

    booking.updatedAt = new Date();
    await booking.save();

    logger.info("Booking updated successfully", { bookingId: booking._id });

    return successResponse(
      { booking },
      "Booking updated successfully"
    );
  } catch (error: unknown) {
    logger.error("Error updating booking", error);
    return errorResponse("Failed to update booking", 500);
  }
};

// DELETE - Cancel booking
export const DELETE = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("id");

    if (!bookingId || !isValidObjectId(bookingId)) {
      return errorResponse("Valid booking ID is required", 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return errorResponse("Booking not found", 404);
    }

    // Soft delete - mark as cancelled
    booking.status = 'cancelled';
    booking.updatedAt = new Date();
    await booking.save();

    logger.info("Booking cancelled successfully", { bookingId: booking._id });

    return successResponse(
      { booking },
      "Booking cancelled successfully"
    );
  } catch (error: unknown) {
    logger.error("Error cancelling booking", error);
    return errorResponse("Failed to cancel booking", 500);
  }
};
