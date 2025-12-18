import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Customer } from "@/lib/models/users/Customer";
import { CustomerDetails } from "@/lib/models/CustomerDetails";
import { Types } from "mongoose";

// For POST and PUT requests
interface UserCreateRequest {
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  password?: string;
  clientId: string;
  verified?: boolean;
  otp?: number;
  properties?: PropertyInput[];
}

// For GET response
interface UserResponse {
  _id: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  clientId: string;
  verified: boolean;
  otp?: number;
  properties?: CustomerDetailsResponse;
  createdAt?: string;
  updatedAt?: string;
}

// Property related interfaces
interface PropertyInput {
  id: string;
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  sectionType: string;
  flatId?: string;
  flatName?: string;
}

interface PropertyOutput {
  id: string;
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  sectionType: string;
  flatId: string;
  flatName: string;
  _id?: string;
}

interface CustomerDetailsResponse {
  _id: string;
  userId: string;
  property: PropertyOutput[];
  createdAt?: string;
  updatedAt?: string;
}

// Response types
interface UserWithDetailsResponse {
  user: UserResponse;
  customerDetails: CustomerDetailsResponse;
}

// Error response type
interface ErrorResponse {
  message: string;
  error?: unknown;
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

export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    // Get specific user by ID
    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid staff ID format", 400);
      }

      const userData = await Customer.findById(id);
      if (!userData) {
        return errorResponse("user not found", 404);
      }

      return successResponse(userData, "user retrieved successfully");
    }

    // Get specific user by email
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return errorResponse("Invalid email format", 400);
      }

      const userData = await Customer.findOne({ email });
      if (!userData) {
        return errorResponse("user not found with this email", 404);
      }

      return successResponse(userData, "user retrieved successfully");
    }

    // Get all users members
    const userData = await Customer.find().sort({ createdAt: -1 });

    return successResponse(
      userData,
      `Retrieved ${userData.length} user(s) successfully`
    );
  } catch (error: unknown) {
    console.error("GET /user error:", error);
    return errorResponse("Failed to fetch users data", 500, error);
  }
};

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const data = (await req.json()) as UserCreateRequest;

    const { email, phoneNumber, firstName, lastName, clientId } = data;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !clientId) {
      return NextResponse.json(
        {
          message:
            "firstName, lastName, email, phoneNumber, and clientId are required",
        } as ErrorResponse,
        { status: 400 }
      );
    }

    const customerData = { ...data };
    let propertiesData: PropertyInput[] | undefined;

    const findCustomer = await Customer.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (findCustomer) {
      return NextResponse.json(
        {
          message:
            "Customer already exists, please register with another email and phone number",
        } as ErrorResponse,
        {
          status: 409,
        }
      );
    }

    // Handle properties data separately
    if (customerData.properties) {
      propertiesData = customerData.properties;
      delete customerData.properties;
    }

    const newCustomer = new Customer(customerData);
    const savedCustomer = await newCustomer.save();

    if (!savedCustomer) {
      return NextResponse.json(
        {
          message: "Unknown error occurred, couldn't add the customer",
        } as ErrorResponse,
        { status: 404 }
      );
    }

    // Handle customer details if properties are provided
    if (propertiesData && propertiesData.length > 0) {
      const customerDetailsData = {
        userId: savedCustomer._id,
        property: propertiesData.map((prop: PropertyInput) => ({
          id: prop.id,
          projectId: prop.projectId,
          projectName: prop.projectName,
          sectionId: prop.sectionId,
          sectionName: prop.sectionName,
          sectionType: prop.sectionType,
          flatId: prop.flatId || "",
          flatName: prop.flatName || "",
        })),
      };

      const newCustomerDetails = new CustomerDetails(customerDetailsData);
      const savedCustomerDetails = await newCustomerDetails.save();

      // Update the customer with reference to CustomerDetails
      await Customer.findByIdAndUpdate(savedCustomer._id, {
        properties: savedCustomerDetails._id,
      });

      // Fetch the updated customer with populated properties
      const updatedCustomer = await Customer.findById(
        savedCustomer._id
      ).populate("properties");

      // Return the complete customer with details
      return NextResponse.json(
        {
          user: updatedCustomer,
          customerDetails: savedCustomerDetails,
        } as UserWithDetailsResponse,
        { status: 200 }
      );
    }

    // Return the saved customer without properties
    return NextResponse.json(savedCustomer as UserResponse, { status: 200 });
  } catch (error: unknown) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      {
        error: error,
        message: "An error occurred while creating the customer",
      } as ErrorResponse,
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest | Request) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Customer ID is required" } as ErrorResponse,
        { status: 400 }
      );
    }

    const data = (await req.json()) as Partial<UserCreateRequest>;

    // Check if email or phone number is being updated and if it's already in use
    if (data.email || data.phoneNumber) {
      const query = [];

      if (data.email) query.push({ email: data.email, _id: { $ne: id } });
      if (data.phoneNumber)
        query.push({ phoneNumber: data.phoneNumber, _id: { $ne: id } });

      if (query.length > 0) {
        const existingCustomer = await Customer.findOne({ $or: query });

        if (existingCustomer) {
          return NextResponse.json(
            {
              message: "Email or phone number already in use",
            } as ErrorResponse,
            { status: 409 }
          );
        }
      }
    }

    const customerData = { ...data };
    let propertiesData: PropertyInput[] | undefined;

    if (customerData.properties) {
      propertiesData = customerData.properties;
      delete customerData.properties;
    }

    // Update customer data
    const updatedCustomer = await Customer.findByIdAndUpdate(id, customerData, {
      new: true,
    });

    if (!updatedCustomer) {
      return NextResponse.json(
        { message: "Customer not found" } as ErrorResponse,
        { status: 404 }
      );
    }

    // Handle properties update
    if (propertiesData) {
      // Find existing customer details
      let customerDetails = await CustomerDetails.findOne({ userId: id });

      if (customerDetails) {
        // Update existing customer details
        customerDetails.property = propertiesData.map(
          (prop: PropertyInput) => ({
            id: prop.id,
            projectId: prop.projectId,
            projectName: prop.projectName,
            sectionId: prop.sectionId,
            sectionName: prop.sectionName,
            sectionType: prop.sectionType,
            flatId: prop.flatId || "",
            flatName: prop.flatName || "",
          })
        );

        await customerDetails.save();
      } else {
        // Create new customer details if not exist
        const customerDetailsData = {
          userId: updatedCustomer._id,
          property: propertiesData.map((prop: PropertyInput) => ({
            id: prop.id,
            projectId: prop.projectId,
            projectName: prop.projectName,
            sectionId: prop.sectionId,
            sectionName: prop.sectionName,
            sectionType: prop.sectionType,
            flatId: prop.flatId || "",
            flatName: prop.flatName || "",
          })),
        };

        customerDetails = new CustomerDetails(customerDetailsData);
        await customerDetails.save();

        // Update the customer with reference to CustomerDetails
        await Customer.findByIdAndUpdate(updatedCustomer._id, {
          properties: customerDetails._id,
        });
      }

      // Fetch the updated customer with populated properties
      const findCustomer = await Customer.findById(id).populate("properties");

      return NextResponse.json(
        {
          user: findCustomer,
          customerDetails: customerDetails,
        } as UserWithDetailsResponse,
        { status: 200 }
      );
    }

    // For no property updates, return the updated customer
    const findCustomer = await Customer.findById(id).populate("properties");
    return NextResponse.json(findCustomer, { status: 200 });
  } catch (error: unknown) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      {
        error: error,
        message: "An error occurred while updating the customer",
      } as ErrorResponse,
      { status: 500 }
    );
  }
};

export const DELETE = async (req: NextRequest | Request) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Customer ID is required" } as ErrorResponse,
        { status: 400 }
      );
    }

    // First, find the customer to check if it exists
    const customer = await Customer.findById(id);

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" } as ErrorResponse,
        { status: 404 }
      );
    }

    // Delete customer details first (if they exist)
    await CustomerDetails.findOneAndDelete({ userId: id });

    // Delete the customer
    const deletedCustomer = await Customer.findByIdAndDelete(id);

    if (!deletedCustomer) {
      return NextResponse.json(
        { message: "Error deleting customer" } as ErrorResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Customer deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      {
        error: error,
        message: "An error occurred while deleting the customer",
      } as ErrorResponse,
      { status: 500 }
    );
  }
};
