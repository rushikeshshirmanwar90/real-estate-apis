import { EmailTemplate } from "@/components/mail/EmailTemplate";
import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { render } from "@react-email/components";
import { transporter } from "@/lib/transporter";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidEmail } from "@/lib/utils/validation";
import { rateLimit } from "@/lib/utils/rate-limiter";
import { logger } from "@/lib/utils/logger";

/**
 * Send Custom OTP Endpoint
 * Used by mobile app to send a pre-generated OTP via email
 */
export const POST = async (req: NextRequest) => {
  try {
    // Rate limiting: 5 OTP requests per 5 minutes
    const rateLimitResult = rateLimit(req, {
      maxRequests: 5,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Too many OTP requests. Please try again later.",
        429
      );
    }

    await connect();

    const body = await req.json();
    const { email, OTP } = body;

    // Validate email
    if (!email) {
      return errorResponse("Email is required", 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Validate OTP
    if (!OTP) {
      return errorResponse("OTP is required", 400);
    }

    if (typeof OTP !== "number" || OTP < 100000 || OTP > 999999) {
      return errorResponse("OTP must be a 6-digit number", 400);
    }

    // Render email template
    const emailHtml = await render(EmailTemplate({ verificationCode: OTP }));

    // Send email
    try {
      const info = await transporter.sendMail({
        from: `"Exponentor" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your Email Verification Code",
        html: emailHtml,
      });

      logger.info("OTP email sent successfully", {
        email,
        messageId: info.messageId,
      });

      return successResponse(
        {
          messageId: info.messageId,
          expiresIn: "10 minutes",
        },
        "OTP sent successfully"
      );
    } catch (emailError) {
      logger.error("Error sending OTP email", emailError);
      return errorResponse(
        "Failed to send OTP email. Please check your email address.",
        500
      );
    }
  } catch (error: unknown) {
    logger.error("Error in send-custom-otp endpoint", error);
    return errorResponse("Failed to send OTP", 500);
  }
};
