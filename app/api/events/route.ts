import connect from "@/lib/db";
import { Event } from "@/lib/models/Events";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import {
  getPaginationParams,
  createPaginationMeta,
} from "@/lib/utils/pagination";
import { logger } from "@/lib/utils/logger";

// GET all events or a specific one by ID
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connect();

    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid event ID format", 400);
      }

      const event = await Event.findById(id).lean();
      if (!event) {
        return errorResponse("Event not found", 404);
      }
      return successResponse(event, "Event retrieved successfully");
    }

    // Pagination
    const { page, limit, skip } = getPaginationParams(req);

    const [events, total] = await Promise.all([
      Event.find().skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Event.countDocuments(),
    ]);

    const meta = createPaginationMeta(page, limit, total);

    return successResponse(
      { events, meta },
      `Retrieved ${events.length} event(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error fetching events", error);
    return errorResponse("Error fetching events", 500);
  }
};

// POST a new event
export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    await connect();

    const event = new Event(body);
    await event.save();

    return successResponse(event, "Event created successfully", 201);
  } catch (error: unknown) {
    logger.error("Error creating event", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create event", 500);
  }
};

// PUT (update) an existing event
export const PUT = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    if (!id) {
      return errorResponse("Event ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid event ID format", 400);
    }

    await connect();

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedEvent) {
      return errorResponse("Event not found", 404);
    }

    return successResponse(updatedEvent, "Event updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating event", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update event", 500);
  }
};

// DELETE an event
export const DELETE = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Event ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid event ID format", 400);
    }

    await connect();

    const deletedEvent = await Event.findByIdAndDelete(id).lean();

    if (!deletedEvent) {
      return errorResponse("Event not found", 404);
    }

    return successResponse(deletedEvent, "Event deleted successfully");
  } catch (error: unknown) {
    logger.error("Error deleting event", error);
    return errorResponse("Failed to delete event", 500);
  }
};
