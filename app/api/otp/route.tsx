import { NextRequest } from "next/server";
import { render } from "@react-email/components";
import { transporter } from "@/lib/transporter";
import { EmailTemplate } from "@/components/mail/EmailTemplate";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidEmail } from "@/lib/utils/validation";

import { logger } from "@/lib/utils/logger";
import { withBearerAuth } from "@/lib/middleware/bearer-auth";

/**
 * Send OTP Email Endpoint
 * Accepts custom OTP from client and sends it via email
 * Does NOT store OTP in database - verification happens on client side
 * NO AUTH REQUIRED - used during registration/login process
 */
export async function POST(req: NextRequest) {
  try {


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

    console.log("📧 Sending OTP email...");
    console.log("   Email:", email);
    console.log("   OTP:", OTP);

    // Render email template
    const emailHtml = await render(
      EmailTemplate({ verificationCode: OTP })
    );

    // Send email
    try {
      const info = await transporter.sendMail({
        from: `"Exponentor" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your Email Verification Code",
        html: emailHtml,
      });

      console.log("✅ OTP email sent successfully");
      console.log("   Message ID:", info.messageId);

      logger.info("OTP email sent successfully", {
        email,
        messageId: info.messageId,
      });

      // ✅ Just return success - no database storage
      return successResponse(
        {
          messageId: info.messageId,
          expiresIn: "10 minutes",
        },
        "OTP sent successfully"
      );
    } catch (emailError) {
      console.error("❌ Error sending OTP email:", emailError);
      logger.error("Error sending OTP email", emailError);
      return errorResponse(
        "Failed to send OTP email. Please check your email address.",
        500
      );
    }
  } catch (error: unknown) {
    console.error("❌ Error in OTP endpoint:", error);
    logger.error("Error in OTP endpoint", error);
    return errorResponse("Failed to send OTP", 500);
  }
}
