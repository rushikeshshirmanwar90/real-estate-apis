import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { Customer } from "@/lib/models/users/Customer";
import { Client } from "@/lib/models/super-admin/Client";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Staff } from "@/lib/models/users/Staff";
import { Admin } from "@/lib/models/users/Admin";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const { email, userType } = await req.json();

    console.log('🔐 FORGET PASSWORD API CALLED');
    console.log('📧 Email:', email);
    console.log('👤 User Type:', userType);

    let updatedPassword: any = null;

    // ✅ Handle all user types including admin
    if (userType === "admin") {
      console.log('🔧 Processing admin user...');
      updatedPassword = await Admin.findOneAndUpdate(
        { email },
        { password: "" },
        { new: true }
      );
      await LoginUser.findOneAndUpdate({ email }, { password: "" });
    } else if (userType === "client") {
      console.log('🔧 Processing client user...');
      updatedPassword = await Client.findOneAndUpdate(
        { email },
        { password: "" },
        { new: true }
      );
      await LoginUser.findOneAndUpdate({ email }, { password: "" });
    } else if (userType === "user" || userType === "users") {
      // ✅ Handle both "user" and "users" for compatibility
      console.log('🔧 Processing customer user...');
      updatedPassword = await Customer.findOneAndUpdate(
        { email },
        { password: "" },
        { new: true }
      );
      await LoginUser.findOneAndUpdate({ email }, { password: "" });
    } else if (userType === "staff") {
      console.log('🔧 Processing staff user...');
      updatedPassword = await Staff.findOneAndUpdate(
        { email },
        { password: "" },
        { new: true }
      );
      await LoginUser.findOneAndUpdate({ email }, { password: "" });
    } else {
      console.log('❌ Unknown user type:', userType);
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported user type: ${userType}`,
          message: "Invalid user type provided"
        },
        { status: 400 }
      );
    }

    console.log('🔍 Update result:', updatedPassword ? 'Success' : 'Failed');

    if (!updatedPassword) {
      console.log('❌ User not found or update failed');
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          message: "No user found with this email address"
        },
        { status: 404 }
      );
    }

    console.log('✅ Password reset successful');
    return NextResponse.json(
      {
        success: true,
        message: "Password reset successfully. You can now set a new password."
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('❌ Forget password error:', error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to reset password. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
