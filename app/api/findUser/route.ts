import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";

// POST /api/findUser - Check if an account exists and whether its password is set.
// No auth: used before sign-in. Returns only the account type, never the record.
//   200 → account exists with a password (sign in with password)
//   201 → account exists without a password (verify email with OTP first)
//   404 → no account
export async function POST(req: NextRequest) {
  try {
    await connect();
    const body = await req.json();
    // Stored emails are lowercase; normalize so "Name@Gmail.com " still matches
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const loginUser = (await LoginUser.findOne({ email }).select("+password userType").lean()) as any;

    if (!loginUser) {
      return NextResponse.json(
        { message: "User not found with this email address" },
        { status: 404 }
      );
    }

    const hasPassword = typeof loginUser.password === "string" && loginUser.password !== "";

    return NextResponse.json(
      {
        isUser: { userType: loginUser.userType },
        hasPassword,
      },
      { status: hasPassword ? 200 : 201 }
    );
  } catch (error: unknown) {
    console.error("❌ Error in findUser:", error);
    return NextResponse.json(
      { message: "Can't able to find the user, something went wrong, please try again" },
      { status: 500 }
    );
  }
}
