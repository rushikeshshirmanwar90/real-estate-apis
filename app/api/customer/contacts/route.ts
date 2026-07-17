import connect from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { CustomerContacts } from "@/lib/models/CustomerContacts";
import { Customer } from "@/lib/models/users/Customer";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { checkValidClient } from "@/lib/auth";

/**
 * Shape of a single contact entry sent by the mobile app.
 */
interface RawContact {
  name?: string;
  phoneNumbers?: unknown;
  emails?: unknown;
}

/**
 * Normalize the raw contacts payload from the app into a clean, storable shape.
 * - phone numbers / emails are coerced to string arrays with blanks removed
 * - entries with neither a name nor a phone number are dropped
 */
const normalizeContacts = (input: unknown) => {
  if (!Array.isArray(input)) return [];

  return input
    .map((c: RawContact) => {
      const name = typeof c?.name === "string" ? c.name.trim() : "";

      const phoneNumbers = Array.isArray(c?.phoneNumbers)
        ? c.phoneNumbers
            .map((p) => (typeof p === "string" ? p.trim() : String(p ?? "").trim()))
            .filter((p) => p !== "")
        : [];

      const emails = Array.isArray(c?.emails)
        ? c.emails
            .map((e) => (typeof e === "string" ? e.trim() : String(e ?? "").trim()))
            .filter((e) => e !== "")
        : [];

      return { name, phoneNumbers, emails };
    })
    .filter((c) => c.name !== "" || c.phoneNumbers.length > 0);
};

/**
 * POST /api/customer/contacts
 * Called by the Shivai mobile app after a customer grants contacts permission.
 * Upserts ONE document per customer (keyed by customerId) so re-syncing simply
 * replaces the previous snapshot.
 *
 * Body: { customerId, customerName?, customerMobile?, contacts: [{ name, phoneNumbers[], emails[] }] }
 */
export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();

    let body: {
      customerId?: string;
      customerName?: string;
      customerMobile?: string;
      contacts?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { customerId, customerName, customerMobile } = body || {};

    if (!customerId || typeof customerId !== "string") {
      return errorResponse("customerId is required", 400);
    }

    const contacts = normalizeContacts(body?.contacts);

    // Best-effort: derive the client (tenant) the customer belongs to so the
    // admin panel can scope contacts. Failure here must NOT block the sync.
    let clientId: unknown = undefined;
    if (isValidObjectId(customerId)) {
      try {
        const customer = await Customer.findById(customerId).select("clientId").lean();
        if (customer && (customer as { clientId?: unknown }).clientId) {
          clientId = (customer as { clientId?: unknown }).clientId;
        }
      } catch (lookupError) {
        logger.warn("Could not resolve clientId for customer contacts", {
          customerId,
          error: lookupError,
        });
      }
    }

    const update: Record<string, unknown> = {
      customerName: typeof customerName === "string" ? customerName : "",
      customerMobile: typeof customerMobile === "string" ? customerMobile : "",
      contacts,
      contactCount: contacts.length,
      syncedAt: new Date(),
    };
    if (clientId) {
      update.clientId = clientId;
    }

    const saved = await CustomerContacts.findOneAndUpdate(
      { customerId },
      { $set: update, $setOnInsert: { customerId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return successResponse(
      saved,
      `Synced ${contacts.length} contact(s) successfully`,
      200
    );
  } catch (error: unknown) {
    logger.error("Error syncing customer contacts", error);
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: string }).name === "ValidationError"
    ) {
      return errorResponse("Validation failed", 400, error);
    }
    return errorResponse("Unable to sync contacts", 500);
  }
};

/**
 * GET /api/customer/contacts
 * Used by the Shivai admin panel to list every customer's synced phone book.
 * Optional query param `clientId` scopes the results to a single tenant.
 */
export const GET = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (clientId && !isValidObjectId(clientId)) {
      return errorResponse("Invalid client ID format", 400);
    }

    const filter = clientId ? { clientId } : {};

    const records = await CustomerContacts.find(filter)
      .sort({ syncedAt: -1 })
      .lean();

    return successResponse(
      records,
      `Retrieved ${records.length} customer contact record(s) successfully`
    );
  } catch (error: unknown) {
    logger.error("Error retrieving customer contacts", error);
    return errorResponse("Unable to retrieve contacts", 500);
  }
};
