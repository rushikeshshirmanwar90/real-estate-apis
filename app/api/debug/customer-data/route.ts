import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Customer } from "@/lib/models/users/Customer";
import { Booking } from "@/lib/models/Shivai/Booking";

// GET - Debug endpoint to check customer data and bookings
export async function GET(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const mobileNumber = searchParams.get('mobileNumber');
    
    if (!customerId && !mobileNumber) {
      return NextResponse.json({
        error: "Either customerId or mobileNumber is required"
      }, { status: 400 });
    }
    
    let customer;
    if (customerId) {
      customer = await Customer.findById(customerId);
    } else {
      customer = await Customer.findOne({ phoneNumber: mobileNumber });
    }
    
    if (!customer) {
      return NextResponse.json({
        error: "Customer not found",
        searchedBy: customerId ? 'customerId' : 'mobileNumber',
        searchValue: customerId || mobileNumber
      }, { status: 404 });
    }
    
    // Get bookings for this customer
    const bookings = await Booking.find({ customerId: customer._id });
    
    // Get total counts
    const totalBookings = await Booking.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    
    return NextResponse.json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phoneNumber: customer.phoneNumber,
          email: customer.email,
          myFlats: customer.myFlats,
          bookings: customer.bookings,
          myFlatsCount: customer.myFlats?.length || 0,
          bookingsCount: customer.bookings?.length || 0
        },
        actualBookings: bookings,
        actualBookingsCount: bookings.length,
        totalBookings,
        totalCustomers,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("Debug customer data error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch debug data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}