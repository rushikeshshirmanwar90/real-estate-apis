import connect from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { NextRequest } from "next/server";
import { MaterialActivity as ImportedMaterials } from "@/lib/models/Xsite/materials-activity";
import { MiniSection as Section } from "@/lib/models/Xsite/mini-section";

export const POST = async (req: NextRequest | Request) => {
  try {
    const { requestId, materials } = await req.json();

    // Validate requestId
    if (!requestId) {
      return errorResponse("requestId is required", 400);
    }

    await connect();

    // Find the requested material
    const findRequestMaterial = await ImportedMaterials.findById(requestId);

    const sectionId = findRequestMaterial?.sectionId;

    if (!findRequestMaterial) {
      return errorResponse("Material request not found", 404);
    }

    // Check if request is approved
    if (findRequestMaterial.status === "pending") {
      return errorResponse("Request is not approved yet", 400);
    }

    // Check if already imported
    if (findRequestMaterial.status === "imported") {
      return errorResponse("Material request already imported", 409);
    }

    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      {
        $push: {
          MaterialAvailable: { $each: materials },
        },
      },
      { new: true, runValidators: true }
    );

    // Check if any update failed
    if (!updatedSection) {
      return errorResponse("Failed to update materials in all locations", 500);
    }

    // Update material request status
    const updateMaterialRequest = await ImportedMaterials.findByIdAndUpdate(
      requestId,
      {
        status: "imported",
      },
      { new: true, runValidators: true }
    );

    if (!updateMaterialRequest) {
      return errorResponse("Failed to update material request status", 500);
    }

    // Return success response
    return successResponse(
      findRequestMaterial,
      "material imported successfully",
      200
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/import-material:", error);

    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }

    return errorResponse("Unknown error occurred", 500);
  }
};
