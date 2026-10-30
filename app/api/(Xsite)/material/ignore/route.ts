import { checkValidClient, type Session } from "@/lib/auth";
import { authErrorResponse, projectAccessError } from "@/lib/auth/session";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { NextRequest } from "next/server";

// GET /api/material/ignore?projectId=...
// Returns the list of low-stock materialKeys the user has dismissed for this
// project. Shared across every device viewing the project.
export const GET = async (req: NextRequest) => {
  let session: Session;
  try {
    session = await checkValidClient(req, ["user", "superadmin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const denied = await projectAccessError(session, projectId);
    if (denied) return denied;

    if (!projectId) {
      return errorResponse("Project ID is required", 400);
    }
    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    const project = await Projects.findById(projectId)
      .select("ignoredLowStockMaterials")
      .lean();

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse({
      ignoredLowStockMaterials: (project as any).ignoredLowStockMaterials || [],
    });
  } catch (error) {
    return errorResponse("Failed to fetch ignored materials", 500, error);
  }
};

// POST /api/material/ignore
// body: { projectId: string, materialKey: string }
// Adds materialKey to the project's ignore list (no-op if already present).
export const POST = async (req: NextRequest) => {
  let session: Session;
  try {
    session = await checkValidClient(req, ["user", "superadmin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    await connect();

    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { projectId, materialKey } = body;
    const denied = await projectAccessError(session, projectId);
    if (denied) return denied;

    if (!projectId) {
      return errorResponse("Project ID is required", 400);
    }
    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }
    if (!materialKey || typeof materialKey !== "string") {
      return errorResponse("materialKey is required", 400);
    }

    const project = await Projects.findByIdAndUpdate(
      projectId,
      { $addToSet: { ignoredLowStockMaterials: materialKey } },
      { new: true, select: "ignoredLowStockMaterials" }
    ).lean();

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse(
      { ignoredLowStockMaterials: (project as any).ignoredLowStockMaterials || [] },
      "Material ignored"
    );
  } catch (error) {
    return errorResponse("Failed to ignore material", 500, error);
  }
};

// DELETE /api/material/ignore?projectId=...&materialKey=...
// Removes materialKey from the ignore list (undo).
export const DELETE = async (req: NextRequest) => {
  let session: Session;
  try {
    session = await checkValidClient(req, ["user", "superadmin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const materialKey = searchParams.get("materialKey");
    const denied = await projectAccessError(session, projectId);
    if (denied) return denied;

    if (!projectId) {
      return errorResponse("Project ID is required", 400);
    }
    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }
    if (!materialKey) {
      return errorResponse("materialKey is required", 400);
    }

    const project = await Projects.findByIdAndUpdate(
      projectId,
      { $pull: { ignoredLowStockMaterials: materialKey } },
      { new: true, select: "ignoredLowStockMaterials" }
    ).lean();

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse(
      { ignoredLowStockMaterials: (project as any).ignoredLowStockMaterials || [] },
      "Material un-ignored"
    );
  } catch (error) {
    return errorResponse("Failed to un-ignore material", 500, error);
  }
};
