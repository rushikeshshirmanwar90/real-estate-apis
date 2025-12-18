import connect from "@/lib/db";
import { OtherSection } from "@/lib/models/OtherSection";
import { Projects } from "@/lib/models/Project";

import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  try {
    await connect();
    let data;

    if (id) {
      data = await OtherSection.findById(id);
    } else {
      data = await OtherSection.find();
    }

    if (!data) {
      return NextResponse.json(
        {
          message: "can't able to find OtherSection",
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
  } catch (error: unknown) {
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

    const newSection = new OtherSection(data);
    const savedData = await newSection.save();

    if (!savedData) {
      return NextResponse.json(
        {
          message: "can't able to add new OtherSection",
        },
        { status: 500 }
      );
    }

    // Push a string version of the sectionId to ensure consistent matching later
    const updatedProject = await Projects.findByIdAndUpdate(
      String(savedData.projectId),
      {
        $push: {
          section: {
            sectionId: String(savedData._id),
            name: savedData.name,
            type: "other",
          },
        },
      },
      { new: true }
    );

    // If project update fails, remove the created section to avoid orphaned documents
    if (!updatedProject) {
      await OtherSection.findByIdAndDelete(savedData._id);
      return NextResponse.json(
        { message: `Project not found :  ${savedData.name}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { section: savedData, project: updatedProject },
      { status: 201 }
    );
  } catch (error: unknown) {
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

    // Load project and remove matching sections by string comparison to be robust
    const project = await Projects.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const originalLen = Array.isArray(project.section)
      ? project.section.length
      : 0;

    // Remove entries where either the stored sectionId matches OR the embedded subdoc _id matches
    project.section = (project.section || []).filter(
      (s: { sectionId?: unknown; _id?: unknown }) =>
        String(s.sectionId) !== String(sectionId) &&
        String(s._id) !== String(sectionId)
    );

    // If nothing was removed, try a looser comparison just in case
    if (project.section.length === originalLen) {
      project.section = (project.section || []).filter(
        (s: { sectionId?: unknown; _id?: unknown }) =>
          !(
            String(s.sectionId).includes(String(sectionId)) ||
            String(s._id).includes(String(sectionId))
          )
      );
    }

    await project.save();

    // Load OtherSection and ensure it belongs to the same project (compare stringified ids)
    const other = await OtherSection.findById(sectionId);

    if (!other) {
      // OtherSection document already missing, but project ref removed — return success
      return NextResponse.json(
        {
          message: "OtherSection document not found; project reference removed",
          project,
        },
        { status: 200 }
      );
    }

    if (String(other.projectId) !== String(projectId)) {
      // The section exists but isn't linked to the provided projectId — don't delete
      return NextResponse.json(
        {
          message: "OtherSection does not belong to the specified project",
          otherProjectId: other.projectId,
        },
        { status: 403 }
      );
    }

    // Safe delete: it belongs to the project so delete by id
    const deleted = await OtherSection.findByIdAndDelete(sectionId);

    if (!deleted) {
      return NextResponse.json(
        { message: "Failed to delete OtherSection" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { deletedOtherSection: deleted, project },
      { status: 200 }
    );
  } catch (error: unknown) {
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
  // accept ?id or fallback to ?rh for backward compatibility
  const OtherSectionId = searchParams.get("id") || searchParams.get("rh");
  const newData = await req.json();

  try {
    await connect();

    if (!OtherSectionId) {
      return NextResponse.json(
        { message: "section id is required" },
        { status: 400 }
      );
    }

    const newHouse = await OtherSection.findByIdAndUpdate(
      OtherSectionId,
      newData,
      {
        new: true,
        runValidators: true,
      }
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
  } catch (error: unknown) {
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
