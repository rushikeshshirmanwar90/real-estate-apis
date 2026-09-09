import { NextRequest } from "next/server";
import { Types } from "mongoose";
import connect from "@/lib/db";
import { checkValidClient } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { PaymentCommitment } from "@/lib/models/Xsite/PaymentCommitment";
import {
  upsertCommitment,
  recommitCommitment,
  resolveCommitmentById,
} from "@/lib/services/paymentCommitmentService";

// GET /api/payment-commitment?entityType=&entityId=   (single lookup)
// GET /api/payment-commitment?commitmentId=            (single lookup by id)
// GET /api/payment-commitment?projectId=&clientId=     (list for a project)
export const GET = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }

  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const commitmentId = searchParams.get("commitmentId");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");

    if (commitmentId) {
      if (!Types.ObjectId.isValid(commitmentId)) {
        return errorResponse("Invalid commitmentId", 400);
      }
      const commitment = await PaymentCommitment.findById(commitmentId);
      if (!commitment) return errorResponse("Commitment not found", 404);
      return successResponse(commitment, "Commitment retrieved");
    }

    if (entityType && entityId) {
      if (!["material", "contractor"].includes(entityType)) {
        return errorResponse("entityType must be 'material' or 'contractor'", 400);
      }
      if (!Types.ObjectId.isValid(entityId)) {
        return errorResponse("Invalid entityId", 400);
      }
      const commitment = await PaymentCommitment.findOne({
        entityType,
        entityId,
        status: { $ne: "resolved" },
      });
      return successResponse(commitment || null, "Commitment retrieved");
    }

    if (projectId) {
      if (!Types.ObjectId.isValid(projectId)) {
        return errorResponse("Invalid projectId", 400);
      }
      const query: Record<string, unknown> = { projectId };
      if (clientId) {
        if (!Types.ObjectId.isValid(clientId)) {
          return errorResponse("Invalid clientId", 400);
        }
        query.clientId = clientId;
      }
      const commitments = await PaymentCommitment.find(query).sort({ commitmentDate: 1 });
      return successResponse(commitments, "Commitments retrieved");
    }

    return errorResponse(
      "Provide commitmentId, entityType+entityId, or projectId",
      400
    );
  } catch (error) {
    console.error("GET /api/payment-commitment error:", error);
    return errorResponse("Failed to fetch payment commitment", 500, error);
  }
};

// POST /api/payment-commitment
// Manual/backfill creation for a partial/unpaid entity that has no
// commitment yet (the normal path creates it inline from the material/
// contractor payment routes — see paymentCommitmentService.upsertCommitment).
// body: { clientId, projectId, projectName, entityType, entityId, entityLabel,
//         vendorName?, amountDue, totalCost, commitmentDate, createdBy? }
export const POST = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }

  try {
    await connect();
    const body = await req.json();
    const {
      clientId,
      projectId,
      projectName,
      entityType,
      entityId,
      entityLabel,
      vendorName,
      amountDue,
      totalCost,
      commitmentDate,
      createdBy,
    } = body || {};

    if (!clientId || !Types.ObjectId.isValid(clientId)) {
      return errorResponse("Valid clientId is required", 400);
    }
    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      return errorResponse("Valid projectId is required", 400);
    }
    if (!projectName) {
      return errorResponse("projectName is required", 400);
    }
    if (!["material", "contractor"].includes(entityType)) {
      return errorResponse("entityType must be 'material' or 'contractor'", 400);
    }
    if (!entityId || !Types.ObjectId.isValid(entityId)) {
      return errorResponse("Valid entityId is required", 400);
    }
    if (!entityLabel) {
      return errorResponse("entityLabel is required", 400);
    }
    if (amountDue === undefined || isNaN(Number(amountDue)) || Number(amountDue) < 0) {
      return errorResponse("Valid amountDue is required", 400);
    }
    if (totalCost === undefined || isNaN(Number(totalCost)) || Number(totalCost) < 0) {
      return errorResponse("Valid totalCost is required", 400);
    }
    const parsedDate = commitmentDate ? new Date(commitmentDate) : null;
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return errorResponse("Valid commitmentDate is required", 400);
    }

    const commitment = await upsertCommitment({
      clientId,
      projectId,
      projectName,
      entityType,
      entityId,
      entityLabel,
      vendorName,
      amountDue: Number(amountDue),
      totalCost: Number(totalCost),
      commitmentDate: parsedDate,
      createdBy,
    });

    return successResponse(commitment, "Commitment saved", 201);
  } catch (error) {
    console.error("POST /api/payment-commitment error:", error);
    return errorResponse("Failed to save payment commitment", 500, error);
  }
};

// PATCH /api/payment-commitment
// body: { commitmentId, action: 'recommit', newCommitmentDate }
//    or { commitmentId, action: 'resolve' }
export const PATCH = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unauthorized", 401);
  }

  try {
    await connect();
    const body = await req.json();
    const { commitmentId, action, newCommitmentDate } = body || {};

    if (!commitmentId || !Types.ObjectId.isValid(commitmentId)) {
      return errorResponse("Valid commitmentId is required", 400);
    }

    if (action === "recommit") {
      const parsedDate = newCommitmentDate ? new Date(newCommitmentDate) : null;
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return errorResponse("Valid newCommitmentDate is required", 400);
      }
      const commitment = await recommitCommitment(commitmentId, parsedDate);
      if (!commitment) return errorResponse("Commitment not found", 404);
      return successResponse(commitment, "New commitment date set");
    }

    if (action === "resolve") {
      const commitment = await resolveCommitmentById(commitmentId);
      if (!commitment) return errorResponse("Commitment not found", 404);
      return successResponse(commitment, "Commitment resolved");
    }

    return errorResponse("action must be 'recommit' or 'resolve'", 400);
  } catch (error) {
    console.error("PATCH /api/payment-commitment error:", error);
    return errorResponse("Failed to update payment commitment", 500, error);
  }
};
