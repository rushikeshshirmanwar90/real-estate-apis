import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { PaymentSchedule } from "@/lib/models/Shivai/Payment";
import { Booking } from "@/lib/models/Shivai/Booking";
import { Types } from "mongoose";

// GET - Retrieve payment schedule data for a customer
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
      query.customerMobile = customerMobile;
    } else if (unitId) {
      // Search for payment schedule where the booking references this unitId
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
    
    console.log('🔍 Payment schedule GET query:', query);
    
    const paymentSchedule = await PaymentSchedule.findOne(query).populate('bookingId');
    
    if (!paymentSchedule) {
      console.log('📭 Payment schedule not found for query:', query);
      return NextResponse.json(
        { error: "Payment schedule not found" },
        { status: 404 }
      );
    }
    
    console.log('✅ Payment schedule found:', {
      _id: paymentSchedule._id,
      customerName: paymentSchedule.customerName,
      customerMobile: paymentSchedule.customerMobile,
      status: paymentSchedule.status
    });
    
    return NextResponse.json({
      success: true,
      data: paymentSchedule
    });
    
  } catch (error) {
    console.error("Payment schedule GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve payment schedule data" },
      { status: 500 }
    );
  }
}

// POST - Create or update payment schedule data
export async function POST(request: NextRequest) {
  try {
    await connect();
    
    const body = await request.json();
    let {
      bookingId,
      customerName,
      customerMobile,
      projectName,
      flatNumber,
      totalAmount,
      homeLoanPercentage,
      selfContributionPercentage,
      homeLoanAmount,
      paymentDates,
      installmentPlan,
      preferredPaymentMode,
      bankDetails,
      termsAccepted,
      remarks
    } = body;
    
    // Validate required fields
    if (!bookingId || !customerName || !customerMobile || !projectName || !flatNumber || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId, customerName, customerMobile, projectName, flatNumber, totalAmount" },
        { status: 400 }
      );
    }
    
    if (!termsAccepted) {
      return NextResponse.json(
        { error: "Terms and conditions must be accepted" },
        { status: 400 }
      );
    }
    
    // Validate mobile number format
    if (!/^\d{10}$/.test(customerMobile)) {
      return NextResponse.json(
        { error: "Mobile number must be 10 digits" },
        { status: 400 }
      );
    }
    
    // Check if booking exists
    let booking = await Booking.findById(bookingId);
    let actualBookingId = bookingId; // Use this for the payment schedule creation
    
    if (!booking) {
      console.log('🔧 Booking not found, creating temporary booking...');
      try {
        // Create a temporary booking for this payment schedule
        booking = new Booking({
          customerId: bookingId, // Use bookingId as temporary customerId
          customerName: customerName,
          customerMobile: customerMobile,
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
          originalPrice: totalAmount,
          discountPrice: 0,
          finalPrice: totalAmount,
          bookingDate: new Date(),
          remarks: 'Auto-created for payment schedule form'
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
    
    // Calculate self contribution amount
    const selfContributionAmount = totalAmount - (homeLoanAmount || 0);
    
    // Define payment stages with percentages
    const paymentStageDefinitions = [
      { name: 'booking-token', label: 'Booking / Token Payment', percentage: 25 },
      { name: 'foundation-work', label: 'Foundation Work', percentage: 5 },
      { name: 'floor-slab', label: 'Selected Floor Slab Work', percentage: 25 },
      { name: 'brickwork-plumbing', label: 'Brickwork + Plumbing + Electrical + Plaster Work', percentage: 25 },
      { name: 'final-works', label: 'Final Works', percentage: 10 },
      { name: 'finishing-work', label: 'Finishing Work', percentage: 5 },
      { name: 'registry', label: 'Registry', percentage: 5 }
    ];
    
    // Create payment stages array
    const paymentStages = paymentStageDefinitions.map(stage => {
      const amount = Math.round((totalAmount * stage.percentage) / 100);
      const dueDate = paymentDates[stage.name] ? new Date(paymentDates[stage.name]) : new Date();
      
      return {
        stageName: stage.name,
        stageLabel: stage.label,
        percentage: stage.percentage,
        amount: amount,
        dueDate: dueDate,
        status: 'pending',
        paidAmount: 0
      };
    });
    
    // Calculate total pending amount
    const totalPending = paymentStages.reduce((sum, stage) => sum + stage.amount, 0);
    
    // Check if payment schedule already exists for this booking
    let paymentSchedule = await PaymentSchedule.findOne({ bookingId: actualBookingId });
    
    if (paymentSchedule) {
      // Update existing payment schedule
      paymentSchedule.customerName = customerName;
      paymentSchedule.customerMobile = customerMobile;
      paymentSchedule.projectName = projectName;
      paymentSchedule.flatNumber = flatNumber;
      paymentSchedule.totalAmount = totalAmount;
      paymentSchedule.homeLoanPercentage = homeLoanPercentage;
      paymentSchedule.selfContributionPercentage = selfContributionPercentage;
      paymentSchedule.homeLoanAmount = homeLoanAmount;
      paymentSchedule.selfContributionAmount = selfContributionAmount;
      paymentSchedule.paymentStages = paymentStages;
      paymentSchedule.installmentPlan = installmentPlan || 'construction-linked';
      paymentSchedule.preferredPaymentMode = preferredPaymentMode;
      paymentSchedule.bankDetails = bankDetails || {};
      paymentSchedule.termsAccepted = termsAccepted;
      paymentSchedule.termsAcceptedAt = new Date();
      paymentSchedule.remarks = remarks;
      paymentSchedule.totalPending = totalPending;
      
      await paymentSchedule.save();
      
      return NextResponse.json({
        success: true,
        message: "Payment schedule updated successfully",
        data: paymentSchedule
      });
    } else {
      // Create new payment schedule
      paymentSchedule = new PaymentSchedule({
        bookingId: actualBookingId,
        customerName,
        customerMobile,
        projectName,
        flatNumber,
        totalAmount,
        bookingAmount: Math.round((totalAmount * 25) / 100), // 25% booking amount
        homeLoanPercentage,
        selfContributionPercentage,
        homeLoanAmount,
        selfContributionAmount,
        paymentStages,
        installmentPlan: installmentPlan || 'construction-linked',
        preferredPaymentMode,
        bankDetails: bankDetails || {},
        termsAccepted,
        termsAcceptedAt: new Date(),
        remarks,
        status: 'active',
        totalPaid: 0,
        totalPending
      });
      
      await paymentSchedule.save();
      
      return NextResponse.json({
        success: true,
        message: "Payment schedule created successfully",
        data: paymentSchedule
      }, { status: 201 });
    }
    
  } catch (error) {
    console.error("Payment schedule POST error:", error);
    return NextResponse.json(
      { error: "Failed to save payment schedule data" },
      { status: 500 }
    );
  }
}

// PUT - Update payment status (for admin use)
export async function PUT(request: NextRequest) {
  try {
    await connect();
    
    const body = await request.json();
    const {
      paymentScheduleId,
      stageId,
      paidAmount,
      paymentMode,
      transactionId,
      receiptNumber,
      remarks
    } = body;
    
    if (!paymentScheduleId || !stageId || !paidAmount) {
      return NextResponse.json(
        { error: "Missing required fields: paymentScheduleId, stageId, paidAmount" },
        { status: 400 }
      );
    }
    
    const paymentSchedule = await PaymentSchedule.findById(paymentScheduleId);
    if (!paymentSchedule) {
      return NextResponse.json(
        { error: "Payment schedule not found" },
        { status: 404 }
      );
    }
    
    // Find the payment stage
    const stage = paymentSchedule.paymentStages.id(stageId);
    if (!stage) {
      return NextResponse.json(
        { error: "Payment stage not found" },
        { status: 404 }
      );
    }
    
    // Update stage payment details
    stage.paidAmount = paidAmount;
    stage.paidDate = new Date();
    stage.paymentMode = paymentMode;
    stage.transactionId = transactionId;
    stage.receiptNumber = receiptNumber;
    stage.remarks = remarks;
    stage.status = paidAmount >= stage.amount ? 'paid' : 'pending';
    
    // Recalculate total paid and pending amounts
    paymentSchedule.totalPaid = paymentSchedule.paymentStages.reduce((sum: number, s: any) => sum + s.paidAmount, 0);
    paymentSchedule.totalPending = paymentSchedule.totalAmount - paymentSchedule.totalPaid;
    
    // Check if payment schedule is completed
    if (paymentSchedule.totalPending <= 0) {
      paymentSchedule.status = 'completed';
      paymentSchedule.completedAt = new Date();
    }
    
    await paymentSchedule.save();
    
    return NextResponse.json({
      success: true,
      message: "Payment updated successfully",
      data: paymentSchedule
    });
    
  } catch (error) {
    console.error("Payment schedule PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}