import { checkValidClient } from "@/lib/auth";
import connect from "@/lib/db";
import { FAQ } from "@/lib/models/homepage/FAQ";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    await connect();

    if (clientId) {
      const data = await FAQ.findOne({ clientId });
      if (!data) {
        return NextResponse.json(
          {
            success: false,
            message: "No FAQ data found for this client",
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
    }

    const data = await FAQ.find();
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No FAQ data found",
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
    console.error("Error fetching FAQ data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch FAQ data",
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
      !Array.isArray(body.FAQs) ||
      body.FAQs.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: clientId, subTitle, and FAQs array",
        },
        { status: 400 }
      );
    }

    if (
      body.FAQs.some(
        (faq: { title: string; description: string }) =>
          !faq.title?.trim() || !faq.description?.trim()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All FAQs must have a non-empty title and description",
        },
        { status: 400 }
      );
    }

    // Check if FAQ data already exists for this client
    const existingData = await FAQ.findOne({ clientId: body.clientId });
    if (existingData) {
      return NextResponse.json(
        {
          success: false,
          message: "FAQ data already exists for this client",
        },
        { status: 409 }
      );
    }

    const newFAQ = new FAQ(body);
    const savedFAQ = await newFAQ.save();

    return NextResponse.json(
      {
        success: true,
        message: "FAQ data created successfully",
        data: savedFAQ,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating FAQ data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create FAQ data",
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
    const deletedData = await FAQ.findByIdAndDelete(id);

    if (!deletedData) {
      return NextResponse.json(
        {
          success: false,
          message: "FAQ data not found or already deleted",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "FAQ data deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error deleting FAQ data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete FAQ data",
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
    if (
      !body.clientId ||
      !body.subTitle ||
      !Array.isArray(body.FAQs) ||
      body.FAQs.length === 0 ||
      body.FAQs.some(
        (faq: { title: string; description: string }) =>
          !faq.title?.trim() || !faq.description?.trim()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid data: clientId, subTitle, and non-empty FAQs with title and description are required",
        },
        { status: 400 }
      );
    }

    const updatedData = await FAQ.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedData) {
      return NextResponse.json(
        {
          success: false,
          message: "FAQ data not found or couldn't be updated",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "FAQ data updated successfully",
        data: updatedData,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating FAQ data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update FAQ data",
      },
      { status: 500 }
    );
  }
};
