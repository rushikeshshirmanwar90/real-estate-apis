import { Lead } from "@/lib/models/Leads";
import { NextRequest } from "next/server";
import connect from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import {
  getPaginationParams,
  createPaginationMeta,
} from "@/lib/utils/pagination";
import { logger } from "@/lib/utils/logger";
import { requireValidClient } from "@/lib/utils/client-validation";

// GET all Leads records or a specific one by ID
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    await connect();

    // ✅ Validate client exists
    try {
      await requireValidClient(clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid lead ID format", 400);
      }

      const lead = await Lead.findOne({ _id: id, clientId }).lean();
      if (!lead) {
        return errorResponse("Lead not found", 404);
      }
      return successResponse(lead, "Lead retrieved successfully");
    }

    // Pagination
    const { page, limit, skip } = getPaginationParams(req);

    const [leads, total] = await Promise.all([
      Lead.find({ clientId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Lead.countDocuments({ clientId }),
    ]);

    const meta = createPaginationMeta(page, limit, total);

    return successResponse(
      { leads, meta },
      `Retrieved ${leads.length} lead(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error fetching leads", error);
    return errorResponse("Error fetching leads", 500);
  }
};

// POST a new Lead record
export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.clientId) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(body.clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    await connect();

    // ✅ Validate client exists before creating lead
    try {
      await requireValidClient(body.clientId);
    } catch (clientError) {
      if (clientError instanceof Error) {
        return errorResponse(clientError.message, 404);
      }
      return errorResponse("Client validation failed", 404);
    }

    const newLead = new Lead(body);
    await newLead.save();

    return successResponse(newLead, "Lead created successfully", 201);
  } catch (error: unknown) {
    logger.error("Error creating lead", error);

    // Handle validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create lead", 500);
  }
};

// PUT/UPDATE a Lead record
export const PUT = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    if (!id) {
      return errorResponse("Lead ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid lead ID format", 400);
    }

    await connect();

    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedLead) {
      return errorResponse("Lead not found", 404);
    }

    return successResponse(updatedLead, "Lead updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating lead", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update lead", 500);
  }
};

// DELETE a Lead record
export const DELETE = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Lead ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid lead ID format", 400);
    }

    await connect();

    const deletedLead = await Lead.findByIdAndDelete(id).lean();

    if (!deletedLead) {
      return errorResponse("Lead not found", 404);
    }

    return successResponse(deletedLead, "Lead deleted successfully");
  } catch (error: unknown) {
    logger.error("Error deleting lead", error);
    return errorResponse("Failed to delete lead", 500);
  }
};
