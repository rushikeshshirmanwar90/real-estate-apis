import { checkValidClient } from "@/lib/auth";
import connect from "@/lib/db";
import { OurServices } from "@/lib/models/homepage/OurServices";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    // Get clientId from query params if provided
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    await connect();
    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          message: "clientId parameter is required",
        },
        { status: 400 }
      );
    }

    // Fetch data from the database
    const data = await OurServices.findOne({ clientId });

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No services data found",
        },
        { status: 404 }
      );
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
      console.error("Error fetching our services data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch services data",
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
      !body.clientId ||
      !body.subTitle ||
      !Array.isArray(body.services) ||
      body.services.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: clientId, subTitle, and services array",
        },
        { status: 400 }
      );
    }

    // Check if services data already exists for this client
    const existingData = await OurServices.findOne({ clientId: body.clientId });
    if (existingData) {
      return NextResponse.json(
        {
          success: false,
          message: "Services data already exists for this client",
        },
        { status: 409 }
      );
    }

    const newOurServices = new OurServices(body);
    const savedOurServices = await newOurServices.save();

    return NextResponse.json(
      {
        success: true,
        message: "Services data created successfully",
        data: savedOurServices,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating our services data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create services data",
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
    const deletedData = await OurServices.findByIdAndDelete(id);

    if (!deletedData) {
      return NextResponse.json(
        {
          success: false,
          message: "Services data not found or already deleted",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Services data deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting our services data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete services data",
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

    const updatedData = await OurServices.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true, // Run schema validators on update
    });

    if (!updatedData) {
      return NextResponse.json(
        {
          success: false,
          message: "Services data not found or couldn't be updated",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Services data updated successfully",
        data: updatedData,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error updating our services data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update services data",
      },
      { status: 500 }
    );
  }
};
