import { NextRequest, NextResponse } from "next/server";
import { checkValidClient } from "@/lib/auth";
import { authErrorResponse } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { planImport } from "@/lib/services/materialImport";
import {
  applyImport,
  listImports,
  loadProjectContext,
  undoImport,
  UndoBlockedError,
} from "@/lib/services/materialImportStore";
import { logger } from "@/lib/utils/logger";

// Super-admin Excel material import.
//   POST   { projectId, fileName, purchases, usages, dryRun }  → preview (dryRun) or import
//   GET    ?projectId=                                         → import history
//   DELETE ?id=                                                → undo an import

const auth = async (req: NextRequest) => {
  try {
    const session = await checkValidClient(req, ["superadmin"]);
    return { email: session.kind === "superadmin" ? session.email : "super-admin" };
  } catch (error) {
    return { response: authErrorResponse(error) };
  }
};

export const POST = async (req: NextRequest) => {
  const caller = await auth(req);
  if ("response" in caller) return caller.response;

  try {
    const body = await req.json();
    const { projectId, purchases, usages, dryRun } = body ?? {};
    const fileName = typeof body?.fileName === "string" ? body.fileName.slice(0, 200) : "";

    if (!Array.isArray(purchases) || (usages !== undefined && !Array.isArray(usages))) {
      return errorResponse("purchases (and usages, if sent) must be lists of rows", 400);
    }

    const ctx = await loadProjectContext(String(projectId || ""));
    if (!ctx) return errorResponse("Project not found", 404);

    const plan = planImport({
      purchases,
      usages: usages ?? [],
      sections: ctx.sections,
      miniSections: ctx.miniSections,
    });

    const preview = { errors: plan.errors, summary: plan.summary, canImport: plan.errors.length === 0 };
    if (dryRun) {
      // Preview: nothing is saved
      return successResponse(preview, plan.errors.length ? "Fix the errors and upload again" : "Ready to import");
    }
    if (plan.errors.length > 0) {
      return NextResponse.json(
        { success: false, message: "The file has errors. Nothing was imported.", data: preview },
        { status: 422 }
      );
    }

    const record = await applyImport(ctx, plan, fileName, caller.email);
    logger.info("Material import applied", {
      importId: String(record._id),
      projectId: ctx.projectId,
      purchases: plan.summary.purchaseRows,
      usages: plan.summary.usageRows,
    });
    return successResponse({ import: record, summary: plan.summary }, "Materials imported", 201);
  } catch (error) {
    console.error("❌ material-import POST error:", error);
    return errorResponse("Import failed. Nothing was imported.", 500);
  }
};

export const GET = async (req: NextRequest) => {
  const caller = await auth(req);
  if ("response" in caller) return caller.response;

  try {
    const projectId = new URL(req.url).searchParams.get("projectId") || "";
    if (!projectId) return errorResponse("projectId is required", 400);
    return successResponse(await listImports(projectId));
  } catch (error) {
    console.error("❌ material-import GET error:", error);
    return errorResponse("Failed to load import history", 500);
  }
};

export const DELETE = async (req: NextRequest) => {
  const caller = await auth(req);
  if ("response" in caller) return caller.response;

  try {
    const id = new URL(req.url).searchParams.get("id") || "";
    const result = await undoImport(id);
    if (!result) return errorResponse("Import not found or already undone", 404);
    logger.info("Material import undone", { importId: id, by: caller.email });
    return successResponse(result, "Import undone");
  } catch (error) {
    if (error instanceof UndoBlockedError) return errorResponse(error.message, 409);
    console.error("❌ material-import DELETE error:", error);
    return errorResponse("Undo failed", 500);
  }
};
