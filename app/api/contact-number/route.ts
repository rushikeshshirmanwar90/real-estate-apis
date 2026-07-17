import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ContactNumber } from "@/lib/models/Shivai/ContactNumber";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { checkValidClient } from "@/lib/auth";

const authenticate = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
    return null;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
};

/**
 * GET /api/contact-number?projectId= | ?clientId=
 * Lists contact numbers for a project (customer home screen) or for a whole
 * client (admin dashboard). At least one of the two is required.
 */
export const GET = async (req: NextRequest) => {
  const authError = await authenticate(req);
  if (authError) return authError;

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");

    if (!clientId && !projectId) {
      return errorResponse("projectId or clientId is required", 400);
    }
    if (clientId && !isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }
    if (projectId && !isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    const filter: Record<string, string> = {};
    if (clientId) filter.clientId = clientId;
    if (projectId) filter.projectId = projectId;

    const numbers = await ContactNumber.find(filter)
      .sort({ projectName: 1, createdAt: -1 })
      .lean();

    return successResponse(
      numbers,
      `Retrieved ${numbers.length} contact number(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error retrieving contact numbers", error);
    return errorResponse("Unable to retrieve contact numbers", 500);
  }
};

/**
 * POST /api/contact-number
 * Adds a contact number to a project.
 * Body: { clientId, projectId, projectName?, name, phoneNumber }
 */
export const POST = async (req: NextRequest) => {
  const authError = await authenticate(req);
  if (authError) return authError;

  try {
    await connect();

    let body: {
      clientId?: string;
      projectId?: string;
      projectName?: string;
      name?: string;
      phoneNumber?: string;
    };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    const clientId = typeof body?.clientId === "string" ? body.clientId.trim() : "";
    const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";
    const projectName =
      typeof body?.projectName === "string" ? body.projectName.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phoneNumber =
      typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";

    if (!clientId || !isValidObjectId(clientId)) {
      return errorResponse("Valid clientId is required", 400);
    }
    if (!projectId || !isValidObjectId(projectId)) {
      return errorResponse("Valid projectId is required", 400);
    }
    if (!name) {
      return errorResponse("name is required", 400);
    }
    if (!/^[0-9+\-() ]{7,15}$/.test(phoneNumber)) {
      return errorResponse("Valid phoneNumber is required", 400);
    }

    const created = await ContactNumber.create({
      clientId,
      projectId,
      projectName,
      name,
      phoneNumber,
    });

    return successResponse(created, "Contact number added successfully", 201);
  } catch (error: unknown) {
    logger.error("Error adding contact number", error);
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: string }).name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }
    return errorResponse("Unable to add contact number", 500);
  }
};

/**
 * PUT /api/contact-number
 * Updates a contact number's name and/or phoneNumber.
 * Body: { id, name?, phoneNumber? }
 */
export const PUT = async (req: NextRequest) => {
  const authError = await authenticate(req);
  if (authError) return authError;

  try {
    await connect();

    let body: { id?: string; name?: string; phoneNumber?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id || !isValidObjectId(id)) {
      return errorResponse("Valid id is required", 400);
    }

    const updates: Record<string, string> = {};
    if (body?.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return errorResponse("name cannot be empty", 400);
      }
      updates.name = name;
    }
    if (body?.phoneNumber !== undefined) {
      const phoneNumber =
        typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
      if (!/^[0-9+\-() ]{7,15}$/.test(phoneNumber)) {
        return errorResponse("Valid phoneNumber is required", 400);
      }
      updates.phoneNumber = phoneNumber;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("name or phoneNumber is required to update", 400);
    }

    const updated = await ContactNumber.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) {
      return errorResponse("Contact number not found", 404);
    }

    return successResponse(updated, "Contact number updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating contact number", error);
    return errorResponse("Unable to update contact number", 500);
  }
};

/**
 * DELETE /api/contact-number?id=
 * Removes a contact number by its _id.
 */
export const DELETE = async (req: NextRequest) => {
  const authError = await authenticate(req);
  if (authError) return authError;

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !isValidObjectId(id)) {
      return errorResponse("Valid id is required", 400);
    }

    const deleted = await ContactNumber.findByIdAndDelete(id).lean();
    if (!deleted) {
      return errorResponse("Contact number not found", 404);
    }

    return successResponse(deleted, "Contact number deleted successfully");
  } catch (error: unknown) {
    logger.error("Error deleting contact number", error);
    return errorResponse("Unable to delete contact number", 500);
  }
};
