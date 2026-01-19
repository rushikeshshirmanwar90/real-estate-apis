import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Customer } from "@/lib/models/users/Customer";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import bcrypt from "bcrypt";

// Login request interface
interface CustomerLoginRequest {
  email: string;
  password: string;
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

// POST: Customer login
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const data = (await req.json()) as CustomerLoginRequest;
    const { email, password } = data;

    // Validate required fields
    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Find customer by email
    const customer = await Customer.findOne({ 
      email: email.toLowerCase() 
    }).lean() as any;

    if (!customer) {
      return errorResponse("Invalid email or password", 401);
    }

    // Check if customer has a password set
    if (!customer.password) {
      return errorResponse("Password not set for this account. Please contact support.", 401);
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    
    if (!isPasswordValid) {
      return errorResponse("Invalid email or password", 401);
    }

    // Check if login user entry exists, create if not
    const loginUserExists = await LoginUser.findOne({ 
      email: email.toLowerCase() 
    });

    if (!loginUserExists) {
      // Create login user entry with hashed password
      await LoginUser.create({
        email: email.toLowerCase(),
        password: customer.password, // Already hashed
        userType: "customer",
      });
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

    return successResponse(
      customerResponse,
      "Login successful",
      200
    );
  } catch (error: unknown) {
    console.error("POST /api/customer/login error:", error);
    return errorResponse("Login failed", 500, error);
  }
};
