import connect from "@/lib/db";
import { Updates } from "@/lib/models/updates";
import { NextRequest, NextResponse } from "next/server";

// GET updates with filtering
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    const sectionId = searchParams.get("sectionId");
    const flatId = searchParams.get("flatId");
    const type = searchParams.get("type");

    await connect();

    // Get single update by ID
    if (id) {
      const update = await Updates.findById(id);
      if (!update) {
        return NextResponse.json(
          { message: "Update not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(update);
    }

    // Build query filters
    const query: Record<string, string | undefined> = {};

    // Required: projectId must be provided for listing
    if (!projectId) {
      return NextResponse.json(
        { message: "projectId is required for listing updates" },
        { status: 400 }
      );
    }

    query.projectId = projectId;

    // Filter by section type if provided
    if (type) {
      query["Section.type"] = type;
    }

    // Filter by sectionId if provided
    if (sectionId) {
      query["Section.sectionId"] = sectionId;
    }

    // Filter by flatId if provided (only for building type)
    if (flatId) {
      query["Flat.flatId"] = flatId;
    }

    // Get all updates matching the query, sorted by date (newest first)
    const updates = await Updates.find(query).sort({ date: -1 });

    // Group updates by section for building type
    if (type === "building" && !sectionId && !flatId) {
      const groupedUpdates = updates.reduce((acc, update) => {
        const section = update.Section.sectionId;
        if (!acc[section]) {
          acc[section] = {
            sectionId: update.Section.sectionId,
            sectionName: update.Section.name || "Unnamed Section",
            updates: [],
          };
        }
        acc[section].updates.push(update);
        return acc;
      }, {});

      return NextResponse.json({
        updates: Object.values(groupedUpdates),
        total: updates.length,
      });
    }

    return NextResponse.json({
      updates,
      total: updates.length,
    });
  } catch (error) {
    console.error("Error fetching updates:", error);
    return NextResponse.json(
      {
        message: "Error fetching updates",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

// POST a new update
export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.projectId || !body.Section || !body.images || !body.title) {
      return NextResponse.json(
        {
          message: "Missing required fields",
          required: ["projectId", "Section", "images", "title"],
        },
        { status: 400 }
      );
    }

    // Validate Section
    if (!body.Section.sectionId || !body.Section.type) {
      return NextResponse.json(
        {
          message: "Invalid Section data",
          required: ["Section.sectionId", "Section.type"],
        },
        { status: 400 }
      );
    }

    // Fix the enum validation - the enum array was incorrectly defined as a single string
    const validTypes = ["building", "row-house", "other", "basic"];
    if (!validTypes.includes(body.Section.type)) {
      return NextResponse.json(
        {
          message: "Invalid Section type",
          validTypes,
          received: body.Section.type,
        },
        { status: 400 }
      );
    }

    // For building type, Flat might be required
    if (body.Section.type === "building" && body.Flat) {
      if (!body.Flat.name || !body.Flat.flatId) {
        return NextResponse.json(
          {
            message: "Invalid Flat data for building type",
            required: ["Flat.name", "Flat.flatId"],
          },
          { status: 400 }
        );
      }
    }

    await connect();

    const update = new Updates(body);
    await update.save();

    return NextResponse.json(
      { message: "Update created successfully", update },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating update:", error);
    return NextResponse.json(
      {
        message: "Error creating update",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

// PUT (update) an existing update
export const PUT = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Update ID is required" },
        { status: 400 }
      );
    }

    // Validate Section type if updating
    if (body.Section?.type) {
      const validTypes = ["building", "row-house", "other", "basic"];
      if (!validTypes.includes(body.Section.type)) {
        return NextResponse.json(
          {
            message: "Invalid Section type",
            validTypes,
          },
          { status: 400 }
        );
      }
    }

    await connect();

    const updatedUpdate = await Updates.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUpdate) {
      return NextResponse.json(
        { message: "Update not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Update updated successfully", update: updatedUpdate },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating update:", error);
    return NextResponse.json(
      {
        message: "Error updating update",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

// DELETE an update
export const DELETE = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Update ID is required" },
        { status: 400 }
      );
    }

    await connect();

    const deletedUpdate = await Updates.findByIdAndDelete(id);

    if (!deletedUpdate) {
      return NextResponse.json(
        { message: "Update not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Update deleted successfully", update: deletedUpdate },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting update:", error);
    return NextResponse.json(
      {
        message: "Error deleting update",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

// Get updates count by type
export const OPTIONS = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { message: "projectId is required" },
        { status: 400 }
      );
    }

    await connect();

    // Get count of updates by type
    const counts = await Updates.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: "$Section.type",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get total count
    const total = await Updates.countDocuments({ projectId });

    const countsByType = counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return NextResponse.json({
      total,
      countsByType,
    });
  } catch (error) {
    console.error("Error getting counts:", error);
    return NextResponse.json(
      {
        message: "Error getting counts",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
