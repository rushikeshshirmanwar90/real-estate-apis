import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/utils/otp";
import { OTP } from "@/lib/models/OTP";
import { Staff } from "@/lib/models/users/Staff";
import { Types } from "mongoose";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();
    const body = await req.json();

    if (!body.email || !body.otp) {
      return NextResponse.json(
        { 
          success: false,
          message: "Email and OTP are required." 
        },
        { status: 400 }
      );
    }

    const { email, otp, staffId } = body;
    const emailKey = email.toLowerCase();

    console.log('🔐 Verifying OTP for:', emailKey);
    console.log('🔢 OTP provided:', otp);

    // Get stored OTP data from database
    const storedOTP = await OTP.findOne({ email: emailKey });
    
    if (!storedOTP) {
      console.log('❌ No OTP found for email:', emailKey);
      return NextResponse.json(
        { 
          success: false,
          message: "No OTP found for this email. Please request a new one." 
        },
        { status: 400 }
      );
    }

    // Increment attempts in database
    storedOTP.attempts += 1;
    await storedOTP.save();

    // Verify OTP
    const verificationResult = verifyOTP(
      otp, 
      storedOTP.hash, 
      storedOTP.expiresAt.getTime(), 
      storedOTP.attempts
    );

    if (!verificationResult.valid) {
      console.log('❌ OTP verification failed:', verificationResult.reason);
      
      // Remove OTP if max attempts exceeded
      if (storedOTP.attempts >= 5) {
        await OTP.deleteOne({ email: emailKey });
      }
      
      return NextResponse.json(
        { 
          success: false,
          message: verificationResult.reason || "Invalid or expired OTP." 
        },
        { status: 400 }
      );
    }

    // OTP is valid, remove it from database
    await OTP.deleteOne({ email: emailKey });
    console.log('✅ OTP verified successfully for:', emailKey);

    // Update staff member's email verification status if staffId is provided
    if (staffId && Types.ObjectId.isValid(staffId)) {
      try {
        await Staff.findByIdAndUpdate(
          staffId,
          { 
            emailVerified: true,
            emailVerifiedAt: new Date()
          },
          { new: true }
        );
        console.log('✅ Staff email verification status updated:', staffId);
      } catch (updateError) {
        console.error('❌ Error updating staff verification status:', updateError);
        // Don't fail the OTP verification if staff update fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully!",
        data: {
          email: emailKey,
          verifiedAt: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Failed to verify OTP.", 
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};