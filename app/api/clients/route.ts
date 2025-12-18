import bcrypt from "bcrypt";
import connect from "@/lib/db";
import mongoose from "mongoose";
import { Client } from "@/lib/models/super-admin/Client";
import { NextRequest } from "next/server";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId, isValidEmail } from "@/lib/utils/validation";
import {
  getPaginationParams,
  createPaginationMeta,
} from "@/lib/utils/pagination";
import { logger } from "@/lib/utils/logger";

const SALT_ROUNDS = 10;

export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    // Get specific Client by ID
    if (id) {
      if (!isValidObjectId(id)) {
        return errorResponse("Invalid client ID format", 400);
      }

      const clientData = await Client.findById(id).select("-password").lean();
      if (!clientData) {
        return errorResponse("Client not found", 404);
      }

      return successResponse(clientData, "Client retrieved successfully");
    }

    // Get specific client by email
    if (email) {
      if (!isValidEmail(email)) {
        return errorResponse("Invalid email format", 400);
      }

      const clientData = await Client.findOne({ email })
        .select("-password")
        .lean();
      if (!clientData) {
        return errorResponse("Client not found with this email", 404);
      }

      return successResponse(clientData, "Client retrieved successfully");
    }

    // Get all clients with pagination
    const { page, limit, skip } = getPaginationParams(req);

    const [clients, total] = await Promise.all([
      Client.find()
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Client.countDocuments(),
    ]);

    const meta = createPaginationMeta(page, limit, total);

    return successResponse(
      { clients, meta },
      `Retrieved ${clients.length} client(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("GET /clients error", error);
    return errorResponse("Failed to fetch client data", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const data = await req.json();

    // Validate required fields
    if (!data.email) {
      return errorResponse("Email is required", 400);
    }

    if (!isValidEmail(data.email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Check if client already exists
    const existingClient = await Client.findOne({ email: data.email }).lean();
    if (existingClient) {
      return errorResponse("Client already exists with this email", 409);
    }

    const existingLoginUser = await LoginUser.findOne({
      email: data.email,
    }).lean();
    if (existingLoginUser) {
      return errorResponse("User already exists with this email", 409);
    }

    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    // Use transaction for atomicity
    await connect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const addClient = new Client(data);
      await addClient.save({ session });

      const loginPayload = { email: data.email, userType: "clients" };
      const newEntry = new LoginUser(loginPayload);
      await newEntry.save({ session });

      await session.commitTransaction();

      // Return client without password
      const { password: _, ...clientWithoutPassword } = addClient.toObject();

      return successResponse(
        clientWithoutPassword,
        "Client created successfully",
        201
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error creating client", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to create client", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return errorResponse("Email is required", 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Invalid email format", 400);
    }

    await connect();

    // Use transaction for atomicity
    await connect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const deletedClient = await Client.findOneAndDelete(
        { email },
        { session }
      ).lean();
      const deletedLoginUser = await LoginUser.findOneAndDelete(
        { email },
        { session }
      ).lean();

      if (!deletedClient) {
        await session.abortTransaction();
        return errorResponse("Client not found", 404);
      }

      await session.commitTransaction();

      return successResponse(deletedClient, "Client deleted successfully");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    logger.error("Error deleting client", error);
    return errorResponse("Failed to delete client", 500);
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid client ID format", 400);
    }

    const updateData = await req.json();

    // Don't allow password updates through this endpoint
    delete updateData.password;

    // Validate email if being updated
    if (updateData.email) {
      if (!isValidEmail(updateData.email)) {
        return errorResponse("Invalid email format", 400);
      }

      // Check if email already exists for another client
      const existingClient = await Client.findOne({
        email: updateData.email,
        _id: { $ne: id },
      }).lean();

      if (existingClient) {
        return errorResponse("Email already exists for another client", 409);
      }
    }

    await connect();

    // Get old email before update if email is being changed
    let oldEmail: string | undefined;
    if (updateData.email) {
      const oldClient = await Client.findById(id).select("email").lean();
      if (oldClient && !Array.isArray(oldClient)) {
        oldEmail = (oldClient as any).email;
      }
    }

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();

    if (!updatedClient) {
      return errorResponse("Client not found", 404);
    }

    // Update email in LoginUser if changed
    if (updateData.email && oldEmail) {
      await LoginUser.findOneAndUpdate(
        { email: oldEmail },
        { email: updateData.email }
      );
    }

    return successResponse(updatedClient, "Client updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating client", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update client", 500);
  }
};
