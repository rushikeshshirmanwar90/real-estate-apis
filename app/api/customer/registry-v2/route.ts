import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Registry } from "@/lib/models/Shivai/Registry";
import { Booking } from "@/lib/models/Shivai/Booking";
import { Types } from "mongoose";

// Helper function to create a temporary booking
async function createTemporaryBooking(data: any) {
  const booking = new Booking({
    customerId: new Types.ObjectId(), // Generate new ObjectId
    customerName: data.customerName,
    customerMobile: data.mobileNumber,
    customerEmail: '',
    clientId: new Types.ObjectId(),
    projectId: new Types.ObjectId(),
    projectName: data.projectName,
    buildingId: new Types.ObjectId(),
    buildingName: data.projectName,
    floorId: new Types.ObjectId(),
    unitId: new Types.ObjectId(),
    flatNumber: data.flatNumber,
    flatType: '2BHK',
    flatArea: 1000,
    originalPrice: 5000000,
    discountPrice: 0,
    finalPrice: 5000000,
    bookingDate: new Date(),
    remarks: 'Auto-created for registry form'
  });
  
  await booking.save();
  return booking;
}

// GET - Retrieve registry data for a customer
export async function GET(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const customerMobile = searchParams.get('customerMobile');
    const unitId = searchParams.get('unitId');
    
    if (!bookingId && !customerMobile && !unitId) {
      return NextResponse.json(
        { error: "Either bookingId, customerMobile, or unitId is required" },
        { status: 400 }
      );
    }
    
    let query: any = {};
    if (bookingId) {
      query.bookingId = bookingId;
    } else if (customerMobile) {
      query.mobileNumber = customerMobile;
    } else if (unitId) {
      // Search for registry where the booking references this unitId
      const { Booking } = await import("@/lib/models/Shivai/Booking");
      const booking = await Booking.findOne({ unitId: unitId });
      if (booking) {
        query.bookingId = booking._id;
      } else {
        // No booking found for this unitId
        return NextResponse.json(
          { error: "No booking found for this unit" },
          { status: 404 }
        );
      }
    }
    
    console.log('🔍 Registry GET query:', query);
    
    const registry = await Registry.findOne(query).populate('bookingId');
    
    if (!registry) {
      console.log('📭 Registry not found for query:', query);
      return NextResponse.json(
        { error: "Registry not found" },
        { status: 404 }
      );
    }
    
    console.log('✅ Registry found:', {
      _id: registry._id,
      customerName: registry.customerName,
      mobileNumber: registry.mobileNumber,
      status: registry.status
    });
    
    return NextResponse.json({
      success: true,
      data: registry
    });
    
  } catch (error) {
    console.error("Registry GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve registry data" },
      { status: 500 }
    );
  }
}

// POST - Create or update registry data
export async function POST(request: NextRequest) {
  try {
    await connect();
    
    const body = await request.json();
    const {
      bookingId: originalBookingId,
      customerName,
      mobileNumber,
      address,
      aadharNumber,
      panNumber,
      projectName,
      flatNumber,
      directions,
      remarks
    } = body;
    
    console.log('📝 Registry POST request received:', {
      bookingId: originalBookingId,
      customerName,
      mobileNumber,
      projectName,
      flatNumber
    });
    
    // Validate required fields
    if (!originalBookingId || !customerName || !mobileNumber || !projectName || !flatNumber) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields: bookingId, customerName, mobileNumber, projectName, flatNumber" },
        { status: 400 }
      );
    }
    
    // Validate bookingId format
    if (!originalBookingId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('❌ Invalid bookingId format:', originalBookingId);
      return NextResponse.json(
        { error: "Invalid bookingId format. Must be a valid MongoDB ObjectId" },
        { status: 400 }
      );
    }
    
    // Validate mobile number format
    if (!/^\d{10}$/.test(mobileNumber)) {
      console.error('❌ Invalid mobile number:', mobileNumber);
      return NextResponse.json(
        { error: "Mobile number must be 10 digits" },
        { status: 400 }
      );
    }
    
    // Validate Aadhar number if provided
    if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
      console.error('❌ Invalid Aadhar number:', aadharNumber);
      return NextResponse.json(
        { error: "Aadhar number must be 12 digits" },
        { status: 400 }
      );
    }
    
    // Validate PAN number if provided
    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
      console.error('❌ Invalid PAN number:', panNumber);
      return NextResponse.json(
        { error: "Invalid PAN number format" },
        { status: 400 }
      );
    }
    
    console.log('🔍 Checking if booking exists:', originalBookingId);
    
    // Check if booking exists, create if not
    let booking = await Booking.findById(originalBookingId);
    let finalBookingId = originalBookingId;
    
    if (!booking) {
      console.log('🔧 Booking not found, creating temporary booking...');
      try {
        booking = await createTemporaryBooking({
          customerName,
          mobileNumber,
          projectName,
          flatNumber
        });
        finalBookingId = booking._id.toString();
        console.log('✅ Temporary booking created:', finalBookingId);
      } catch (bookingError) {
        console.error('❌ Failed to create temporary booking:', bookingError);
        return NextResponse.json(
          { 
            error: "Booking not found and failed to create temporary booking", 
            details: bookingError instanceof Error ? bookingError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    } else {
      console.log('✅ Booking found:', booking._id);
    }
    
    // Check if registry already exists for this booking
    let registry = await Registry.findOne({ bookingId: finalBookingId });
    
    if (registry) {
      console.log('📝 Updating existing registry:', registry._id);
      // Update existing registry
      registry.customerName = customerName;
      registry.mobileNumber = mobileNumber;
      registry.address = address || registry.address;
      registry.aadharNumber = aadharNumber || registry.aadharNumber;
      registry.panNumber = panNumber?.toUpperCase() || registry.panNumber;
      registry.projectName = projectName;
      registry.flatNumber = flatNumber;
      registry.directions = directions || registry.directions;
      registry.remarks = remarks || registry.remarks;
      registry.status = 'submitted';
      
      await registry.save();
      
      console.log('✅ Registry updated successfully');
      return NextResponse.json({
        success: true,
        message: "Registry updated successfully",
        data: registry
      });
    } else {
      console.log('📝 Creating new registry');
      // Create new registry
      registry = new Registry({
        bookingId: finalBookingId,
        customerName,
        mobileNumber,
        address,
        aadharNumber,
        panNumber: panNumber?.toUpperCase(),
        projectName,
        flatNumber,
        directions,
        remarks,
        status: 'submitted'
      });
      
      await registry.save();
      
      console.log('✅ Registry created successfully:', registry._id);
      return NextResponse.json({
        success: true,
        message: "Registry created successfully",
        data: registry
      }, { status: 201 });
    }
    
  } catch (error) {
    console.error("Registry POST error:", error);
    return NextResponse.json(
      { 
        error: "Failed to save registry data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}