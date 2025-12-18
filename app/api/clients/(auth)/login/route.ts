import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";

import { Client } from "@/lib/models/super-admin/Client";
import connect from "@/lib/db";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const cookieStore = await cookies();

    const JWT_SECRET = process.env.JWT_SECRET!;
    const COOKIE_NAME = "client_auth_token";

    const { email, password } = await req.json();

    // Check if email exists
    const user = await Client.findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          message: "Given emailId not found..!",
        },
        {
          status: 401, // Unauthorized
        }
      );
    }

    // Compare the password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        {
          message: "Invalid Password",
        },
        {
          status: 401, // Unauthorized
        }
      );
    }

    const userId = user._id;
    const payload = { email, userId };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "1000d",
    });

    cookieStore.set(COOKIE_NAME, token, {
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 1000,
    });

    return NextResponse.json(
      {
        message: "Login successful..!",
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        message: "Can't log in: " + error,
      },
      {
        status: 500,
      }
    );
  }
};
