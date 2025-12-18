import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Admin } from "@/lib/models/users/Admin";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireValidClient } from "@/lib/utils/client-validation";

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
    const clientId = searchParams.get("clientId");

    // Get specific admin by ID
    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid admin ID format", 400);
      }

      const adminData = await Admin.findById(id);
      if (!adminData) {
        return errorResponse("Admin not found", 404);
      }

      return successResponse(adminData, "Admin retrieved successfully");
    }

    // Get specific admin by email
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return errorResponse("Invalid email format", 400);
      }

      const adminData = await Admin.findOne({ email });
      if (!adminData) {
        return errorResponse("Admin not found with this email", 404);
      }

      return successResponse(adminData, "Admin retrieved successfully");
    }

    if (clientId) {
      if (!isValidObjectId(clientId)) {
        return errorResponse("Invalid Id format", 400);
      }

      // ✅ Validate client exists
      try {
        await requireValidClient(clientId);
      } catch (clientError) {
        if (clientError instanceof Error) {
          return errorResponse(clientError.message, 404);
        }
        return errorResponse("Client validation failed", 404);
      }

      const adminData = await Admin.findOne({ clientId });
      if (!adminData) {
        return errorResponse("Admin not found with this clientId", 404);
      }

      return successResponse(adminData, "Admin retrieved successfully");
    }

    // Get all admins
    const adminData = await Admin.find().sort({ createdAt: -1 });

    return successResponse(
      adminData,
      `Retrieved ${adminData.length} admin(s) successfully`
    );
  } catch (error: unknown) {
    console.error("GET /admin error:", error);
    return errorResponse("Failed to fetch admin data", 500, error);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const data = await req.json();

    // Validate required fields
    if (!data.email) {
      return errorResponse("Email is required", 400);
    }
    if (!data.clientId) {
      return errorResponse("ClientId is required", 400);
    }

    // ✅ Validate client exists before creating admin
    try {
      await requireValidClient(data.clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: data.email });
    if (existingAdmin) {
      return errorResponse("Admin already exists with this email", 409);
    }

    // Check if login user already exists
    const existingLoginUser = await LoginUser.findOne({ email: data.email });
    if (existingLoginUser) {
      return errorResponse("User already exists with this email", 409);
    }

    const { password, ...adminData } = data;
    console.log(password);

    // Create new admin
    const newAdmin = new Admin(adminData);
    const savedAdmin = await newAdmin.save();

    // Create login user entry
    const loginPayload = {
      email: data.email,
      userType: "admin",
    };
    const newLoginUser = new LoginUser(loginPayload);
    await newLoginUser.save();

    return successResponse(savedAdmin, "Admin created successfully", 201);
  } catch (error: unknown) {
    console.error("POST /admin error:", error);

    // Handle mongoose validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create admin", 500, error);
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Admin ID is required for update", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid admin ID format", 400);
    }

    const data = await req.json();

    // Remove sensitive fields that shouldn't be updated directly
    const { password, ...updateData } = data;
    console.log(password);

    // Validate email if provided
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return errorResponse("Invalid email format", 400);
      }

      // Check if email is already used by another admin
      const existingAdmin = await Admin.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });
      if (existingAdmin) {
        return errorResponse("Email already exists for another admin", 409);
      }
    }

    // Find and update the admin
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return errorResponse("Admin not found", 404);
    }

    // Update email in LoginUser if email was changed
    if (updateData.email) {
      await LoginUser.findOneAndUpdate(
        { adminId: id },
        { email: updateData.email }
      );
    }

    return successResponse(updatedAdmin, "Admin updated successfully");
  } catch (error: unknown) {
    console.error("PUT /admin error:", error);

    // Handle mongoose validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update admin", 500, error);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Admin ID is required for deletion", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid admin ID format", 400);
    }

    // Find the admin first to get their email
    const adminToDelete = await Admin.findById(id);
    if (!adminToDelete) {
      return errorResponse("Admin not found", 404);
    }

    // Delete the admin
    const deletedAdmin = await Admin.findByIdAndDelete(id);

    // Delete the corresponding login user entry
    await LoginUser.findOneAndDelete({
      $or: [{ email: adminToDelete.email }, { adminId: id }],
    });

    return successResponse(deletedAdmin, "Admin deleted successfully");
  } catch (error: unknown) {
    console.error("DELETE /admin error:", error);
    return errorResponse("Failed to delete admin", 500, error);
  }
};
