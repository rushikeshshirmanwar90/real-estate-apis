import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";

export const GET = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    await connect();

    if (!id) {
      const clientData = await Client.find().lean();
      if (!clientData || clientData.length === 0) {
        return errorResponse("No clients found", 404);
      }
      return successResponse(clientData, "Clients retrieved successfully");
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid client ID format", 400);
    }

    const clientData = await Client.findById(id).lean();
    if (!clientData) {
      return errorResponse(`Client not found with id: ${id}`, 404);
    }

    return successResponse(clientData, "Client retrieved successfully");
  } catch (error: unknown) {
    console.error("Error fetching client:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, 500);
    }
    return errorResponse("Internal Server Error", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    console.log("📝 Creating new client...");

    await connect();
    const data = await req.json();

    console.log("📦 Received data:", JSON.stringify(data, null, 2));

    // Validate required fields
    const requiredFields = [
      "name",
      "phoneNumber",
      "email",
      "city",
      "state",
      "address",
    ];
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields);
      return errorResponse(
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );
    }

    // Check if client already exists
    const existingClient = (await Client.findOne({
      $or: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
    }).lean()) as any;

    if (existingClient) {
      console.error("❌ Client already exists");
      if (existingClient.email === data.email) {
        return errorResponse("Client with this email already exists", 409);
      }
      if (existingClient.phoneNumber === data.phoneNumber) {
        return errorResponse(
          "Client with this phone number already exists",
          409
        );
      }
    }

    // Remove userType from the data entirely
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userType, ...cleanData } = data;

    console.log("💾 Saving client to database...");

    const addClient = new Client(cleanData);
    await addClient.save();

    console.log("✅ Client saved successfully");
    console.log("   Client ID:", addClient._id);
    console.log("   Email:", addClient.email);

    return successResponse(
      addClient.toObject(),
      "Client added successfully",
      201
    );
  } catch (error: unknown) {
    console.error("❌ Error adding client:", error);

    if (error instanceof Error) {
      // Handle Mongoose validation errors
      if (error.name === "ValidationError") {
        return errorResponse(`Validation error: ${error.message}`, 400);
      }

      // Handle duplicate key errors
      if (error.message.includes("duplicate key")) {
        if (error.message.includes("email")) {
          return errorResponse("Client with this email already exists", 409);
        }
        if (error.message.includes("phoneNumber")) {
          return errorResponse(
            "Client with this phone number already exists",
            409
          );
        }
        return errorResponse("Client already exists", 409);
      }

      return errorResponse(error.message, 500);
    }

    return errorResponse("An error occurred while adding client", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return errorResponse("Email parameter is required", 400);
    }

    await connect();
    const deletedClient = await Client.findOneAndDelete({ email }).lean();

    if (!deletedClient) {
      return errorResponse("Client not found", 404);
    }

    return successResponse(deletedClient, "Client deleted successfully");
  } catch (error: unknown) {
    console.error("Error deleting client:", error);

    if (error instanceof Error) {
      return errorResponse(error.message, 500);
    }

    return errorResponse("Internal Server Error", 500);
  }
};

export const PUT = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (!id) {
      return errorResponse("ID parameter is required", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid client ID format", 400);
    }

    await connect();
    const data = await req.json();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...allowedData } = data;

    const clientData = await Client.findByIdAndUpdate(id, allowedData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!clientData) {
      return errorResponse("Client not found", 404);
    }

    return successResponse(clientData, "Client updated successfully");
  } catch (error: unknown) {
    console.error("Error updating client:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, 500);
    }
    return errorResponse("Internal Server Error", 500);
  }
};
