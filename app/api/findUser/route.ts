import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const body = await req.json();
    const { email } = body;

    const isUser = await LoginUser.findOne({ email });

    // ✅ FIX: Check if user exists first
    if (!isUser) {
      return NextResponse.json(
        {
          message: "User not found with this email address",
        },
        { status: 404 }
      );
    }

    // Check if user has password set (verified)
    if (
      isUser.password == "" ||
      isUser.password == null ||
      isUser.password == undefined
    ) {
      // User exists but password not set - needs verification
      return NextResponse.json(
        {
          isUser,
        },
        { status: 201 }
      );
    }

    // User exists and has password - verified user
    return NextResponse.json(
      {
        isUser,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        message:
          "Can't able to find the user, something went wrong, please try again",
        error: error,
      },
      { status: 500 }
    );
  }
};
