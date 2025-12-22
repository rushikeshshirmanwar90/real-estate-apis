import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { generateOTP, createOTPData } from "@/lib/utils/otp";
import { OTP } from "@/lib/models/OTP";
import { render } from '@react-email/components';
import { transporter } from "@/lib/transporter";
import { OTPTemplate } from "@/components/mail/OTPTemplate";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();
    const body = await req.json();

    if (!body.email) {
      return NextResponse.json(
        { 
          success: false,
          message: "Email is required." 
        },
        { status: 400 }
      );
    }

    const { email, staffName, companyName } = body;

    // Generate 6-digit OTP
    const otp = generateOTP();
    console.log('🔢 Generated OTP for', email, ':', otp);
    
    // Store OTP in database
    const otpData = createOTPData(otp);
    
    // Remove any existing OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase() });
    
    // Create new OTP record
    await OTP.create({
      email: email.toLowerCase(),
      hash: otpData.hash,
      expiresAt: new Date(otpData.expiresAt),
      attempts: 0
    });
    
    console.log('💾 Stored OTP in database for:', email.toLowerCase());

    // Render email template
    const emailHtml = await render(
      OTPTemplate({ 
        staffName: staffName || 'User', 
        companyName: companyName || 'Company', 
        otp: otp
      })
    );

    // Send email using the OTP template
    const info = await transporter.sendMail({
      from: `"${companyName || 'Company'}" <noreply@company.com>`,
      to: email,
      subject: `Email Verification Code - ${companyName || 'Company'}`,
      html: emailHtml,
    });

    console.log('✅ OTP email sent successfully:', {
      email,
      messageId: info.messageId,
      accepted: info.accepted,
      otp: otp // Include OTP in response for testing (remove in production)
    });

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully!",
        otp: otp, // Include for testing (remove in production)
        info: {
          messageId: info.messageId,
          accepted: info.accepted
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("OTP email sending error:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Failed to send OTP email.", 
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};