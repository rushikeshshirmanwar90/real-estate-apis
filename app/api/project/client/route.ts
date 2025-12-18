import connect from "@/lib/db";
import { ObjectId } from "mongodb";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        {
          message: "Client ID is required",
        },
        {
          status: 400,
        }
      );
    }

    await connect();
    if (id) {
      // Find project by both _id and clientId
      const project = await Projects.findOne({
        _id: new ObjectId(id),
        clientId: new ObjectId(clientId),
      });
      if (!project) {
        return new Response("Project not found", { status: 404 });
      }
      return NextResponse.json(project);
    }

    const projects = await Projects.find({ clientId });

    if (!projects) {
      return NextResponse.json(
        {
          message: "can't able to fetch the data",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(projects, {
      status: 200,
    });
  } catch (error: unknown) {
    console.log(error);

    return NextResponse.json(
      {
        message: "can't able to get the Projects",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};
