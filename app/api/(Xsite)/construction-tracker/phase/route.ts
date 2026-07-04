import { NextRequest, NextResponse } from "next/server";
import { checkValidClient } from "@/lib/auth";
import connect from "@/lib/db";
import { ConstructionTracker } from "@/lib/models/Xsite/construction-tracker";
import { average, recalculatePhases, statusForProgress } from "@/lib/utils/constructionTracker";

export const PATCH = async (req: NextRequest) => {
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

    const body = await req.json();
    const { phaseId, status, progress, subPhases } = body || {};
    const miniSectionId = body?.miniSectionId !== undefined && body?.miniSectionId !== null ? String(body.miniSectionId) : undefined;

    if (!miniSectionId || !phaseId) {
      return NextResponse.json(
        { success: false, message: "miniSectionId and phaseId are required" },
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

    const phase = (tracker.phases as any).id(phaseId);

    if (!phase) {
      return NextResponse.json(
        { success: false, message: "Phase not found in construction tracker" },
        { status: 404 }
      );
    }

    if (Array.isArray(subPhases) && subPhases.length > 0) {
      for (const update of subPhases) {
        const sub = (phase.subPhases as any).id(update.id);
        if (!sub) continue;
        const newProgress = update.progress ?? sub.progress;
        sub.progress = newProgress;
        sub.status = update.status ?? statusForProgress(newProgress);
      }
      phase.progress = average(phase.subPhases.map((sp: any) => sp.progress));
      phase.status = statusForProgress(phase.progress);
    }

    if (status !== undefined) {
      phase.status = status;
    }
    if (progress !== undefined) {
      phase.progress = progress;
    }

    tracker.overallProgress = recalculatePhases(tracker.phases as any[]);
    await tracker.save();

    return NextResponse.json(
      {
        success: true,
        message: "Phase updated successfully",
        data: {
          phase,
          overallProgress: tracker.overallProgress,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ construction-tracker/phase PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update phase",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
