import connect from "@/lib/db";
import { Customer } from "@/lib/models/users/Customer";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidEmail } from "@/lib/utils/validation";
import { verifyOTP } from "@/lib/utils/otp";
import { logger } from "@/lib/utils/logger";

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return errorResponse("Email and OTP are required", 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Find user
    const user = await Customer.findOne({ email });
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Check if OTP data exists
    if (!user.otp || !user.otpExpiresAt) {
      return errorResponse("No OTP found. Please request a new one.", 400);
    }

    // Verify OTP
    const verification = verifyOTP(
      otp,
      user.otp,
      user.otpExpiresAt,
      user.otpAttempts || 0
    );

    if (!verification.valid) {
      // Increment attempts
      await Customer.findOneAndUpdate({ email }, { $inc: { otpAttempts: 1 } });

      return errorResponse(verification.reason || "Invalid OTP", 400);
    }

    // Clear OTP data on successful verification
    await Customer.findOneAndUpdate(
      { email },
      {
        $unset: { otp: "", otpExpiresAt: "", otpAttempts: "" },
        verified: true,
      }
    );

    return successResponse(null, "OTP verified successfully");
  } catch (error: unknown) {
    logger.error("Error verifying OTP", error);
    return errorResponse("Failed to verify OTP", 500);
  }
};
