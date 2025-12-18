import connect from "@/lib/db";
import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { Customer } from "@/lib/models/users/Customer";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Staff } from "@/lib/models/users/Staff";
import { Admin } from "@/lib/models/users/Admin";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidEmail, isStrongPassword } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

const SALT_ROUNDS = 10;

export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const { email, password, userType } = await req.json();

    // Validate input
    if (!email || !password || !userType) {
      return errorResponse("Email, password, and userType are required", 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Invalid email format", 400);
    }

    if (!isStrongPassword(password)) {
      return errorResponse(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        400
      );
    }

    const validUserTypes = ["admin", "user", "staff", "clients"];
    if (!validUserTypes.includes(userType)) {
      return errorResponse("Invalid user type", 400);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Use transaction for atomicity
    await connect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let userModel;
      switch (userType) {
        case "admin":
          userModel = Admin;
          break;
        case "user":
          userModel = Customer;
          break;
        case "staff":
          userModel = Staff;
          break;
        default:
          await session.abortTransaction();
          return errorResponse("Invalid user type", 400);
      }

      // Update both user model and LoginUser in a transaction
      const [updatedUser, updatedLoginUser] = await Promise.all([
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

      if (!updatedUser) {
        await session.abortTransaction();
        return errorResponse("User not found", 404);
      }

      await session.commitTransaction();

      return successResponse(null, "Password updated successfully");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error updating password", error);
    return errorResponse("Failed to update password", 500);
  }
};
