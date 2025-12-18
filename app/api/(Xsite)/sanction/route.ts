import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { MaterialActivity as ImportedMaterials } from "@/lib/models/Xsite/materials-activity";
import { MiniSection as Section } from "@/lib/models/Xsite/mini-section";
import { NextRequest } from "next/server";
import connect from "@/lib/db";

export const POST = async (req: NextRequest | Request) => {
  try {
    await connect();

    const { isApproved, id } = await req.json();

    if (!id) {
      return errorResponse("id is required", 400);
    }

    // Fetch the existing request to validate state
    const existing = await ImportedMaterials.findById(id);
    if (!existing) {
      return errorResponse("Material request not found", 404);
    }

    if (isApproved) {
      // Prevent double-approving
      if (existing.status === "approved" || existing.status === "imported") {
        return errorResponse("Request already approved or imported", 409);
      }

      // Find the section to push materials into
      const section = await Section.findById(existing.sectionId);
      if (!section) {
        return errorResponse("Section not found to add materials", 404);
      }

      // After materials successfully pushed, mark the request as approved
      const updated = await ImportedMaterials.findByIdAndUpdate(
        id,
        { status: "approved" },
        { new: true }
      );

      if (!updated) {
        return errorResponse(
          "unable to approve the request please try again",
          500
        );
      }

      return successResponse(
        { request: updated },
        "request approved and materials added to section",
        200
      );
    }

    // If not approved, mark as rejected
    const rejected = await ImportedMaterials.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true }
    );

    if (!rejected) {
      return errorResponse(
        "unable to reject the request please try again",
        500
      );
    }

    return successResponse(rejected, "request rejected successfully", 200);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("something went wrong", 500, error.message);
    }

    return errorResponse("something went wrong", 500);
  }
};
