import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Building } from "@/lib/models/Building";
import { Customer } from "@/lib/models/users/Customer";
import { Booking } from "@/lib/models/Shivai/Booking";
import { Registry } from "@/lib/models/Shivai/Registry";
import { PaymentSchedule } from "@/lib/models/Shivai/Payment";
import { Types } from "mongoose";

// Property assignment interface
interface PropertyAssignmentRequest {
  customerId: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  unitId: string;
  unitNumber: string;
  originalPrice: number;
  discountPrice?: number | null;
  assignedBy: string;
}

// Property assignment response interface
interface PropertyAssignmentResponse {
  _id: string;
  customerId: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  unitId: string;
  unitNumber: string;
  originalPrice: number;
  discountPrice?: number;
  finalPrice: number;
  status: string;
  assignedAt: string;
  assignedBy: string;
}

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

// Helper function for error responses
const errorResponse = (message: string, status: number, error?: unknown) => {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(error && typeof error === "object"
        ? { error: error instanceof Error ? error.message : error }
        : {}),
    },
    { status }
  );
};

// Helper function for success responses
const successResponse = (
  data: unknown,
  message?: string,
  status: number = 200
) => {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data,
    },
    { status }
  );
};

// GET: Retrieve property assignments for a customer
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return errorResponse("Customer ID is required", 400);
    }

    if (!isValidObjectId(customerId)) {
      return errorResponse("Invalid customer ID format", 400);
    }

    // Find all buildings with units assigned to this customer
    const buildings = await Building.find({
      "floors.units.customerInfo.customerId": customerId,
    }).lean() as any[];

    const assignments: PropertyAssignmentResponse[] = [];

    // Extract assigned units from buildings
    for (const building of buildings) {
      for (const floor of building.floors || []) {
        for (const unit of floor.units || []) {
          if (unit.customerInfo?.customerId === customerId) {
            assignments.push({
              _id: unit._id.toString(),
              customerId: customerId,
              clientId: building.clientId?.toString() || "",
              clientName: "Shivai Construction",
              projectId: building.projectId?.toString() || "",
              projectName: building.name || "",
              sectionId: building._id.toString(),
              sectionName: building.name || "",
              unitId: unit._id.toString(),
              unitNumber: unit.unitNumber,
              originalPrice: unit.customerInfo.originalPrice || 0,
              discountPrice: unit.customerInfo.discountPrice,
              finalPrice: unit.customerInfo.finalPrice || unit.customerInfo.originalPrice || 0,
              status: unit.status || "assigned",
              assignedAt: unit.bookingDate?.toISOString() || new Date().toISOString(),
              assignedBy: unit.customerInfo.assignedBy || "Admin",
            });
          }
        }
      }
    }

    if (assignments.length === 0) {
      return errorResponse("No property assignments found for this customer", 404);
    }

    return successResponse(assignments, "Property assignments retrieved successfully");
  } catch (error: unknown) {
    console.error("GET /api/customer/assign-property error:", error);
    return errorResponse("Failed to fetch property assignments", 500, error);
  }
};

