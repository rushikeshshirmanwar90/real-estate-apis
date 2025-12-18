import { RoomInfo } from "@/lib/models/RoomInfo";
import { Building } from "@/lib/models/Building";
import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest | Request) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const buildingId = searchParams.get("buildingId");
    const flatId = searchParams.get("flatId");

    if (!flatId) {
      const query: { projectId?: string; buildingId?: string } = {};
      if (projectId) query.projectId = projectId;
      if (buildingId) query.buildingId = buildingId;

      const flats = await RoomInfo.find(query);

      if (!flats || flats.length === 0) {
        return NextResponse.json(
          {
            message: "No flats found",
          },
          { status: 404 }
        );
      }
      return NextResponse.json(flats);
    }

    const flat = await RoomInfo.findOne({ flatId });

    if (!flat) {
      return NextResponse.json(
        {
          message: "Invalid Flat ID",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(flat);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message: "Something went wrong while fetching flats",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const body = await req.json();

    const newFlat = new RoomInfo(body);
    const savedFlat = await newFlat.save();

    if (!savedFlat) {
      return NextResponse.json(
        { message: "Unable to add new flat" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        message: "Flat added successfully",
        data: savedFlat,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding flat:", error);
    return NextResponse.json(
      {
        message: "An error occurred while creating the flat",
        error: error,
      },
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const flatId = searchParams.get("flatId");

    const body = await req.json();

    await connect();

    const updatedFlat = await RoomInfo.findOneAndUpdate({ flatId }, body, {
      new: true,
    });

    if (!updatedFlat) {
      return NextResponse.json(
        {
          message: "Invalid flat ID",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        message: "Flat has been updated successfully",
        updatedData: updatedFlat,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Can't able to update the flat",
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
    await connect();

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const flatId = searchParams.get("flatId");

    if (!buildingId || !flatId) {
      return NextResponse.json(
        { error: "Building ID and Flat ID are required" },
        { status: 400 }
      );
    }

    // Remove flat reference from Building
    const updatedBuilding = await Building.findByIdAndUpdate(
      buildingId,
      {
        $pull: { flats: flatId },
      },
      { new: true }
    );

    if (!updatedBuilding) {
      return NextResponse.json(
        { error: "Building not found" },
        { status: 404 }
      );
    }

    const deletedFlat = await RoomInfo.findByIdAndDelete(flatId);

    if (!deletedFlat) {
      return NextResponse.json({ error: "Flat not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Flat deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting flat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
