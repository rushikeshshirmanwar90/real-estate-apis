import connect from "@/lib/db";
import { CustomerDetails } from "@/lib/models/CustomerDetails";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    if (!isValidObjectId(userId)) {
      return errorResponse("Invalid userId format", 400);
    }

    const objectId = new mongoose.Types.ObjectId(userId);
    const property = await CustomerDetails.findOne({ userId: objectId }).lean();

    if (!property) {
      return errorResponse("No properties found for this user", 404);
    }

    return successResponse(property, "Properties retrieved successfully");
  } catch (error: unknown) {
    logger.error("Error fetching properties", error);
    return errorResponse("Failed to fetch properties", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const { userId, ...propertyData } = body;

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    if (!isValidObjectId(userId)) {
      return errorResponse("Invalid userId format", 400);
    }

    // Validate required property fields
    const requiredFields = [
      "projectId",
      "projectName",
      "sectionId",
      "sectionName",
      "sectionType",
    ];
    const missingFields = requiredFields.filter(
      (field) => !propertyData[field]
    );

    if (missingFields.length > 0) {
      return errorResponse(
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Check if customer details exist
    const existingCustomer = await CustomerDetails.findOne({
      userId: objectId,
    });

    let result;
    if (existingCustomer) {
      // Update existing customer
      result = await CustomerDetails.findOneAndUpdate(
        { userId: objectId },
        { $push: { property: propertyData } },
        { new: true, runValidators: true }
      ).lean();
    } else {
      // Create new customer details
      const newCustomerDetails = new CustomerDetails({
        userId: objectId,
        property: [propertyData],
      });
      result = await newCustomerDetails.save();
    }

    if (!result) {
      return errorResponse("Failed to add property", 500);
    }

    return successResponse(result, "Property added successfully", 201);
  } catch (error: unknown) {
    logger.error("Error adding property", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to add property", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const propertyId = searchParams.get("propertyId");

    // Delete specific property
    if (userId && propertyId) {
      if (!isValidObjectId(userId) || !isValidObjectId(propertyId)) {
        return errorResponse("Invalid ID format", 400);
      }

      const objectId = new mongoose.Types.ObjectId(userId);

      const result = await CustomerDetails.findOneAndUpdate(
        { userId: objectId },
        { $pull: { property: { _id: propertyId } } },
        { new: true }
      ).lean();

      if (!result) {
        return errorResponse("User or property not found", 404);
      }

      return successResponse(result, "Property deleted successfully");
    }

    // Delete all properties for a user
    if (userId) {
      if (!isValidObjectId(userId)) {
        return errorResponse("Invalid userId format", 400);
      }

      const objectId = new mongoose.Types.ObjectId(userId);
      const deletedData = await CustomerDetails.findOneAndDelete({
        userId: objectId,
      }).lean();

      if (!deletedData) {
        return errorResponse("User not found", 404);
      }

      return successResponse(
        deletedData,
        "User properties deleted successfully"
      );
    }

    // Delete all customer details (admin only - should be protected)
    const deleteResult = await CustomerDetails.deleteMany({});

    if (deleteResult.deletedCount === 0) {
      return errorResponse("No data found to delete", 404);
    }

    return successResponse(
      { deletedCount: deleteResult.deletedCount },
      "All customer data deleted successfully"
    );
  } catch (error: unknown) {
    logger.error("Error deleting properties", error);
    return errorResponse("Failed to delete properties", 500);
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const { userId, propertyId, ...updateData } = body;

    if (!userId || !propertyId) {
      return errorResponse("userId and propertyId are required", 400);
    }

    if (!isValidObjectId(userId) || !isValidObjectId(propertyId)) {
      return errorResponse("Invalid ID format", 400);
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Update specific property in the array
    const result = await CustomerDetails.findOneAndUpdate(
      {
        userId: objectId,
        "property._id": propertyId,
      },
      {
        $set: {
          "property.$": { _id: propertyId, ...updateData },
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!result) {
      return errorResponse("User or property not found", 404);
    }

    return successResponse(result, "Property updated successfully");
  } catch (error: unknown) {
    logger.error("Error updating property", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }

    return errorResponse("Failed to update property", 500);
  }
};
