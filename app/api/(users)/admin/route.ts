import { NextRequest, NextResponse } from "next/server";
import { checkValidClient } from "@/lib/auth";
import connect from "@/lib/db";
import { Admin } from "@/lib/models/users/Admin";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidEmail, isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  safeRedisDelCache 
} from "@/lib/utils/redis-helpers";

export const GET = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");
    
    // Get specific Admin by ID
    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid admin ID format", 400);
      }
      
      // Check if cache-busting parameter is present
      const skipCache = searchParams.get("_t") || searchParams.get("skipCache");
      
      // Check cache only if not skipping
      if (!skipCache) {
        const cachedData = await safeRedisGetCache(`admin:${id}`);
        if (cachedData) {
          const cacheValue = JSON.parse(cachedData);
          return successResponse(cacheValue, "Admin retrieved successfully (cached)");
        }
      }
      
      const adminData = await Admin.findById(id).select("-password").lean();
      
      if (!adminData) {
        return errorResponse("Admin not found", 404);
      }
      
      // Cache the admin with 24-hour expiration (only if not skipping cache)
      if (!skipCache) {
        await safeRedisSetCache(`admin:${id}`, JSON.stringify(adminData), 'EX', 86400);
      }
      
      return successResponse(adminData, skipCache ? "Admin retrieved successfully (fresh)" : "Admin retrieved successfully");
    }
    
    // Get specific admin by email
    if (email) {
      if (!isValidEmail(email)) {
        return errorResponse("Invalid email format", 400);
      }
      
      // Check cache
      const cachedData = await safeRedisGetCache(`admin:email:${email}`);
      if (cachedData) {
        const cacheValue = JSON.parse(cachedData);
        return successResponse(cacheValue, "Admin retrieved successfully (cached)");
      }
      
      const adminData = await Admin.findOne({ email })
        .select("-password")
        .lean();
      
      if (!adminData) {
        return errorResponse("Admin not found with this email", 404);
      }
      
      // Cache the admin with 24-hour expiration
      await safeRedisSetCache(`admin:email:${email}`, JSON.stringify(adminData), 'EX', 86400);
      
      return successResponse(adminData, "Admin retrieved successfully");
    }
    
    // Check cache for all admins
    const cachedData = await safeRedisGetCache(`admins:all`);
    if (cachedData) {
      const cacheValue = JSON.parse(cachedData);
      return successResponse(cacheValue, `Retrieved ${Array.isArray(cacheValue) ? cacheValue.length : 0} admin(s) successfully (cached)`);
    }
    
    // Get all admins without pagination
    const admins = await Admin.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();
    
    // Cache all admins with 24-hour expiration
    await safeRedisSetCache(`admins:all`, JSON.stringify(admins), 'EX', 86400);
    
    return successResponse(
      admins,
      `Retrieved ${admins.length} admin(s) successfully`
    );
  } catch (error) {
    logger.error("GET /admin error", error);
    return errorResponse("Failed to fetch admin data", 500);
  }
};


export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    
    const data = await req.json();
    
    // Validate required fields
    if (!data.email) {
      return errorResponse("Email is required", 400);
    }
    
    if (!isValidEmail(data.email)) {
      return errorResponse("Invalid email format", 400);
    }
    
    if (!data.firstName || !data.lastName) {
      return errorResponse("First name and last name are required", 400);
    }
    
    if (!data.phoneNumber) {
      return errorResponse("Phone number is required", 400);
    }
    
    if (!data.clientId) {
      return errorResponse("Client ID is required", 400);
    }
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: data.email }).lean();
    if (existingAdmin) {
      return errorResponse("Admin already exists with this email", 409);
    }
    
    // Create admin
    const newAdmin = new Admin(data);
    await newAdmin.save();
    
    // Return admin without password
    const { password: _, ...adminWithoutPassword } = newAdmin.toObject();
    
    // Invalidate cache
    await safeRedisDelCache(`admins:all`);
    
    return successResponse(
      adminWithoutPassword,
      "Admin created successfully",
      201
    );
  } catch (error: unknown) {
    logger.error("Error creating admin", error);
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }
    return errorResponse("Failed to create admin", 500);
  }
};


export const PUT = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return errorResponse("Admin ID is required", 400);
    }
    
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid admin ID format", 400);
    }
    
    const updateData = await req.json();
    
    // Don't allow password updates through this endpoint
    delete updateData.password;
    
    // Validate email if being updated
    if (updateData.email) {
      if (!isValidEmail(updateData.email)) {
        return errorResponse("Invalid email format", 400);
      }
      
      // Check if email already exists for another admin
      const existingAdmin = await Admin.findOne({
        email: updateData.email,
        _id: { $ne: id },
      }).lean();
      
      if (existingAdmin) {
        return errorResponse("Email already exists for another admin", 409);
      }
    }
    
    // Get old email before update if email is being changed
    let oldEmail: string | undefined;
    if (updateData.email) {
      const oldAdmin = await Admin.findById(id).select("email").lean();
      if (oldAdmin && !Array.isArray(oldAdmin)) {
        oldEmail = (oldAdmin as any).email;
      }
    }
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();
    
    if (!updatedAdmin) {
      return errorResponse("Admin not found", 404);
    }
    
    // Invalidate cache
    await safeRedisDelCache(`admins:all`);
    await safeRedisDelCache(`admin:${id}`);
    if (oldEmail) {
      await safeRedisDelCache(`admin:email:${oldEmail}`);
    }
    if (updateData.email) {
      await safeRedisDelCache(`admin:email:${updateData.email}`);
    }
    
    return successResponse(updatedAdmin, "Admin updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating admin", error);
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }
    return errorResponse("Failed to update admin", 500);
  }
};


export const DELETE = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    
    if (!email) {
      return errorResponse("Email is required", 400);
    }
    
    if (!isValidEmail(email)) {
      return errorResponse("Invalid email format", 400);
    }
    
    const deletedAdmin = await Admin.findOneAndDelete({ email }).lean();
    
    if (!deletedAdmin) {
      return errorResponse("Admin not found", 404);
    }
    
    // Invalidate cache
    await safeRedisDelCache(`admins:all`);
    if (deletedAdmin && !Array.isArray(deletedAdmin) && deletedAdmin._id) {
      await safeRedisDelCache(`admin:${deletedAdmin._id}`);
    }
    await safeRedisDelCache(`admin:email:${email}`);
    
    return successResponse(deletedAdmin, "Admin deleted successfully");
  } catch (error: unknown) {
    logger.error("Error deleting admin", error);
    return errorResponse("Failed to delete admin", 500);
  }
};
