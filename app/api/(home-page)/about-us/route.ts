import { AboutUs } from "@/lib/models/homepage/AboutUs";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { checkValidClient } from "@/lib/auth";

/**
 * GET request handler to fetch about us section by clientId
 */
export const GET = async (req: NextRequest) => {
  try {
    // Connect to database
    await connectToDatabase();

    // Get clientId from query parameters
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { message: "Client ID is required" },
        { status: 400 }
      );
    }

    // Find about us section by clientId
    const aboutUs = await AboutUs.findOne({ clientId });

    if (!aboutUs) {
      return NextResponse.json(
        { message: "About us section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "About us section fetched successfully", data: aboutUs },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "Error fetching about us section:",
      error instanceof Error ? error.message : "Unknown error"
    );
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

/**
 * POST request handler to create a new about us section
 */
export const POST = async (req: NextRequest) => {
  await checkValidClient(req);

  try {
    // Connect to database
    await connectToDatabase();

    // Parse request body
    const body = await req.json();
    const { clientId, subTitle, description, image, points } = body;

    // Validate required fields
    if (
      !clientId ||
      !subTitle ||
      !description ||
      !image ||
      !Array.isArray(points) ||
      points.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            "All fields are required (clientId, subTitle, description, image, points)",
        },
        { status: 400 }
      );
    }

    // Validate each point item
    for (const point of points) {
      const { title, description } = point;
      if (!title || !description) {
        return NextResponse.json(
          { message: "All fields in points are required (title, description)" },
          { status: 400 }
        );
      }
    }

    // Check if about us section already exists for this client
    const existingAboutUs = await AboutUs.findOne({ clientId });
    if (existingAboutUs) {
      return NextResponse.json(
        { message: "About us section already exists for this client" },
        { status: 409 }
      );
    }

    // Create new about us section
    const newAboutUs = new AboutUs({
      clientId,
      subTitle,
      description,
      image,
      points,
    });

    // Save to database
    await newAboutUs.save();

    return NextResponse.json(
      { message: "About us section created successfully", data: newAboutUs },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "Error creating about us section:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

/**
 * PUT request handler to update an existing about us section
 */
export const PUT = async (req: NextRequest) => {
  await checkValidClient(req);
  try {
    // Connect to database
    await connectToDatabase();

    // Parse request body
    const body = await req.json();
    const { clientId, subTitle, description, image, points } = body;

    // Validate required fields
    if (
      !clientId ||
      !subTitle ||
      !description ||
      !image ||
      !Array.isArray(points) ||
      points.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            "All fields are required (clientId, subTitle, description, image, points)",
        },
        { status: 400 }
      );
    }

    // Validate each point item
    for (const point of points) {
      const { title, description } = point;
      if (!title || !description) {
        return NextResponse.json(
          { message: "All fields in points are required (title, description)" },
          { status: 400 }
        );
      }
    }

    // Find and update about us section
    const updatedAboutUs = await AboutUs.findOneAndUpdate(
      { clientId },
      { subTitle, description, image, points },
      { new: true, runValidators: true }
    );

    if (!updatedAboutUs) {
      // If not found, create a new one
      const newAboutUs = new AboutUs({
        clientId,
        subTitle,
        description,
        image,
        points,
      });

      await newAboutUs.save();

      return NextResponse.json(
        { message: "About us section created successfully", data: newAboutUs },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        message: "About us section updated successfully",
        data: updatedAboutUs,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "Error updating about us section:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

/**
 * DELETE request handler to delete an about us section
 */
export const DELETE = async (req: NextRequest) => {
  await checkValidClient(req);
  try {
    // Connect to database
    await connectToDatabase();

    // Get clientId from query parameters
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { message: "Client ID is required" },
        { status: 400 }
      );
    }

    // Delete the about us section
    const result = await AboutUs.deleteOne({ clientId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "About us section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "About us section deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "Error deleting about us section:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
};
