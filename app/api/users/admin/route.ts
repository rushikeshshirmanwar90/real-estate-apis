import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Admin } from "@/lib/models/users/Admin";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireValidClient } from "@/lib/utils/client-validation";
import { client } from "@/lib/redis";

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

    console.log('🔍 Admin API (users/admin) called with:', { id, email, clientId });

    // Get specific admin by ID
    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid admin ID format", 400);
      }

      // Check cache
      let cacheValue = await client.get(`admin:${id}`);
      if (cacheValue) {
        cacheValue = JSON.parse(cacheValue);
        return successResponse(cacheValue, "Admin retrieved successfully (cached)");
      }

      const adminData = await Admin.findById(id);
      if (!adminData) {
        return errorResponse("Admin not found", 404);
      }

      // Cache the admin
      await client.set(`admin:${id}`, JSON.stringify(adminData));

      return successResponse(adminData, "Admin retrieved successfully");
    }

    // Get specific admin by email
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return errorResponse("Invalid email format", 400);
      }

      // Check cache
      let cacheValue = await client.get(`admin:email:${email}`);
      if (cacheValue) {
        cacheValue = JSON.parse(cacheValue);
        return successResponse(cacheValue, "Admin retrieved successfully (cached)");
      }

      const adminData = await Admin.findOne({ email });
      if (!adminData) {
        return errorResponse("Admin not found with this email", 404);
      }

      // Cache the admin
      await client.set(`admin:email:${email}`, JSON.stringify(adminData));

      return successResponse(adminData, "Admin retrieved successfully");
    }

    if (clientId) {
      if (!isValidObjectId(clientId)) {
        return errorResponse("Invalid Id format", 400);
      }

      // ✅ Validate client exists
      try {
        await requireValidClient(clientId);
        console.log('✅ Client validation passed for admin');
      } catch (clientError) {
        console.log('❌ Client validation failed for admin:', clientError);
        if (clientError instanceof Error) {
          return errorResponse(clientError.message, 404);
        }
        return errorResponse("Client validation failed", 404);
      }

      // Check cache
      let cacheValue = await client.get(`admin:client:${clientId}`);
      if (cacheValue) {
        cacheValue = JSON.parse(cacheValue);
        return successResponse(cacheValue, "Admin retrieved successfully (cached)");
      }

      console.log('🔍 Fetching admin for clientId:', clientId);
      const adminData = await Admin.findOne({ clientId });
      console.log('📊 Admin found:', adminData ? 'Yes' : 'No');
      
      if (!adminData) {
        return errorResponse("Admin not found with this clientId", 404);
      }

      // Cache the admin
      await client.set(`admin:client:${clientId}`, JSON.stringify(adminData));

      return successResponse(adminData, "Admin retrieved successfully");
    }

    // Get all admins
    console.log('🔍 Fetching all admins');
    
    // Check cache
    let cacheValue = await client.get(`admin:all`);
    if (cacheValue) {
      cacheValue = JSON.parse(cacheValue);
      return successResponse(cacheValue, `Retrieved ${Array.isArray(cacheValue) ? cacheValue.length : 0} admin(s) successfully (cached)`);
    }
    
    const adminData = await Admin.find().sort({ createdAt: -1 });
    console.log('📊 Total admins found:', adminData.length);

    // Cache all admins
    await client.set(`admin:all`, JSON.stringify(adminData));

    return successResponse(
      adminData,
      `Retrieved ${adminData.length} admin(s) successfully`
    );
  } catch (error: unknown) {
    console.error("GET /users/admin error:", error);
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

    // Invalidate cache
    await client.del(`admin:all`);

    return successResponse(savedAdmin, "Admin created successfully", 201);
  } catch (error: unknown) {
    console.error("POST /users/admin error:", error);

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

    // Invalidate cache
    await client.del(`admin:${id}`);
    await client.del(`admin:all`);
    if (updatedAdmin.clientId) {
      await client.del(`admin:client:${updatedAdmin.clientId}`);
    }
    if (updateData.email) {
      await client.del(`admin:email:${updateData.email}`);
    }

    return successResponse(updatedAdmin, "Admin updated successfully");
  } catch (error: unknown) {
    console.error("PUT /users/admin error:", error);

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

    // Invalidate cache
    await client.del(`admin:${id}`);
    await client.del(`admin:all`);
    await client.del(`admin:email:${adminToDelete.email}`);
    if (adminToDelete.clientId) {
      await client.del(`admin:client:${adminToDelete.clientId}`);
    }

    return successResponse(deletedAdmin, "Admin deleted successfully");
  } catch (error: unknown) {
    console.error("DELETE /users/admin error:", error);
    return errorResponse("Failed to delete admin", 500, error);
  }
};