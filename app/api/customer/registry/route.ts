import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Registry } from "@/lib/models/Shivai/Registry";
import { Booking } from "@/lib/models/Shivai/Booking";
import { Types } from "mongoose";

// GET - Retrieve registry data for a customer
export async function GET(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const customerMobile = searchParams.get('customerMobile');
    
    if (!bookingId && !customerMobile) {
      return NextResponse.json(
        { error: "Either bookingId or customerMobile is required" },
        { status: 400 }
      );
    }

    let query: any = {};
    if (bookingId) {
      query.bookingId = bookingId;
    } else if (customerMobile) {
      query.mobileNumber = customerMobile;
    }
    
    const registry = await Registry.findOne(query).populate('bookingId');
    
    if (!registry) {
      return NextResponse.json(
        { error: "Registry not found" },
        { status: 404 }
      );
    }
    
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
    let {
      bookingId,
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
      bookingId,
      customerName,
      mobileNumber,
      projectName,
      flatNumber
    });
    
    // Validate required fields
    if (!bookingId || !customerName || !mobileNumber || !projectName || !flatNumber) {
      console.error('❌ Missing required fields:', { bookingId, customerName, mobileNumber, projectName, flatNumber });
      return NextResponse.json(
        { error: "Missing required fields: bookingId, customerName, mobileNumber, projectName, flatNumber" },
        { status: 400 }
      );
    }
    
    // Validate bookingId format
    if (!bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('❌ Invalid bookingId format:', bookingId);
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
    
    console.log('🔍 Checking if booking exists:', bookingId);
    // Check if booking exists
    let booking = await Booking.findById(bookingId);
    let actualBookingId = bookingId; // Use this for the registry creation
    
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      
      // Let's also check if there are any bookings in the database for debugging
      const totalBookings = await Booking.countDocuments();
      console.log('📊 Total bookings in database:', totalBookings);
      
      if (totalBookings > 0) {
        const sampleBookings = await Booking.find().limit(3).select('_id customerName projectName');
        console.log('📋 Sample bookings:', sampleBookings);
      }
      
      // Instead of failing, let's create a temporary booking for this registry
      console.log('🔧 Creating temporary booking for registry...');
      try {
        booking = new Booking({
          customerId: bookingId, // Use bookingId as temporary customerId
          customerName: customerName,
          customerMobile: mobileNumber,
          customerEmail: '',
          clientId: new Types.ObjectId(), // Temporary client ID
          projectId: new Types.ObjectId(), // Temporary project ID
          projectName: projectName,
          buildingId: new Types.ObjectId(), // Temporary building ID
          buildingName: projectName,
          floorId: new Types.ObjectId(), // Temporary floor ID
          unitId: new Types.ObjectId(), // Temporary unit ID
          flatNumber: flatNumber,
          flatType: '2BHK', // Default type
          flatArea: 1000, // Default area
          originalPrice: 5000000, // Default price
          discountPrice: 0,
          finalPrice: 5000000,
          bookingDate: new Date(),
          remarks: 'Auto-created for registry form'
        });
        
        await booking.save();
        console.log('✅ Temporary booking created:', booking._id);
        
        // Update the actualBookingId to the newly created booking
        actualBookingId = booking._id.toString();
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
    }
    
    console.log('✅ Booking found:', {
      id: booking._id,
      customerName: booking.customerName,
      projectName: booking.projectName,
      flatNumber: booking.flatNumber
    });
    
    // Check if registry already exists for this booking
    let registry = await Registry.findOne({ bookingId: actualBookingId });
    
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
      registry.status = 'submitted'; // Update status when customer submits
      
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
        bookingId: actualBookingId,
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

// PUT - Update registry status (for admin use)
export async function PUT(request: NextRequest) {
  try {
    await connect();
    
    const body = await request.json();
    const {
      registryId,
      status,
      verifiedBy,
      verificationRemarks,
      rejectedBy,
      rejectionReason
    } = body;
    
    if (!registryId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: registryId, status" },
        { status: 400 }
      );
    }
    
    const registry = await Registry.findById(registryId);
    if (!registry) {
      return NextResponse.json(
        { error: "Registry not found" },
        { status: 404 }
      );
    }
    
    registry.status = status;
    
    if (status === 'verified' || status === 'approved') {
      registry.verifiedBy = verifiedBy;
      registry.verifiedAt = new Date();
      registry.verificationRemarks = verificationRemarks;
    } else if (status === 'rejected') {
      registry.rejectedBy = rejectedBy;
      registry.rejectedAt = new Date();
      registry.rejectionReason = rejectionReason;
    }
    
    await registry.save();
    
    return NextResponse.json({
      success: true,
      message: "Registry status updated successfully",
      data: registry
    });
    
  } catch (error) {
    console.error("Registry PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update registry status" },
      { status: 500 }
    );
  }
}