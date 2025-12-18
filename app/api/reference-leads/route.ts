import connect from "@/lib/db";
import { ReferenceLeads } from "@/lib/models/ReferencedLeads";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: Request | NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { message: "clientId is required" },
        { status: 400 }
      );
    }

    // Fetch reference leads based on clientId
    const referenceLeads = await ReferenceLeads.find({ clientId });

    if (referenceLeads.length === 0) {
      return NextResponse.json(
        { message: "No reference leads found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Reference leads fetched successfully",
        referenceLeads,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json(
        { message: "Unknown error occurred" },
        { status: 500 }
      );
    }
  }
};

export const POST = async (req: Request | NextRequest) => {
  try {
    await connect();

    // Extract clientId from query parameters
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { message: "clientId is required" },
        { status: 400 }
      );
    }

    // Extract data from request body
    const { referenceCustomer, leads } = await req.json();

    // Validate required data
    if (!referenceCustomer || !leads || !referenceCustomer.contactNumber) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    // Check if reference customer already exists for this clientId
    const existingReference = await ReferenceLeads.findOne({
      clientId,
      "referenceCustomer.contactNumber": referenceCustomer.contactNumber,
    });

    if (existingReference) {
      // Add new leads to existing reference customer
      const updatedLeads = [...existingReference.leads, ...leads];

      const updated = await ReferenceLeads.findByIdAndUpdate(
        existingReference._id,
        { leads: updatedLeads },
        { new: true }
      );

      return NextResponse.json(
        {
          message: "Leads added to existing reference customer",
          customerId: updated.referenceCustomer.id,
        },
        { status: 200 }
      );
    } else {
      // Create new reference customer with leads
      const newReferenceLeads = new ReferenceLeads({
        clientId, // Add clientId from query parameter
        referenceCustomer,
        leads,
      });

      const savedReference = await newReferenceLeads.save();

      return NextResponse.json(
        {
          message: "Reference leads created successfully",
          customerId: savedReference.referenceCustomer.id,
        },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json(
        { message: "Unknown error occurred" },
        { status: 500 }
      );
    }
  }
};

export const DELETE = async (req: Request | NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const referenceCustomerId = searchParams.get("referenceCustomerId");
    const leadId = searchParams.get("leadId");

    if (!referenceCustomerId && !leadId) {
      return NextResponse.json(
        {
          message: "referenceCustomerId or leadId are required",
        },
        { status: 400 }
      );
    }

    if (leadId) {
      const deletedLead = await ReferenceLeads.updateMany(
        { "leads.id": leadId },
        { $pull: { leads: { id: leadId } } }
      );

      if (deletedLead.modifiedCount > 0) {
        return NextResponse.json(
          { message: "Lead deleted successfully", deletedLead },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: "No Lead found to delete" },
          { status: 404 }
        );
      }
    }

    if (referenceCustomerId) {
      const deletedReferenceLeads =
        await ReferenceLeads.findByIdAndDelete(referenceCustomerId);

      if (deletedReferenceLeads) {
        return NextResponse.json(
          {
            message: "Reference leads deleted successfully",
            deletedReferenceLeads,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: "No reference leads found to delete" },
          { status: 404 }
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        {
          error: "Unknown error",
        },
        { status: 500 }
      );
    }
  }
};

export const PUT = async (req: Request | NextRequest) => {
  try {
    await connect();

    const { referenceCustomerId, leads } = await req.json();

    if (!referenceCustomerId || !leads) {
      return new Response("Invalid data", { status: 400 });
    }

    const updatedReferenceLeads = await ReferenceLeads.findOneAndUpdate(
      { "referenceCustomer.id": referenceCustomerId },
      { leads },
      { new: true }
    );

    if (updatedReferenceLeads) {
      return NextResponse.json(
        {
          message: "Reference leads updated successfully",
          updatedReferenceLeads,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "No Reference Lead found to update" },
        { status: 404 }
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        {
          message: "unknown error",
        },
        { status: 500 }
      );
    }
  }
};
