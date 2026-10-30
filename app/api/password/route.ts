import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { Model } from "mongoose";
import { Customer } from "@/lib/models/users/Customer";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Staff } from "@/lib/models/users/Staff";
import { Admin } from "@/lib/models/users/Admin";
import { Client } from "@/lib/models/super-admin/Client";
import { errorResponse } from "@/lib/utils/api-response";
import { isStrongPassword } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { withOptionalTransaction } from "@/lib/utils/transaction-helper";
import { getSession, signUserToken, verifyResetToken } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/services/emailOtp";

const SALT_ROUNDS = 10;

// Role collections that also keep a copy of the password, by LoginUser.userType.
// "users" is an older spelling for company (Client) accounts; some are customers.
const ROLE_MODELS: Record<string, Model<any>[]> = {
  admin: [Admin as Model<any>],
  clients: [Client as Model<any>],
  users: [Client as Model<any>, Customer as Model<any>],
  staff: [Staff as Model<any>],
  customer: [Customer as Model<any>],
};

/**
 * POST /api/password { resetToken, password }
 * Sets a new password. `resetToken` comes from POST /api/auth/otp/verify, which
 * proves the caller owns the email. All existing sessions for the account are
 * signed out, and a fresh login token is returned.
 *
 * Partner apps (PARTNER_API_TOKEN) may still use { email, password, userType: "user" }
 * for customer accounts only.
 */
export async function POST(req: NextRequest) {
  try {
    await connect();
    const body = await req.json();
    const { password, resetToken } = body;

    // Who is allowed to set this password?
    let email = verifyResetToken(resetToken);
    let customerOnly = false;

    if (!email) {
      let isPartner = false;
      try {
        isPartner = (await getSession(req, ["partner"])).kind === "partner";
      } catch {
        isPartner = false;
      }
      if (!isPartner || !["user", "users", "customer"].includes(body.userType)) {
        return errorResponse(
          "Email verification required. Please verify the code sent to your email.",
          401
        );
      }
      email = normalizeEmail(body.email);
      customerOnly = true;
    }

    if (!email) {
      return errorResponse("Email is required", 400);
    }

    if (!password || !isStrongPassword(password)) {
      return errorResponse(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        400
      );
    }

    const loginUser = (await LoginUser.findOne({ email }).lean()) as any;
    if (!loginUser) {
      return errorResponse("User not found", 404);
    }

    let roleModels = ROLE_MODELS[loginUser.userType] ?? [];
    if (customerOnly) {
      // Partner path: never touch company, admin or staff accounts
      const [admin, client, staff] = await Promise.all([
        Admin.exists({ email }),
        Client.exists({ email }),
        Staff.exists({ email }),
      ]);
      if (admin || client || staff) {
        return errorResponse("Email verification required for this account", 401);
      }
      roleModels = [Customer as Model<any>];
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const updatedLoginUser = await withOptionalTransaction(async (session) => {
      const opts = session ? { new: true, session } : { new: true };

      for (const RoleModel of roleModels) {
        const updated = await RoleModel.findOneAndUpdate({ email }, { password: hashedPassword }, opts);
        if (updated) break;
      }

      // Bumping tokenVersion signs out every device that used the old password
      return LoginUser.findOneAndUpdate(
        { email },
        { password: hashedPassword, $inc: { tokenVersion: 1 } },
        opts
      ).lean();
    });

    if (!updatedLoginUser) {
      return errorResponse("User not found", 404);
    }

    const token = signUserToken(updatedLoginUser as any);
    const user = {
      id: (updatedLoginUser as any)._id,
      email: (updatedLoginUser as any).email,
      userType: (updatedLoginUser as any).userType,
    };

    logger.info("Password set", { email, userType: user.userType, via: customerOnly ? "partner" : "otp" });

    return NextResponse.json(
      {
        success: true,
        message: "Password updated successfully",
        data: { user },
        token, // root level, as the app expects
        user,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ Password API error:", error);
    logger.error("Error updating password", error);
    return errorResponse("Failed to update password", 500);
  }
}
