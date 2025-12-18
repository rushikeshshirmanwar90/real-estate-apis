import connect from "@/lib/db";
import mongoose from "mongoose";
import { Contacts } from "@/lib/models/Contacts";
import { Customer } from "@/lib/models/users/Customer";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import {
  getPaginationParams,
  createPaginationMeta,
} from "@/lib/utils/pagination";
import { logger } from "@/lib/utils/logger";

export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const userId = searchParams.get("userId");
    const isAll = searchParams.get("all") === "yes";

    // Validate ObjectIds if provided
    if (clientId && !isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    if (userId && !isValidObjectId(userId)) {
      return errorResponse("Invalid user ID format", 400);
    }

    // Build filter
    let filter = {};
    if (clientId) {
      filter = { clientId };
    } else if (userId) {
      filter = { userId };
    } else if (!isAll) {
      return errorResponse("No valid query parameters provided", 400);
    }

    // Pagination
    const { page, limit, skip } = getPaginationParams(req);

    const [contacts, total] = await Promise.all([
      Contacts.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Contacts.countDocuments(filter),
    ]);

    const meta = createPaginationMeta(page, limit, total);

    return successResponse(
      { contacts, meta },
      `Retrieved ${contacts.length} contact(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error retrieving contacts", error);
    return errorResponse("Unable to retrieve contacts", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return errorResponse(
        "Invalid input: body must be a non-empty array",
        400
      );
    }

    // Validate each contact object
    const validContacts = body.filter((contact) => {
      if (!contact.clientId || !contact.userId) {
        logger.debug("Skipping contact missing required fields", { contact });
        return false;
      }

      if (
        !isValidObjectId(contact.clientId) ||
        !isValidObjectId(contact.userId)
      ) {
        logger.debug("Skipping contact with invalid IDs", { contact });
        return false;
      }

      if (!contact.firstName && !contact.phoneNumber) {
        logger.debug("Skipping contact with no identifying information", {
          contact,
        });
        return false;
      }

      return true;
    });

    if (validContacts.length === 0) {
      return errorResponse("No valid contacts to insert", 400);
    }

    // Use transaction for atomicity
    await connect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get the user's verification status
      const user = await Customer.findOne({
        _id: validContacts[0].userId,
      }).session(session);
      if (!user) {
        await session.abortTransaction();
        return errorResponse("User not found", 404);
      }

      // Check if user is already verified
      if (user.verified) {
        await session.abortTransaction();
        return errorResponse("User is already verified", 400);
      }

      // Insert the contacts
      const insertedContacts = await Contacts.insertMany(validContacts, {
        session,
      });

      if (insertedContacts.length === 0) {
        await session.abortTransaction();
        return errorResponse("Unable to insert contacts", 500);
      }

      // Update user's verification status
      await Customer.findByIdAndUpdate(
        user._id,
        { verified: true },
        { new: true, session }
      );

      await session.commitTransaction();

      return successResponse(
        {
          contacts: insertedContacts,
          insertedCount: insertedContacts.length,
        },
        "Contacts inserted successfully and user verified",
        201
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error inserting contacts", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Unable to insert contacts", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const userId = searchParams.get("userId");

    if (!clientId && !userId) {
      return errorResponse(
        "At least one of clientId or userId is required",
        400
      );
    }

    // Validate ObjectIds
    if (clientId && !isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    if (userId && !isValidObjectId(userId)) {
      return errorResponse("Invalid user ID format", 400);
    }

    const query: { clientId?: string; userId?: string } = {};
    if (clientId) query.clientId = clientId;
    if (userId) query.userId = userId;

    const deleteResult = await Contacts.deleteMany(query);

    if (deleteResult.deletedCount === 0) {
      return errorResponse(
        `No contacts found to delete for ${clientId ? "clientId" : "userId"}`,
        404
      );
    }

    return successResponse(
      { deletedCount: deleteResult.deletedCount },
      `${deleteResult.deletedCount} contact(s) deleted successfully`
    );
  } catch (error: unknown) {
    logger.error("Error deleting contacts", error);
    return errorResponse("Unable to delete contacts", 500);
  }
};
