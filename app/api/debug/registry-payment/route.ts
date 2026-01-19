import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Registry } from "@/lib/models/Shivai/Registry";
import { PaymentSchedule } from "@/lib/models/Shivai/Payment";
import { Booking } from "@/lib/models/Shivai/Booking";

// GET - Debug endpoint to check registry and payment schedule data
export async function GET(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    
    // Get total counts
    const totalRegistries = await Registry.countDocuments();
    const totalPaymentSchedules = await PaymentSchedule.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    // Get sample data
    const sampleRegistries = await Registry.find()
      .limit(5)
      .select('_id bookingId customerName mobileNumber projectName flatNumber status createdAt')
      .sort({ createdAt: -1 });
    
    const samplePaymentSchedules = await PaymentSchedule.find()
      .limit(5)
      .select('_id bookingId customerName customerMobile projectName flatNumber status totalAmount createdAt')
      .sort({ createdAt: -1 });
    
    let specificData = null;
    
    if (bookingId) {
      // Get specific data for this booking
      const registry = await Registry.findOne({ bookingId });
      const paymentSchedule = await PaymentSchedule.findOne({ bookingId });
      const booking = await Booking.findById(bookingId);
      
      specificData = {
        bookingId,
        booking: booking ? {
          _id: booking._id,
          customerName: booking.customerName,
          customerMobile: booking.customerMobile,
          projectName: booking.projectName,
          flatNumber: booking.flatNumber,
          createdAt: booking.createdAt
        } : null,
        registry: registry ? {
          _id: registry._id,
          status: registry.status,
          customerName: registry.customerName,
          mobileNumber: registry.mobileNumber,
          createdAt: registry.createdAt
        } : null,
        paymentSchedule: paymentSchedule ? {
          _id: paymentSchedule._id,
          status: paymentSchedule.status,
          customerName: paymentSchedule.customerName,
          customerMobile: paymentSchedule.customerMobile,
          totalAmount: paymentSchedule.totalAmount,
          createdAt: paymentSchedule.createdAt
        } : null
      };
    }
    
    return NextResponse.json({
      success: true,
      data: {
        counts: {
          totalRegistries,
          totalPaymentSchedules,
          totalBookings
        },
        samples: {
          registries: sampleRegistries,
          paymentSchedules: samplePaymentSchedules
        },
        specificData,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("Debug registry-payment error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch debug data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}