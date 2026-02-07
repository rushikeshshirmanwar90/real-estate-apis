import connect from "@/lib/db";
import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Customer } from "@/lib/models/users/Customer";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Staff } from "@/lib/models/users/Staff";
import { Admin } from "@/lib/models/users/Admin";
import { Client } from "@/lib/models/super-admin/Client";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidEmail, isStrongPassword } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

const SALT_ROUNDS = 10;

export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const { email, password, userType } = await req.json();

    console.log('🔐 PASSWORD API CALLED');
    console.log('📧 Email:', email);
    console.log('👤 User Type:', userType);
    console.log('🔑 Password length:', password?.length);

    // Validate input
    if (!email || !password || !userType) {
      console.log('❌ Missing required fields');
      return errorResponse("Email, password, and userType are required", 400);
    }

    if (!isValidEmail(email)) {
      console.log('❌ Invalid email format');
      return errorResponse("Invalid email format", 400);
    }

    if (!isStrongPassword(password)) {
      console.log('❌ Password validation failed');
      return errorResponse(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        400
      );
    }

    const validUserTypes = ["admin", "user", "users", "staff", "clients", "client"];
    if (!validUserTypes.includes(userType)) {
      console.log('❌ Invalid user type:', userType);
      return errorResponse(`Invalid user type: ${userType}. Valid types: ${validUserTypes.join(', ')}`, 400);
    }

    console.log('✅ Input validation passed');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('✅ Password hashed successfully');

    // Use transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let userModel;
      let normalizedUserType = userType;
      
      // Normalize user types and select appropriate model
      switch (userType) {
        case "admin":
          userModel = Admin;
          break;
        case "user":
        case "users":
          userModel = Customer;
          normalizedUserType = "user";
          break;
        case "staff":
          userModel = Staff;
          break;
        case "client":
        case "clients":
          userModel = Client;
          normalizedUserType = "clients";
          break;
        default:
          await session.abortTransaction();
          console.log('❌ Unhandled user type in switch:', userType);
          return errorResponse("Invalid user type", 400);
      }

      console.log('🔧 Selected user model:', userModel?.modelName || 'LoginUser only');
      console.log('🔧 Normalized user type:', normalizedUserType);

      let updatedUser = null;
      let updatedLoginUser = null;

      // Update both the specific user model and LoginUser
      console.log('🔧 Updating user in both models...');
      [updatedUser, updatedLoginUser] = await Promise.all([
        userModel.findOneAndUpdate(
          { email },
          { password: hashedPassword },
          { new: true, session }
        ),
        LoginUser.findOneAndUpdate(
          { email },
          { password: hashedPassword },
          { new: true, session }
        ),
      ]);

      console.log('✅ User model update result:', !!updatedUser);
      console.log('✅ LoginUser update result:', !!updatedLoginUser);

      if (!updatedUser) {
        await session.abortTransaction();
        console.log('❌ User not found in database');
        return errorResponse("User not found", 404);
      }

      await session.commitTransaction();
      console.log('✅ Transaction committed successfully');

      // Generate JWT token for the user after successful password update
      const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
      const jwtToken = jwt.sign(
        {
          id: updatedUser._id,
          email: updatedUser.email,
          userType: normalizedUserType,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      return successResponse(
        {
          user: {
            id: updatedUser._id,
            email: updatedUser.email,
            userType: normalizedUserType,
          },
          token: jwtToken, // JWT token for immediate login after password setup
        },
        "Password updated successfully"
      );
    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Transaction error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    console.error('❌ Password API error:', error);
    logger.error("Error updating password", error);
    return errorResponse("Failed to update password", 500);
  }
};
