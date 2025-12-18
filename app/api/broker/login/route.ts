import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import connect from "@/lib/db";
import { Broker } from "@/lib/models/Brokers";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const POST = async (req: NextRequest | Request) => {
  try {

    const { email, password, phoneNumber } = await req.json();
    const cookiesStore = await cookies();
    const COOKIE_NAME = "broker_auth_token";
    const JWT_SECRET = process.env.JWT_SECRET!;

    await connect();

    const findUser = await Broker.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (!findUser) {
      return NextResponse.json(
        { message: "invalid emailId or phoneNumber" },
        { status: 404 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, findUser.password);

    if (!isValidPassword) {
      return NextResponse.json(
        {
          message: "invalid password",
        },
        { status: 401 }
      );
    }

    const emailId = findUser.email;
    const brokerId = findUser._id;

    const payload = { emailId, brokerId };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1000d" });

    cookiesStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 1000,
    });

    return NextResponse.json(
      { message: "user login successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        message: "can't able to login",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};