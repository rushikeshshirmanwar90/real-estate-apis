import { NextRequest } from "next/server";
import { checkValidClient } from "@/lib/auth";
import { authErrorResponse } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { loadProjectContext } from "@/lib/services/materialImportStore";

// GET /api/super-admin/material-import/context?projectId=
// What the Excel template needs: project name, sections, mini-sections, units.
export const GET = async (req: NextRequest) => {
  try {
    await checkValidClient(req, ["superadmin"]);
  } catch (error) {
    return authErrorResponse(error);
  }

  try {
    const projectId = new URL(req.url).searchParams.get("projectId") || "";
    const ctx = await loadProjectContext(projectId);
    if (!ctx) return errorResponse("Project not found", 404);
    return successResponse(ctx);
  } catch (error) {
    console.error("❌ material-import context error:", error);
    return errorResponse("Failed to load project details", 500);
  }
};
