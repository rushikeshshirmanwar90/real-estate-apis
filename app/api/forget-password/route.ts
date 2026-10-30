import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { Customer } from "@/lib/models/users/Customer";
import { Client } from "@/lib/models/super-admin/Client";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Staff } from "@/lib/models/users/Staff";
import { Admin } from "@/lib/models/users/Admin";
import { getSession } from "@/lib/auth/session";
import { normalizeEmail, sendEmailOtp } from "@/lib/services/emailOtp";

/**
 * POST /api/forget-password { email }
 * Starts a password reset by emailing a code. The current password keeps
 * working until the user verifies the code and sets a new one
 * (POST /api/auth/otp/verify → POST /api/password).
 *
 * Partner apps calling with userType "user" keep the old behaviour for
 * customer accounts (password cleared so their own flow can set a new one).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);

    if (["user", "users", "customer"].includes(body.userType)) {
      let isPartner = false;
      try {
        isPartner = (await getSession(req, ["partner"])).kind === "partner";
      } catch {
        isPartner = false;
      }
      if (isPartner) {
        return legacyCustomerReset(email);
      }
    }

    const result = await sendEmailOtp(email);
    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json(
      { success: true, message: "We sent a code to your email. Enter it to set a new password." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ Forget password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to start password reset. Please try again." },
      { status: 500 }
    );
  }
}

// Customer accounts only — never admin, company or staff accounts.
async function legacyCustomerReset(email: string) {
  await connect();
  const [admin, client, staff] = await Promise.all([
    Admin.exists({ email }),
    Client.exists({ email }),
    Staff.exists({ email }),
  ]);
  if (!email || admin || client || staff) {
    return NextResponse.json({ success: false, message: "No customer found with this email" }, { status: 404 });
  }

  const customer = await Customer.findOneAndUpdate({ email }, { password: "" }, { new: true });
  if (!customer) {
    return NextResponse.json({ success: false, message: "No user found with this email address" }, { status: 404 });
  }
  await LoginUser.findOneAndUpdate({ email }, { password: "", $inc: { tokenVersion: 1 } });

  return NextResponse.json(
    { success: true, message: "Password reset successfully. Please verify with OTP to set a new password." },
    { status: 200 }
  );
}
