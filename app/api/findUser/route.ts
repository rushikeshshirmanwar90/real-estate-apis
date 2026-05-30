import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";

// POST /api/findUser - Check if user exists (NO AUTH REQUIRED - used during login flow)
export async function POST(req: NextRequest) {
  try {
    await connect();
    const body = await req.json();
    const { email } = body;

    console.log("🔍 Finding user with email:", email);

    const isUser = await LoginUser.findOne({ email }).select("+password");

    // ✅ FIX: Check if user exists first
    if (!isUser) {
      console.log("❌ User not found with email:", email);
      return NextResponse.json(
        {
          message: "User not found with this email address",
        },
        { status: 404 }
      );
    }

    console.log("✅ User found:", { email: isUser.email, userType: isUser.userType, hasPassword: !!isUser.password });

    // Check if user has password set (verified)
    if (
      isUser.password == "" ||
      isUser.password == null ||
      isUser.password == undefined
    ) {
      // User exists but password not set - needs verification
      console.log("⚠️ User exists but password not set - needs verification");
      return NextResponse.json(
        {
          isUser,
        },
        { status: 201 }
      );
    }

    // User exists and has password - verified user
    console.log("✅ User exists and has password - verified user");
    return NextResponse.json(
      {
        isUser,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ Error in findUser:", error);
    return NextResponse.json(
      {
        message: "Can't able to find the user, something went wrong, please try again",
        error: error,
      },
      { status: 500 }
    );
  }
}
