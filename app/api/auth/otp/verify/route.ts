import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { verifyEmailOtp } from "@/lib/services/emailOtp";

// POST /api/auth/otp/verify { email, otp }
// No auth: used before sign-in. On a correct code returns { resetToken },
// which /api/password needs to set a new password (valid 15 minutes).
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    const result = await verifyEmailOtp(email, otp);
    if (!result.ok) return errorResponse(result.message, result.status);
    return successResponse({ resetToken: result.resetToken }, "Code verified");
  } catch (error) {
    console.error("❌ OTP verify error:", error);
    return errorResponse("Failed to verify the code", 500);
  }
}
