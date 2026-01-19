import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Booking } from "@/lib/models/Shivai/Booking";
import { Customer } from "@/lib/models/users/Customer";
import { Types } from "mongoose";

// POST - Create a test booking for development
export async function POST(request: NextRequest) {
  try {
    await connect();
    
    const body = await request.json();
    const {
      customerMobile,
      customerName,
      projectName = "Test Project",
      flatNumber = "A-101",
      originalPrice = 5000000,
      discountPrice = 0
    } = body;
    
    if (!customerMobile || !customerName) {
      return NextResponse.json(
        { error: "customerMobile and customerName are required" },
        { status: 400 }
      );
    }
    
    // Find customer by mobile number
    let customer = await Customer.findOne({ phoneNumber: customerMobile });
    
    if (!customer) {
      // Create a test customer if not found
      customer = new Customer({
        firstName: customerName.split(' ')[0] || customerName,
        lastName: customerName.split(' ').slice(1).join(' ') || '',
        phoneNumber: customerMobile,
        email: `${customerMobile}@test.com`,
        clientId: new Types.ObjectId(),
        verified: true,
        myFlats: [],
        bookings: []
      });
      
      await customer.save();
      console.log('✅ Test customer created:', customer._id);
    }
    
    const finalPrice = originalPrice - discountPrice;
    
    // Create booking
    const booking = new Booking({
      customerId: customer._id,
      customerName: customerName,
      customerMobile: customerMobile,
      customerEmail: customer.email,
      clientId: new Types.ObjectId(),
      projectId: new Types.ObjectId(),
      projectName: projectName,
      buildingId: new Types.ObjectId(),
      buildingName: projectName,
      floorId: new Types.ObjectId(),
      unitId: new Types.ObjectId(),
      flatNumber: flatNumber,
      flatType: '2BHK',
      flatArea: 1000,
      originalPrice: originalPrice,
      discountPrice: discountPrice,
      finalPrice: finalPrice,
      bookingDate: new Date(),
      remarks: 'Test booking for development'
    });
    
    await booking.save();
    console.log('✅ Test booking created:', booking._id);
    
    // Update customer's myFlats and bookings
    await Customer.findByIdAndUpdate(
      customer._id,
      {
        $push: {
          myFlats: {
            buildingId: booking.buildingId,
            floorId: booking.floorId,
            unitId: booking.unitId,
            unitNumber: booking.flatNumber,
            assignedAt: booking.bookingDate,
            bookingId: booking._id,
          },
          bookings: booking._id,
        },
      }
    );
    
    console.log('✅ Customer updated with booking reference');
    
    return NextResponse.json({
      success: true,
      message: "Test booking created successfully",
      data: {
        bookingId: booking._id,
        customerId: customer._id,
        customerName: booking.customerName,
        customerMobile: booking.customerMobile,
        projectName: booking.projectName,
        flatNumber: booking.flatNumber,
        originalPrice: booking.originalPrice,
        discountPrice: booking.discountPrice,
        finalPrice: booking.finalPrice
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error("Test booking creation error:", error);
    return NextResponse.json(
      { 
        error: "Failed to create test booking",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}