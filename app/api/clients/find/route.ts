import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        {
          message: "Email is required",
        },
        {
          status: 400,
        }
      );
    }

    const isClient = await Client.findOne({ email });

    if (!isClient) {
      return NextResponse.json(
        {
          message: "User not registered",
        },
        {
          status: 404,
        }
      );
    }

    if (
      isClient.password == "" ||
      isClient.password == null ||
      isClient.password == undefined
    ) {
      return NextResponse.json(
        {
          isClient,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        isClient,
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
