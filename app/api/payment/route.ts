import connect from "@/lib/db";
import { CustomerDetails } from "@/lib/models/CustomerDetails";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();
    const { userId, propertyId, payment } = await req.json();

    // Validate required parameters
    if (!userId || !propertyId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required parameters: userId and propertyId are required",
        },
        { status: 400 }
      );
    }

    // Validate payment data
    if (!payment || !payment.title || !payment.percentage || !payment.date) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment data is incomplete. Required fields: title, percentage, date",
        },
        { status: 400 }
      );
    }

    // Find customer document
    const customerDetail = await CustomerDetails.findOne({ userId });

    if (!customerDetail) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Find the property to update
    const propertyIndex = customerDetail.property.findIndex(
      (prop: { _id: string }) => prop._id.toString() === propertyId
    );

    if (propertyIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Property not found for this user",
        },
        { status: 404 }
      );
    }

    // Initialize payments array if it doesn't exist
    if (!customerDetail.property[propertyIndex].payments) {
      customerDetail.property[propertyIndex].payments = [];
    }

    // Add payment to the property
    customerDetail.property[propertyIndex].payments.push(payment);

    await customerDetail.save();

    // Get the updated property
    const updatedProperty = customerDetail.property[propertyIndex];

    return NextResponse.json(
      {
        success: true,
        message: "Payment added successfully",
        property: updatedProperty,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding payment:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error occurred while adding payment",
        error: error,
      },
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest | Request) => {
  try {
    await connect();
    const { userId, propertyId, paymentIndex, updatedPayment } =
      await req.json();

    // Validate required parameters
    if (!userId || !propertyId || paymentIndex === undefined) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required parameters: userId, propertyId, and paymentIndex are required",
        },
        { status: 400 }
      );
    }

    // Validate payment data
    if (
      !updatedPayment ||
      !updatedPayment.title ||
      !updatedPayment.percentage ||
      !updatedPayment.date
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment data is incomplete. Required fields: title, percentage, date",
        },
        { status: 400 }
      );
    }

    // Find customer document
    const customerDetail = await CustomerDetails.findOne({ userId });

    if (!customerDetail) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Find the property to update
    const propertyIndex = customerDetail.property.findIndex(
      (prop: { _id: string }) => prop._id.toString() === propertyId
    );

    if (propertyIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Property not found for this user",
        },
        { status: 404 }
      );
    }

    // Check if property has payments array
    if (
      !customerDetail.property[propertyIndex].payments ||
      !Array.isArray(customerDetail.property[propertyIndex].payments)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No payments found for this property",
        },
        { status: 404 }
      );
    }

    // Check if payment index is valid
    if (
      paymentIndex < 0 ||
      paymentIndex >= customerDetail.property[propertyIndex].payments.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment index",
        },
        { status: 400 }
      );
    }

    // Update the payment
    customerDetail.property[propertyIndex].payments[paymentIndex] =
      updatedPayment;

    // Save the updated document
    await customerDetail.save();

    // Get the updated property
    const updatedProperty = customerDetail.property[propertyIndex];

    return NextResponse.json(
      {
        success: true,
        message: "Payment updated successfully",
        property: updatedProperty,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error occurred while updating payment",
        error: error,
      },
      { status: 500 }
    );
  }
};

export const DELETE = async (req: NextRequest | Request) => {
  try {
    await connect();
    // For DELETE requests, parameters can be passed in URL or body
    // Here we support both approaches
    const url = new URL(req.url);
    const userIdParam = url.searchParams.get("userId");
    const propertyIdParam = url.searchParams.get("propertyId");
    const paymentIndexParam = url.searchParams.get("paymentIndex");

    const bodyParams = await req.json();

    const userId = userIdParam || bodyParams.userId;
    const propertyId = propertyIdParam || bodyParams.propertyId;
    const paymentIndex =
      paymentIndexParam !== null
        ? parseInt(paymentIndexParam)
        : bodyParams.paymentIndex;

    // Validate required parameters
    if (!userId || !propertyId || paymentIndex === undefined) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required parameters: userId, propertyId, and paymentIndex are required",
        },
        { status: 400 }
      );
    }

    // Find customer document
    const customerDetail = await CustomerDetails.findOne({ userId });

    if (!customerDetail) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Find the property
    const propertyIndex = customerDetail.property.findIndex(
      (prop: { _id: string }) => prop._id.toString() === propertyId
    );

    if (propertyIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Property not found for this user",
        },
        { status: 404 }
      );
    }

    // Check if property has payments array
    if (
      !customerDetail.property[propertyIndex].payments ||
      !Array.isArray(customerDetail.property[propertyIndex].payments)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No payments found for this property",
        },
        { status: 404 }
      );
    }

    // Check if payment index is valid
    if (
      paymentIndex < 0 ||
      paymentIndex >= customerDetail.property[propertyIndex].payments.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment index",
        },
        { status: 400 }
      );
    }

    // Remove the payment
    customerDetail.property[propertyIndex].payments.splice(paymentIndex, 1);

    // Save the updated document
    await customerDetail.save();

    // Get the updated property
    const updatedProperty = customerDetail.property[propertyIndex];

    return NextResponse.json(
      {
        success: true,
        message: "Payment deleted successfully",
        property: updatedProperty,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error occurred while deleting payment",
        error: error,
      },
      { status: 500 }
    );
  }
};
