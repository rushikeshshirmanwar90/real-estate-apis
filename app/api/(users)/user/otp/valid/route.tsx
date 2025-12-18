import connect from "@/lib/db";
import { Customer } from "@/lib/models/users/Customer";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const { email, otp } = await req.json();

    if (!email || otp === undefined) {
      return NextResponse.json(
        {
          message: "Email and OTP are required",
        },
        { status: 400 }
      );
    }

    const user = await Customer.findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          message: "user not found with this mail",
        },
        { status: 401 }
      );
    }

    const userOtp = user.otp;

    if (userOtp != otp) {
      return NextResponse.json(
        {
          message: "invalid OTP",
        },
        { status: 404 }
      );
    }

    const updateOtp = await Customer.findOneAndUpdate({ email }, { otp: 0 });

    if (!updateOtp) {
      return NextResponse.json(
        { message: "can't able to update otp" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "otp is valid",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message: "Failed to verify OTP",
        error: error,
      },
      { status: 500 }
    );
  }
};
