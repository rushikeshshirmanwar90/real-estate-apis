import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { RowHouse } from "@/lib/models/RowHouse";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  try {
    await connect();
    let data;

    if (id) {
      data = await RowHouse.findById(id);
    } else {
      data = await RowHouse.find();
    }

    if (!data) {
      return NextResponse.json(
        {
          message: "can't able to find RowHouse",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      {
        message: "Something wen't wrong !",
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
    const data = await req.json();

    const newData = await new RowHouse(data);
    const savedData = await newData.save();

    if (!newData) {
      return NextResponse.json(
        {
          message: "can't able to add new RowHouse",
        },
        { status: 404 }
      );
    }

    const updatedProject = await Projects.findByIdAndUpdate(
      savedData.projectId,
      {
        $push: {
          section: {
            sectionId: savedData._id,
            name: savedData.name,
            type: "row house",
          },
        },
      },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ newData }, { status: 200 });
  } catch (error) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      {
        message: "Something wen't wrong !",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};

export const DELETE = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const sectionId = searchParams.get("sectionId");

  try {
    await connect();

    if (!projectId || !sectionId) {
      return NextResponse.json(
        { error: "Project ID and Section ID are required" },
        { status: 400 }
      );
    }

    const updatedProject = await Projects.findByIdAndUpdate(
      projectId,
      {
        $pull: { section: { sectionId: sectionId } },
      },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const deletedRowHouse = await RowHouse.findByIdAndDelete(sectionId);
    if (!deletedRowHouse) {
      return NextResponse.json(
        { message: "can't able to delete the row house" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        deletedRowHouse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      {
        message: "Something wen't wrong !",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};

export const PUT = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const rowHouseId = searchParams.get("rh");
  const newData = await req.json();

  try {
    await connect();

    const newHouse = await RowHouse.findByIdAndUpdate(
      rowHouseId,
      { newData },
      { new: true }
    );

    if (!newHouse) {
      return NextResponse.json(
        {
          message: "can't able to update the row house",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        newHouse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      {
        message: "Something wen't wrong !",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};
