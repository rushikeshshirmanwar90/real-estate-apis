import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { sendEmailOtp } from "@/lib/services/emailOtp";

// POST /api/auth/otp/send { email }
// No auth: used before sign-in. Emails a 6-digit code to an existing account.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const result = await sendEmailOtp(email);
    if (!result.ok) return errorResponse(result.message, result.status);
    return successResponse({ expiresIn: "10 minutes" }, "Code sent to your email");
  } catch (error) {
    console.error("❌ OTP send error:", error);
    return errorResponse("Failed to send the code", 500);
  }
}
