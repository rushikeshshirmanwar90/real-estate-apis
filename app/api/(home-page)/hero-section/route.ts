import { HeroSection } from "@/lib/models/homepage/HeroSection";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db"; // Assuming you have a database connection utility
import { checkValidClient } from "@/lib/auth";

/**
 * GET request handler to fetch hero section by clientId
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

    // Find hero section by clientId
    const heroSection = await HeroSection.findOne({ clientId });

    if (!heroSection) {
      return NextResponse.json(
        { message: "Hero section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Hero section fetched successfully", data: heroSection },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "Error fetching hero section:",
      error instanceof Error ? error.message : "Unknown error"
    );
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  }
};

/**
 * POST request handler to create a new hero section
 */
export const POST = async (req: NextRequest) => {
  await checkValidClient(req);

  try {
    // Connect to database
    await connectToDatabase();

    // Parse request body
    const body = await req.json();
    const { clientId, details } = body;

    // Validate required fields
    if (!clientId || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json(
        { message: "Client ID and at least one details item are required" },
        { status: 400 }
      );
    }

    // Validate each details item
    for (const item of details) {
      const { title, description, image, buttonText, buttonLink } = item;
      if (!title || !description || !image || !buttonText || !buttonLink) {
        return NextResponse.json(
          { message: "All fields in details are required" },
          { status: 400 }
        );
      }
    }

    // Check if hero section already exists for this client
    const existingHeroSection = await HeroSection.findOne({ clientId });
    if (existingHeroSection) {
      return NextResponse.json(
        { message: "Hero section already exists for this client" },
        { status: 409 }
      );
    }

    // Create new hero section
    const newHeroSection = new HeroSection({
      clientId,
      details,
    });

    // Save to database
    await newHeroSection.save();

    return NextResponse.json(
      { message: "Hero section created successfully", data: newHeroSection },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "Error creating hero section:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

/**
 * PUT request handler to update an existing hero section
 */
export const PUT = async (req: NextRequest) => {
  await checkValidClient(req);
  try {
    // Connect to database
    await connectToDatabase();

    // Parse request body
    const body = await req.json();
    const { clientId, details } = body;

    // Validate required fields
    if (!clientId || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json(
        { message: "Client ID and at least one details item are required" },
        { status: 400 }
      );
    }

    // Validate each details item
    for (const item of details) {
      const { title, description, image, buttonText, buttonLink } = item;
      if (!title || !description || !image || !buttonText || !buttonLink) {
        return NextResponse.json(
          { message: "All fields in details are required" },
          { status: 400 }
        );
      }
    }

    // Find and update hero section
    const updatedHeroSection = await HeroSection.findOneAndUpdate(
      { clientId },
      { details },
      { new: true, runValidators: true }
    );

    if (!updatedHeroSection) {
      return NextResponse.json(
        { message: "Hero section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Hero section updated successfully",
        data: updatedHeroSection,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "Error updating hero section:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

/**
 * PATCH request handler to update specific details in a hero section
 */
export const PATCH = async (req: NextRequest) => {
  await checkValidClient(req);

  try {
    // Connect to database
    await connectToDatabase();

    // Parse request body
    const body = await req.json();
    const { clientId, detailsId, updates } = body;

    // Validate required fields
    if (
      !clientId ||
      !detailsId ||
      !updates ||
      Object.keys(updates).length === 0
    ) {
      return NextResponse.json(
        { message: "Client ID, details ID and updates are required" },
        { status: 400 }
      );
    }

    // Find hero section
    const heroSection = await HeroSection.findOne({ clientId });

    if (!heroSection) {
      return NextResponse.json(
        { message: "Hero section not found" },
        { status: 404 }
      );
    }

    // Find the specific details item to update
    const detailsIndex = heroSection.details.findIndex(
      (item: { _id: string }) => item._id.toString() === detailsId
    );

    if (detailsIndex === -1) {
      return NextResponse.json(
        { message: "Details item not found" },
        { status: 404 }
      );
    }

    // Update the specific fields
    Object.keys(updates).forEach((key) => {
      if (
        ["title", "description", "image", "buttonText", "buttonLink"].includes(
          key
        )
      ) {
        heroSection.details[detailsIndex][key] = updates[key];
      }
    });

    // Save the updated hero section
    await heroSection.save();

    return NextResponse.json(
      {
        message: "Hero section details updated successfully",
        data: heroSection,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "Error updating hero section details:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

/**
 * DELETE request handler to delete a hero section
 */
export const DELETE = async (req: NextRequest) => {
  await checkValidClient(req);

  try {
    // Connect to database
    await connectToDatabase();

    // Get clientId from query parameters
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const detailsId = searchParams.get("detailsId");

    if (!clientId) {
      return NextResponse.json(
        { message: "Client ID is required" },
        { status: 400 }
      );
    }

    // If detailsId is provided, delete only that specific details item
    if (detailsId) {
      const heroSection = await HeroSection.findOne({ clientId });

      if (!heroSection) {
        return NextResponse.json(
          { message: "Hero section not found" },
          { status: 404 }
        );
      }

      // Filter out the details item to delete
      const initialLength = heroSection.details.length;
      heroSection.details = heroSection.details.filter(
        (item: { _id: string }) => item._id.toString() !== detailsId
      );

      // Check if any item was removed
      if (heroSection.details.length === initialLength) {
        return NextResponse.json(
          { message: "Details item not found" },
          { status: 404 }
        );
      }

      // If no details remain, delete the entire hero section
      if (heroSection.details.length === 0) {
        await HeroSection.deleteOne({ clientId });
        return NextResponse.json(
          { message: "Hero section deleted successfully" },
          { status: 200 }
        );
      }

      // Save the updated hero section
      await heroSection.save();

      return NextResponse.json(
        {
          message: "Hero section details item deleted successfully",
          data: heroSection,
        },
        { status: 200 }
      );
    }

    // Delete the entire hero section
    const result = await HeroSection.deleteOne({ clientId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Hero section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Hero section deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "Error deleting hero section:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
};
