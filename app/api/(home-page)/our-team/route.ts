import { checkValidClient } from "@/lib/auth";
import connect from "@/lib/db";
import { OurTeam } from "@/lib/models/homepage/OurTeam";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    // Get clientId from query params if provided
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    await connect();

    // If clientId is provided, filter by it
    const query = clientId ? { clientId } : {};
    const data = await OurTeam.find(query);

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No team data found",
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
      console.error("Error fetching our team data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch team data",
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
      !Array.isArray(body.teamMembers) ||
      body.teamMembers.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: clientId, subTitle, and teamMembers array",
        },
        { status: 400 }
      );
    }

    // Check if team data already exists for this client
    const existingData = await OurTeam.findOne({ clientId: body.clientId });
    if (existingData) {
      return NextResponse.json(
        {
          success: false,
          message: "Team data already exists for this client",
        },
        { status: 409 }
      );
    }

    const newOurTeam = new OurTeam(body);
    const savedOurTeam = await newOurTeam.save();

    return NextResponse.json(
      {
        success: true,
        message: "Team data created successfully",
        data: savedOurTeam,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating our team data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create team data",
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
    const deletedData = await OurTeam.findByIdAndDelete(id);

    if (!deletedData) {
      return NextResponse.json(
        {
          success: false,
          message: "Team data not found or already deleted",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Team data deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting our team data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete team data",
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

    const updatedData = await OurTeam.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true, // Run schema validators on update
    });

    if (!updatedData) {
      return NextResponse.json(
        {
          success: false,
          message: "Team data not found or couldn't be updated",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Team data updated successfully",
        data: updatedData,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error updating our team data:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update team data",
      },
      { status: 500 }
    );
  }
};
