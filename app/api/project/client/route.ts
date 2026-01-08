import connect from "@/lib/db";
import { Types } from "mongoose";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest | Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clientId = searchParams.get("clientId");
    const staffId = searchParams.get("staffId"); // Add staffId parameter for filtering

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

    // Validate staffId if provided
    if (staffId && !Types.ObjectId.isValid(staffId)) {
      return NextResponse.json(
        {
          message: "Invalid staff ID format",
        },
        {
          status: 400,
        }
      );
    }

    await connect();
    
    if (id) {
      // Build query for single project
      const projectQuery: any = {
        _id: new Types.ObjectId(id),
        clientId: new Types.ObjectId(clientId),
      };

      // If staffId is provided, filter by assigned staff
      if (staffId) {
        projectQuery["assignedStaff._id"] = staffId;
      }

      const project = await Projects.findOne(projectQuery);
      
      if (!project) {
        return new Response("Project not found or not assigned to this staff member", { status: 404 });
      }
      return NextResponse.json(project);
    }

    // Build query for multiple projects
    const projectsQuery: any = { clientId };

    // If staffId is provided, filter by assigned staff
    if (staffId) {
      projectsQuery["assignedStaff._id"] = staffId;
      console.log(`🔍 [project/client] Filtering projects for staff ID: ${staffId}`);
    }

    const projects = await Projects.find(projectsQuery);

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

    console.log(`📊 [project/client] Found ${projects.length} projects for clientId: ${clientId}${staffId ? `, staffId: ${staffId}` : ''}`);

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
