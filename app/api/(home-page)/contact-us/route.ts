import { checkValidClient } from "@/lib/auth";
import connect from "@/lib/db";
import { ContactUs } from "@/lib/models/homepage/ContactUs";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  await checkValidClient(req);

  try {
    // Get clientId from query params if provided
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    await connect();

    // If ID is provided, get specific contact info, otherwise get all
    let data;
    if (id) {
      data = await ContactUs.findById(id);
      if (!data) {
        return NextResponse.json(
          {
            success: false,
            message: "Contact data not found",
          },
          { status: 404 }
        );
      }
    } else {
      data = await ContactUs.find();
      if (!data || data.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "No contact data found",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching contact data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch contact data",
      },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  await checkValidClient(req);
  try {
    await connect();
    const body = await req.json();

    // Basic validation
    if (
      !body.subTitle ||
      !body.address ||
      !body.phone1 ||
      !body.email1 ||
      !body.mapLink
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: subTitle, address, phone1, email1, mapLink",
        },
        { status: 400 }
      );
    }

    // Check if any contact data already exists
    const count = await ContactUs.countDocuments();
    if (count > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Contact data already exists. Use PUT to update existing data.",
        },
        { status: 409 }
      );
    }

    const newContactUs = new ContactUs(body);
    const savedContactUs = await newContactUs.save();

    return NextResponse.json(
      {
        success: true,
        message: "Contact data created successfully",
        data: savedContactUs,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating contact data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create contact data",
      },
      { status: 500 }
    );
  }
};

export const DELETE = async (req: NextRequest) => {
  await checkValidClient(req);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID parameter is required",
        },
        { status: 400 }
      );
    }

    await connect();
    const deletedData = await ContactUs.findByIdAndDelete(id);

    if (!deletedData) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact data not found or already deleted",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Contact data deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting contact data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete contact data",
      },
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest) => {
  await checkValidClient(req);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID parameter is required",
        },
        { status: 400 }
      );
    }

    await connect();
    const body = await req.json();

    // Basic validation
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No update data provided",
        },
        { status: 400 }
      );
    }

    const updatedData = await ContactUs.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true, // Run schema validators on update
    });

    if (!updatedData) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact data not found or couldn't be updated",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Contact data updated successfully",
        data: updatedData,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error updating contact data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update contact data",
      },
      { status: 500 }
    );
  }
};
