import bcrypt from "bcrypt";
import connect from "@/lib/db";
import { Broker } from "@/lib/models/Brokers";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    await connect();

    if (id) {
      const broker = await Broker.findById(id);
      if (!broker) {
        return NextResponse.json(
          {
            message: "broker not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(broker);
    }

    const brokers = await Broker.find();

    if (!brokers) {
      return NextResponse.json(
        {
          message: "no brokers found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(brokers);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      {
        message: "error fetching brokers",
        error: error,
      },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest | Request) => {
  try {
    const body = await req.json();
    const SALT_ID = process.env.SALT_ID!;

    await connect();

    if (body.password) {
      body.password = await bcrypt.hash(body.password, SALT_ID);
    }

    const broker = new Broker(body);
    await broker.save();

    if (!broker) {
      return NextResponse.json(
        {
          message: "broker not created",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "broker created successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        message: "can't able to add the broker",
        error: error,
      },
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    // Explicitly filter out sensitive fields
    const sensitiveFields = ["email", "phoneNumber", "password"];
    const filteredBody = Object.fromEntries(
      Object.entries(body).filter(([key]) => !sensitiveFields.includes(key))
    );

    const updatedBroker = await Broker.findByIdAndUpdate(id, filteredBody, {
      new: true,
    });

    if (!updatedBroker) {
      return NextResponse.json(
        {
          message: "broker not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      message: "brokers data updated successfully",
      updatedData: updatedBroker,
    });
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        message: "can't able to update the brokers details",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};

export const DELETE = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");

    await connect();

    const deletedBroker = await Broker.findByIdAndDelete(id);

    if (!deletedBroker) {
      return NextResponse.json(
        {
          message: "broker not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "broker deleted successfully",
        deletedData: deletedBroker,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      {
        message: "can't able to delete the broker",
        error: error,
      },
      { status: 500 }
    );
  }
};
