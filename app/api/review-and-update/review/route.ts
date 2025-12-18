import connect from "@/lib/db";
import { ReviewAndUpdates } from "@/lib/models/ReviewAndUpdates";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch reviews for a specific update
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const updateId = searchParams.get("updateId");
    const reviewId = searchParams.get("reviewId");

    if (!documentId || !updateId) {
      return NextResponse.json(
        { message: "Document ID and Update ID are required" },
        { status: 400 }
      );
    }

    const document = await ReviewAndUpdates.findById(documentId);

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    const update = document.updates.id(updateId);

    if (!update) {
      return NextResponse.json(
        { message: "Update not found" },
        { status: 404 }
      );
    }

    if (reviewId) {
      // Get specific review
      const review = update.reviews.id(reviewId);
      if (!review) {
        return NextResponse.json(
          { message: "Review not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(review, { status: 200 });
    }

    // Return all reviews for the update
    return NextResponse.json(update.reviews, { status: 200 });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch reviews",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
};

// POST: Add a new review to an update
export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const updateId = searchParams.get("updateId");

    if (!documentId || !updateId) {
      return NextResponse.json(
        { message: "Document ID and Update ID are required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (!body.userId || !body.firstName || !body.lastName || !body.review) {
      return NextResponse.json(
        { message: "Missing required review fields" },
        { status: 400 }
      );
    }

    const document = await ReviewAndUpdates.findById(documentId);

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    const update = document.updates.id(updateId);

    if (!update) {
      return NextResponse.json(
        { message: "Update not found" },
        { status: 404 }
      );
    }

    // Add new review
    update.reviews.push(body);
    await document.save();

    return NextResponse.json(
      {
        message: "Review added successfully",
        data: update.reviews[update.reviews.length - 1],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding review:", error);
    return NextResponse.json(
      {
        message: "Failed to add review",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
};

// PUT: Update an existing review
export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const updateId = searchParams.get("updateId");
    const reviewId = searchParams.get("reviewId");

    if (!documentId || !updateId || !reviewId) {
      return NextResponse.json(
        { message: "Document ID, Update ID, and Review ID are required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    const document = await ReviewAndUpdates.findOne({
      _id: documentId,
      "updates._id": updateId,
      "updates.reviews._id": reviewId
    });

    if (!document) {
      return NextResponse.json(
        { message: "Document, Update, or Review not found" },
        { status: 404 }
      );
    }

    // Update the specific review using MongoDB's positional operators
    const updatedDocument = await ReviewAndUpdates.findOneAndUpdate(
      {
        _id: documentId,
        "updates._id": updateId,
        "updates.reviews._id": reviewId
      },
      {
        $set: {
          "updates.$[updateElem].reviews.$[reviewElem]": {
            ...body,
            _id: reviewId
          }
        }
      },
      {
        arrayFilters: [
          { "updateElem._id": updateId },
          { "reviewElem._id": reviewId }
        ],
        new: true,
        runValidators: true
      }
    );

    if (!updatedDocument) {
      return NextResponse.json(
        { message: "Failed to update review" },
        { status: 500 }
      );
    }

    // Find the updated review to return it
    const update = updatedDocument.updates.id(updateId);
    const review = update?.reviews.id(reviewId);

    return NextResponse.json(
      {
        message: "Review updated successfully",
        data: review
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      {
        message: "Failed to update review",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
};

// DELETE: Remove a review
export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const updateId = searchParams.get("updateId");
    const reviewId = searchParams.get("reviewId");

    if (!documentId || !updateId || !reviewId) {
      return NextResponse.json(
        { message: "Document ID, Update ID, and Review ID are required" },
        { status: 400 }
      );
    }

    const updatedDocument = await ReviewAndUpdates.findOneAndUpdate(
      {
        _id: documentId,
        "updates._id": updateId
      },
      {
        $pull: {
          "updates.$[updateElem].reviews": { _id: reviewId }
        }
      },
      {
        arrayFilters: [{ "updateElem._id": updateId }],
        new: true
      }
    );

    if (!updatedDocument) {
      return NextResponse.json(
        { message: "Document, Update, or Review not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Review deleted successfully",
        data: updatedDocument
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      {
        message: "Failed to delete review",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
};