import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Customer } from "@/lib/models/users/Customer";
import { Building } from "@/lib/models/Building";
import { Types } from "mongoose";

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

// GET: Retrieve customer's flats from myFlats field
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

    // Find customer with myFlats populated
    const customer = await Customer.findById(customerId)
      .populate({
        path: "myFlats.buildingId",
        model: "Building",
        select: "name projectId clientId",
      })
      .lean() as any;

    if (!customer) {
      return errorResponse("Customer not found", 404);
    }

    if (!customer.myFlats || customer.myFlats.length === 0) {
      return successResponse([], "No flats assigned to this customer");
    }

    // Build detailed flat information
    const flatsData = [];

    for (const flat of customer.myFlats) {
      try {
        // Get building details
        const building = await Building.findById(flat.buildingId).lean() as any;
        
        if (!building) {
          console.warn(`Building ${flat.buildingId} not found`);
          continue;
        }

        // Find the specific floor and unit
        let unitDetails = null;
        let floorDetails = null;

        for (const floor of building.floors || []) {
          if (floor._id.toString() === flat.floorId.toString()) {
            floorDetails = floor;
            const unit = floor.units?.find((u: any) => u._id.toString() === flat.unitId.toString());
            if (unit) {
              unitDetails = unit;
              break;
            }
          }
        }

        if (!unitDetails) {
          console.warn(`Unit ${flat.unitId} not found in building ${flat.buildingId}`);
          continue;
        }

        // Build flat data object
        flatsData.push({
          _id: flat.unitId.toString(),
          buildingId: building._id.toString(),
          buildingName: building.name,
          projectId: building.projectId?.toString() || "",
          floorId: flat.floorId.toString(),
          floorNumber: floorDetails?.floorNumber || 0,
          floorName: floorDetails?.floorName || `Floor ${floorDetails?.floorNumber || 0}`,
          unitId: flat.unitId.toString(),
          unitNumber: unitDetails.unitNumber,
          unitType: unitDetails.type,
          area: unitDetails.area,
          status: unitDetails.status,
          customerInfo: unitDetails.customerInfo || {},
          bookingDate: unitDetails.bookingDate,
          assignedAt: flat.assignedAt,
          bookingId: flat.bookingId?.toString() || null, // Add bookingId from myFlats
          description: unitDetails.description || "",
          images: unitDetails.images || [],
        });
      } catch (error) {
        console.error(`Error processing flat ${flat.unitId}:`, error);
        continue;
      }
    }

    if (flatsData.length === 0) {
      return successResponse([], "No valid flats found for this customer");
    }

    return successResponse(flatsData, "Customer flats retrieved successfully");
  } catch (error: unknown) {
    console.error("GET /api/customer/my-flats error:", error);
    return errorResponse("Failed to fetch customer flats", 500, error);
  }
};
