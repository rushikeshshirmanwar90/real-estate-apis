import { OtherSection } from "@/lib/models/OtherSection";
import { MiniSection } from "@/lib/models/MiniSection";
import { projectAccessError, recordAccessError } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";
import { checkValidClient, authStatus, type Session } from "@/lib/auth";
import connect from "@/lib/db";
import { ConstructionTracker } from "@/lib/models/Xsite/construction-tracker";
import { buildPhase, buildPhases, recalculatePhases, SLAB_WORK_SUB_PHASES } from "@/lib/utils/constructionTracker";

export const GET = async (req: NextRequest) => {
  let session: Session;
  try {
    session = await checkValidClient(req, ["user", "superadmin"]);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: authStatus(error) }
    );
  }

  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const miniSectionId = searchParams.get("miniSectionId");
    const projectId = searchParams.get("projectId");
    const sectionName = searchParams.get("sectionName");
    const denied = projectId
      ? await projectAccessError(session, projectId)
      : await recordAccessError(session, [MiniSection, OtherSection], miniSectionId);
    if (denied) return denied;

    if (!miniSectionId && (!projectId || !sectionName)) {
      return NextResponse.json(
        { success: false, message: "Either miniSectionId or both projectId and sectionName are required" },
        { status: 400 }
      );
    }

    if (miniSectionId) {
      const tracker = await ConstructionTracker.findOne({ miniSectionId: String(miniSectionId) }).lean();

      if (!tracker) {
        return NextResponse.json(
          { success: false, message: "Construction tracker not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: true, message: "Construction tracker fetched successfully", data: tracker },
        { status: 200 }
      );
    } else {
      // Fetch all trackers for this project and section
      const trackers = await ConstructionTracker.find({
        projectId: String(projectId),
        sectionName: String(sectionName),
      }).lean();

      return NextResponse.json(
        { success: true, message: "Construction trackers fetched successfully", data: trackers },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("❌ construction-tracker GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// Idempotent "ensure" endpoint: finds-or-creates the tracker for this exact mini-section,
// building its phases from the slabwork.md template (keyed off sectionName) on first
// creation. Each mini-section gets its own independent copy — never shared with siblings.
export const POST = async (req: NextRequest) => {
  let session: Session;
  try {
    session = await checkValidClient(req, ["user", "superadmin"]);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: authStatus(error) }
    );
  }

  try {
    await connect();

    const body = await req.json();
    const { projectName, sectionName } = body || {};
    // Always coerce ids to plain strings — a mismatched BSON type at write time would
    // create a second, unreachable tracker doc for the same mini-section.
    const miniSectionId = body?.miniSectionId !== undefined && body?.miniSectionId !== null ? String(body.miniSectionId) : undefined;
    const projectId = body?.projectId !== undefined && body?.projectId !== null ? String(body.projectId) : undefined;
    const denied = (await projectAccessError(session, projectId))
      ?? (await recordAccessError(session, [MiniSection, OtherSection], miniSectionId));
    if (denied) return denied;

    if (!miniSectionId || !projectId || !projectName || !sectionName) {
      return NextResponse.json(
        { success: false, message: "miniSectionId, projectId, projectName and sectionName are required" },
        { status: 400 }
      );
    }

    let tracker = await ConstructionTracker.findOne({ miniSectionId });

    if (!tracker) {
      try {
        tracker = await ConstructionTracker.create({
          miniSectionId,
          projectId,
          projectName,
          sectionName,
          overallProgress: 0,
          phases: buildPhases(sectionName),
        });
      } catch (createError: any) {
        // Two near-simultaneous creates for the same mini-section — re-fetch the winner.
        if (createError?.code === 11000) {
          tracker = await ConstructionTracker.findOne({ miniSectionId });
        } else {
          throw createError;
        }
      }
    }

    if (!tracker) {
      return NextResponse.json(
        { success: false, message: "Failed to create or load construction tracker" },
        { status: 500 }
      );
    }

    tracker.overallProgress = recalculatePhases(tracker.phases as any[]);
    await tracker.save();

    return NextResponse.json(
      { success: true, message: "Construction tracker ready", data: tracker },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ construction-tracker POST error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create or update construction tracker",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// Appends a single new phase to an existing tracker.
// body: { miniSectionId, phaseName }
export const PUT = async (req: NextRequest) => {
  let session: Session;
  try {
    session = await checkValidClient(req, ["user", "superadmin"]);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: authStatus(error) }
    );
  }

  try {
    await connect();

    const body = await req.json();
    const miniSectionId = body?.miniSectionId !== undefined ? String(body.miniSectionId) : undefined;
    const phaseName: string | undefined = body?.phaseName;
    const denied = await recordAccessError(session, [MiniSection, OtherSection, ConstructionTracker], miniSectionId);
    if (denied) return denied;

    if (!miniSectionId || !phaseName?.trim()) {
      return NextResponse.json(
        { success: false, message: "miniSectionId and phaseName are required" },
        { status: 400 }
      );
    }

    const tracker = await ConstructionTracker.findOne({ miniSectionId });
    if (!tracker) {
      return NextResponse.json(
        { success: false, message: "Construction tracker not found" },
        { status: 404 }
      );
    }

    const nextOrder = tracker.phases.length;
    const newPhase = buildPhase(phaseName.trim(), nextOrder);
    if (phaseName.trim().toLowerCase() === "slab work") {
      (newPhase as any).subPhases = SLAB_WORK_SUB_PHASES.map((spName) => ({
        name: spName, progress: 0, status: "NOT_STARTED",
      }));
    }

    tracker.phases.push(newPhase as any);
    tracker.overallProgress = recalculatePhases(tracker.phases as any[]);
    await tracker.save();

    return NextResponse.json(
      { success: true, message: "Phase added successfully", data: tracker },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ construction-tracker PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to add phase",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
