import connect from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { MiniSection as Section } from "@/lib/models/Xsite/mini-section";
import { NextRequest } from "next/server";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";

interface projectDetailProps {
  projectName: string;
  projectId: string;
}

interface mainSectionDetailProps {
  sectionName: string;
  sectionId: string;
}

interface payloadProps {
  name: string;
  projectDetails: projectDetailProps;
  mainSectionDetails: mainSectionDetailProps;
}

export const GET = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  const id = searchParams.get("id");

  try {
    await connect();

    if (sectionId) {
      const sectionData = await Section.find({
        "mainSectionDetails.sectionId": sectionId,
      });

      if (!sectionData) {
        return errorResponse("data not found", 204);
      }

      return successResponse(
        sectionData,
        "Section data fetched successfully",
        200
      );
    } else if (id) {
      const sectionDataById = await Section.findById(id);

      if (!sectionDataById) {
        return errorResponse("data not found", 204);
      }

      return successResponse(
        sectionDataById,
        "Section data fetched successfully",
        200
      );
    } else {
      return errorResponse("something went wrong in params", 406);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const data: payloadProps = await req.json();

    const newSection = await new Section(data);
    await newSection.save();

    if (newSection) {
      // ✅ Log activity for mini-section creation (consistent format)
      const userInfo = extractUserInfo(req, data);
      if (userInfo && data.projectDetails?.projectId) {
        await logActivity({
          user: userInfo,
          clientId: 'unknown', // You might need to add clientId to the payload
          projectId: data.projectDetails.projectId,
          projectName: data.projectDetails.projectName,
          sectionId: data.mainSectionDetails?.sectionId,
          sectionName: data.mainSectionDetails?.sectionName,
          miniSectionId: newSection._id.toString(),
          miniSectionName: data.name || 'Unnamed Mini Section',
          activityType: "mini_section_created",
          category: "mini_section",
          action: "create",
          description: `Created mini-section "${data.name || 'Unnamed Mini Section'}" in project "${data.projectDetails.projectName || 'Unknown Project'}"`,
          message: `Mini-section created successfully in project`,
          metadata: {
            miniSectionData: {
              name: data.name,
              projectId: data.projectDetails.projectId,
              sectionId: data.mainSectionDetails?.sectionId
            }
          }
        });
      }

      return successResponse(newSection, "section created successfully", 201);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

export const PUT = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    await connect();

    if (!id) return errorResponse("sectionId is required", 406);

    // Accept partial updates for name, projectDetails and mainSectionDetails
    const body = (await req.json()) as Partial<{
      name: string;
      projectDetails: { projectName: string; projectId: string };
      mainSectionDetails: { sectionName?: string; sectionId?: string };
    }>;

    const updates: Record<
      string,
      | string
      | { projectName: string; projectId: string }
      | { sectionName?: string; sectionId?: string }
    > = {};
    if (body.name) updates.name = body.name;
    if (body.projectDetails) updates.projectDetails = body.projectDetails;
    if (body.mainSectionDetails)
      updates.mainSectionDetails = body.mainSectionDetails;

    if (Object.keys(updates).length === 0) {
      return errorResponse("no updatable fields provided", 406);
    }

    const updatedData = await Section.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!updatedData) {
      return errorResponse(`section not found with id: ${id}`, 404);
    }

    return successResponse(updatedData, "data updated successfully", 200);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

export const DELETE = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    await connect();

    if (!id) {
      return errorResponse("id is required", 406);
    }

    const removedData = await Section.findByIdAndDelete(id);

    if (!removedData) {
      return errorResponse(`data not found with this id : ${id}`, 404);
    }

    return successResponse(removedData, "data deleted successfully", 200);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};