// POST: Assign property to customer
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const data = (await req.json()) as PropertyAssignmentRequest;
    const {
      customerId,
      clientId,
      clientName,
      projectId,
      projectName,
      sectionId,
      sectionName,
      unitId,
      unitNumber,
      originalPrice,
      discountPrice,
      assignedBy,
    } = data;

    // Validate required fields
    if (!customerId || !sectionId || !unitId || !originalPrice) {
      console.error('❌ Missing required fields:', { customerId, sectionId, unitId, originalPrice });
      return errorResponse(
        "Customer ID, section ID, unit ID, and original price are required",
        400
      );
    }

    // Validate ObjectIds
    if (!isValidObjectId(customerId)) {
      console.error('❌ Invalid customer ID:', customerId);
      return errorResponse("Invalid customer ID format", 400);
    }
    if (!isValidObjectId(sectionId)) {
      console.error('❌ Invalid section ID:', sectionId);
      return errorResponse("Invalid section ID format", 400);
    }
    if (!isValidObjectId(unitId)) {
      console.error('❌ Invalid unit ID:', unitId);
      return errorResponse("Invalid unit ID format", 400);
    }

    console.log('🔍 Fetching customer:', customerId);
    // Fetch customer details
    const customer = await Customer.findById(customerId).lean() as any;
    if (!customer) {
      console.error('❌ Customer not found:', customerId);
      return errorResponse("Customer not found", 404);
    }
    console.log('✅ Customer found:', customer.firstName, customer.lastName);

    console.log('🔍 Fetching building:', sectionId);
    // Find the building (section)
    const building = await Building.findById(sectionId) as any;
    if (!building) {
      console.error('❌ Building not found:', sectionId);
      return errorResponse("Building not found", 404);
    }
    console.log('✅ Building found:', building.name);

    console.log('🔍 Finding unit in building...');
    // Find the unit in the building
    let targetFloor = null;
    let targetUnit = null;

    for (const floor of building.floors || []) {
      const unit = floor.units?.find((u: any) => u._id.toString() === unitId);
      if (unit) {
        targetFloor = floor;
        targetUnit = unit;
        console.log(`✅ Found unit ${unit.unitNumber} on floor ${floor.floorNumber}`);
        break;
      }
    }

    if (!targetFloor || !targetUnit) {
      console.error('❌ Unit not found in building:', unitId);
      console.error('Available floors:', building.floors?.length || 0);
      building.floors?.forEach((floor: any, index: number) => {
        console.error(`Floor ${index + 1} (${floor.floorNumber}):`, floor.units?.length || 0, 'units');
      });
      return errorResponse("Unit not found in building", 404);
    }

    // Check if unit is available
    if (targetUnit.status !== "Available") {
      console.error('❌ Unit is not available:', targetUnit.status);
      return errorResponse(`Unit is already ${targetUnit.status}`, 400);
    }
    console.log('✅ Unit is available for booking');

    // Calculate final price (original price minus discount amount)
    const finalPrice = discountPrice && discountPrice > 0 ? originalPrice - discountPrice : originalPrice;
    console.log('💰 Pricing:', { originalPrice, discountPrice, finalPrice });

    console.log('📝 Updating unit with customer information...');
    // Update unit with customer information
    targetUnit.status = "Booked";
    targetUnit.sold = true; // ✅ REQUIRED: Update sold from false to true
    targetUnit.customerInfo = {
      customerId: customerId,
      name: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phoneNumber,
      email: customer.email,
      originalPrice: originalPrice,
      discountPrice: discountPrice || null,
      finalPrice: finalPrice,
      assignedBy: assignedBy || "Admin",
    };
    targetUnit.bookingDate = new Date();

    // Update floor's booked units count
    targetFloor.totalBookedUnits = targetFloor.units.filter(
      (u: any) => u.status === "Booked" || u.status === "Sold"
    ).length;

    // Update building's total booked units count
    building.totalBookedUnits = building.floors.reduce((total: number, f: any) => {
      return total + (f.totalBookedUnits || 0);
    }, 0);

    // Save the building
    console.log('💾 Saving building...');
    await building.save();
    console.log('✅ Building saved successfully');

    console.log('📋 Creating Booking entry...');
    // Create Booking entry
    const booking = new Booking({
      customerId: customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerMobile: customer.phoneNumber,
      customerEmail: customer.email,
      clientId: clientId || building.clientId,
      projectId: projectId || building.projectId,
      projectName: projectName || building.name,
      buildingId: building._id,
      buildingName: building.name,
      floorId: targetFloor._id,
      unitId: targetUnit._id,
      flatNumber: targetUnit.unitNumber,
      flatType: targetUnit.type,
      flatArea: targetUnit.area,
      originalPrice: originalPrice,
      discountPrice: discountPrice || null,
      finalPrice: finalPrice,
      bookingAmount: 0, // Will be updated when payment schedule is created
      status: 'pending',
      bookingDate: targetUnit.bookingDate,
      assignedBy: assignedBy || "Admin",
      registryCompleted: false,
      paymentScheduleCompleted: false,
      bookingCompleted: false,
    });

    await booking.save();
    console.log(`✅ Created booking ${booking._id} for customer ${customerId}`);

    console.log('📄 Creating Registry entry...');
    // Create Registry entry (draft - to be filled by customer later)
    const registry = new Registry({
      bookingId: booking._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      mobileNumber: customer.phoneNumber,
      address: '', // To be filled by customer
      aadharNumber: '', // To be filled by customer
      panNumber: '', // To be filled by customer
      projectName: projectName || building.name,
      flatNumber: targetUnit.unitNumber,
      directions: {
        north: '',
        south: '',
        east: '',
        west: '',
      },
      status: 'draft', // Draft status - fields can be empty
    });

    await registry.save();
    console.log(`✅ Created registry ${registry._id} for booking ${booking._id}`);

    console.log('💳 Creating Payment Schedule entry...');
    // Create Payment Schedule entry (empty - to be filled by customer)
    const paymentSchedule = new PaymentSchedule({
      bookingId: booking._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerMobile: customer.phoneNumber,
      projectName: projectName || building.name,
      flatNumber: targetUnit.unitNumber,
      totalAmount: finalPrice,
      bookingAmount: 0, // To be filled by customer
      paymentStages: [], // To be filled by customer
      installmentPlan: 'construction-linked',
      termsAccepted: false,
      status: 'active',
      totalPaid: 0,
      totalPending: finalPrice,
    });

    await paymentSchedule.save();
    console.log(`✅ Created payment schedule ${paymentSchedule._id} for booking ${booking._id}`);

    console.log('🔗 Updating booking with registry and payment schedule IDs...');
    // Update booking with registry and payment schedule IDs
    booking.registryId = registry._id;
    booking.paymentScheduleId = paymentSchedule._id;
    await booking.save();
    console.log('✅ Booking updated with references');

    console.log('👤 Updating customer myFlats and bookings...');
    // Update customer's myFlats array with bookingId and bookings array
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      {
        $push: {
          myFlats: {
            buildingId: building._id,
            floorId: targetFloor._id,
            unitId: targetUnit._id,
            unitNumber: targetUnit.unitNumber,
            assignedAt: targetUnit.bookingDate,
            bookingId: booking._id,
          },
          bookings: booking._id,
        },
      },
      { new: true }
    );

    if (!updatedCustomer) {
      console.error('⚠️ Warning: Failed to update customer myFlats');
    } else {
      console.log(`✅ Updated customer ${customerId} myFlats and bookings with booking ${booking._id}`);
    }

    // Format response
    const assignmentResponse: PropertyAssignmentResponse = {
      _id: targetUnit._id.toString(),
      customerId: customerId,
      clientId: clientId || "",
      clientName: clientName || "Shivai Construction",
      projectId: projectId || building.projectId?.toString() || "",
      projectName: projectName || building.name || "",
      sectionId: sectionId,
      sectionName: sectionName || building.name || "",
      unitId: unitId,
      unitNumber: unitNumber || targetUnit.unitNumber,
      originalPrice: originalPrice,
      discountPrice: discountPrice || undefined,
      finalPrice: finalPrice,
      status: "assigned",
      assignedAt: targetUnit.bookingDate.toISOString(),
      assignedBy: assignedBy || "Admin",
    };

    return successResponse(
      assignmentResponse,
      "Property assigned successfully",
      201
    );
  } catch (error: unknown) {
    console.error("POST /api/customer/assign-property error:", error);
    return errorResponse("Failed to assign property", 500, error);
  }
};
