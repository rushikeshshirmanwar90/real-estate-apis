import connect from "@/lib/db";
import { ReviewAndUpdates } from "@/lib/models/ReviewAndUpdates";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const sectionId = searchParams.get("sectionId");

    let data;

    if (id) data = await ReviewAndUpdates.findById(id);
    else if (sectionId) data = await ReviewAndUpdates.findOne({ sectionId });
    else data = await ReviewAndUpdates.find();

    if (!data) {
      return NextResponse.json(
        {
          message: "can't able to find the updates",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch documents",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();

    if (!body.updateSectionType || !body.sectionId || !body.name) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingDocument = await ReviewAndUpdates.findOne({
      updateSectionType: body.updateSectionType,
      sectionId: body.sectionId,
    });

    if (existingDocument) {
      // If document exists and updates are provided, push new updates
      if (body.updates && body.updates.length > 0) {
        existingDocument.updates.push(...body.updates);

        // Save the updated document
        const savedDocument = await existingDocument.save();
        return NextResponse.json(
          {
            message: "Updates added to existing document",
            data: savedDocument,
            isNewDocument: false,
          },
          { status: 200 }
        );
      } else {
        // If no updates provided, return the existing document
        return NextResponse.json(
          {
            message: "Document already exists",
            data: existingDocument,
            isNewDocument: false,
          },
          { status: 200 }
        );
      }
    }

    // If no existing document, create a new one
    const newReviewAndUpdate = new ReviewAndUpdates({
      updateSectionType: body.updateSectionType,
      sectionId: body.sectionId,
      name: body.name,
      updates: body.updates || [],
    });

    const savedDocument = await newReviewAndUpdate.save();
    return NextResponse.json(
      {
        message: "New document created successfully",
        data: savedDocument,
        isNewDocument: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      {
        message: "Failed to process document",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const updateId = searchParams.get("updateId");

    if (!documentId) {
      return NextResponse.json(
        { message: "Document ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (!updateId) {
      const updatedDocument = await ReviewAndUpdates.findByIdAndUpdate(
        documentId,
        body,
        { new: true, runValidators: true }
      );

      if (!updatedDocument) {
        return NextResponse.json(
          { message: "Document not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message: "Document updated successfully",
          data: updatedDocument,
        },
        { status: 200 }
      );
    }

    const updatedDocument = await ReviewAndUpdates.findOneAndUpdate(
      {
        _id: documentId,
        "updates._id": updateId,
      },
      {
        $set: {
          "updates.$": {
            ...body,
            _id: updateId,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedDocument) {
      return NextResponse.json(
        { message: "Update not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Update modified successfully",
        data: updatedDocument,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating document/update:", error);
    return NextResponse.json(
      {
        message: "Failed to update",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const updateId = searchParams.get("updateId");

    if (!documentId) {
      return NextResponse.json(
        { message: "Document ID is required" },
        { status: 400 }
      );
    }

    if (!updateId) {
      const deletedDocument =
        await ReviewAndUpdates.findByIdAndDelete(documentId);

      if (!deletedDocument) {
        return NextResponse.json(
          { message: "Document not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message: "Document deleted successfully",
          data: deletedDocument,
        },
        { status: 200 }
      );
    }

    const updatedDocument = await ReviewAndUpdates.findByIdAndUpdate(
      documentId,
      {
        $pull: {
          updates: { _id: updateId },
        },
      },
      {
        new: true,
      }
    );

    if (!updatedDocument) {
      return NextResponse.json(
        { message: "Document or Update not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Update deleted successfully",
        data: updatedDocument,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting document/update:", error);
    return NextResponse.json(
      {
        message: "Failed to delete",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
};
