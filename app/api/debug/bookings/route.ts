import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Booking } from "@/lib/models/Shivai/Booking";
import { Customer } from "@/lib/models/users/Customer";

// GET - Debug endpoint to check bookings
export async function GET(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    // Get total counts
    const totalBookings = await Booking.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    
    // Get sample bookings
    const sampleBookings = await Booking.find()
      .limit(5)
      .select('_id customerName customerMobile projectName flatNumber createdAt')
      .sort({ createdAt: -1 });
    
    let customerBookings = [];
    let customerData = null;
    
    if (customerId) {
      // Get specific customer data
      customerData = await Customer.findById(customerId)
        .select('firstName lastName phoneNumber email myFlats bookings');
      
      // Get bookings for this customer
      customerBookings = await Booking.find({ customerId })
        .select('_id customerName customerMobile projectName flatNumber createdAt');
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalBookings,
        totalCustomers,
        sampleBookings,
        customerData,
        customerBookings,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("Debug bookings error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch debug data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}