import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Customer } from "@/lib/models/users/Customer";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Types } from "mongoose";
import bcrypt from "bcrypt";

// Customer registration interface
interface CustomerRegisterRequest {
  name: string;
  mobileNumber: string;
  email: string;
  password: string;
  isEmailVerified?: boolean;
  isRegistered?: boolean;
}

// Customer response interface
interface CustomerResponse {
  customerId: string;
  name: string;
  mobileNumber: string;
  email: string;
  qrCodeData: string;
  isEmailVerified: boolean;
  isRegistered: boolean;
  createdAt: string;
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

// Generate QR code data
const generateQRCodeData = (customerId: string, mobileNumber: string): string => {
  return JSON.stringify({
    customerId,
    mobile: mobileNumber,
    timestamp: new Date().toISOString(),
  });
};

// GET: Retrieve customer by customerId or mobile number
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const mobile = searchParams.get("mobile");

    // Get specific customer by customerId
    if (customerId) {
      if (!isValidObjectId(customerId)) {
        return errorResponse("Invalid customer ID format", 400);
      }

      const customer = await Customer.findById(customerId).lean() as any;
      if (!customer) {
        return errorResponse("Customer not found", 404);
      }

      // Format response to match mobile app expectations
      const customerResponse: CustomerResponse = {
        customerId: customer._id.toString(),
        name: `${customer.firstName} ${customer.lastName}`,
        mobileNumber: customer.phoneNumber,
        email: customer.email,
        qrCodeData: customer.qrCodeData || generateQRCodeData(customer._id.toString(), customer.phoneNumber),
        isEmailVerified: customer.verified || false,
        isRegistered: true,
        createdAt: customer.createdAt?.toISOString() || new Date().toISOString(),
      };

      return successResponse(customerResponse, "Customer retrieved successfully");
    }

    // Get specific customer by mobile number
    if (mobile) {
      const customer = await Customer.findOne({ phoneNumber: mobile }).lean() as any;
      if (!customer) {
        return errorResponse("Customer not found with this mobile number", 404);
      }

      // Format response to match mobile app expectations
      const customerResponse: CustomerResponse = {
        customerId: customer._id.toString(),
        name: `${customer.firstName} ${customer.lastName}`,
        mobileNumber: customer.phoneNumber,
        email: customer.email,
        qrCodeData: customer.qrCodeData || generateQRCodeData(customer._id.toString(), customer.phoneNumber),
        isEmailVerified: customer.verified || false,
        isRegistered: true,
        createdAt: customer.createdAt?.toISOString() || new Date().toISOString(),
      };

      return successResponse(customerResponse, "Customer retrieved successfully");
    }

    return errorResponse("Please provide customerId or mobile parameter", 400);
  } catch (error: unknown) {
    console.error("GET /api/customer/register error:", error);
    return errorResponse("Failed to fetch customer data", 500, error);
  }
};

// POST: Register new customer
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const data = (await req.json()) as CustomerRegisterRequest;
    const { name, mobileNumber, email, password, isEmailVerified } = data;

    // Validate required fields
    if (!name || !mobileNumber || !email || !password) {
      return errorResponse("Name, mobile number, email, and password are required", 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Validate mobile number (10 digits)
    if (!/^\d{10}$/.test(mobileNumber)) {
      return errorResponse("Mobile number must be 10 digits", 400);
    }

    // Password validation
    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters long", 400);
    }

    if (!/[A-Z]/.test(password)) {
      return errorResponse("Password must contain at least one uppercase letter", 400);
    }

    if (!/[a-z]/.test(password)) {
      return errorResponse("Password must contain at least one lowercase letter", 400);
    }

    if (!/\d/.test(password)) {
      return errorResponse("Password must contain at least one number", 400);
    }

    if (!/[@$!%*?&]/.test(password)) {
      return errorResponse("Password must contain at least one special character (@$!%*?&)", 400);
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phoneNumber: mobileNumber }],
    });

    if (existingCustomer) {
      return errorResponse(
        "Customer already exists with this email or mobile number",
        409
      );
    }

    // Split name into firstName and lastName
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new customer
    const newCustomer = new Customer({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phoneNumber: mobileNumber,
      password: hashedPassword, // Store hashed password
      verified: isEmailVerified || false,
      clientId: "69600d70cd1b223a43790497", // Default client ID
    });

    const savedCustomer = await newCustomer.save();

    if (!savedCustomer) {
      return errorResponse("Failed to create customer", 500);
    }

    // Generate QR code data
    const qrCodeData = generateQRCodeData(
      savedCustomer._id.toString(),
      savedCustomer.phoneNumber
    );

    // Update customer with QR code data
    savedCustomer.qrCodeData = qrCodeData;
    await savedCustomer.save();

    // Create login user entry for authentication
    await LoginUser.create({
      email: email.toLowerCase(),
      password: hashedPassword, // Store hashed password
      userType: "customer",
    });

    // Format response to match mobile app expectations
    const customerResponse: CustomerResponse = {
      customerId: savedCustomer._id.toString(),
      name: `${savedCustomer.firstName} ${savedCustomer.lastName}`,
      mobileNumber: savedCustomer.phoneNumber,
      email: savedCustomer.email,
      qrCodeData: qrCodeData,
      isEmailVerified: savedCustomer.verified || false,
      isRegistered: true,
      createdAt: savedCustomer.createdAt?.toISOString() || new Date().toISOString(),
    };

    return successResponse(
      customerResponse,
      "Customer registered successfully",
      201
    );
  } catch (error: unknown) {
    console.error("POST /api/customer/register error:", error);
    return errorResponse("Failed to register customer", 500, error);
  }
};
