// Database side of the super-admin Excel material import (see materialImport.ts for the rules).
import { Types } from "mongoose";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { MiniSection } from "@/lib/models/Xsite/mini-section";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { MaterialImport } from "@/lib/models/Xsite/MaterialImport";
import { safeRedisDelCache, safeRedisKeysCache } from "@/lib/utils/redis-helpers";
import { logger } from "@/lib/utils/logger";
import type { ImportPlan, MiniSectionInfo, SectionInfo } from "@/lib/services/materialImport";

const IMPORT_USER = {
  userId: "super-admin",
  fullName: "Super Admin (Excel import)",
  userType: "admin",
};

export interface ProjectContext {
  projectId: string;
  projectName: string;
  clientId: string;
  sections: SectionInfo[];
  miniSections: MiniSectionInfo[];
  units: string[];
}

/** Project, its sections and mini-sections, and the units already used — or null if not found. */
export const loadProjectContext = async (projectId: string): Promise<ProjectContext | null> => {
  if (!Types.ObjectId.isValid(projectId)) return null;
  await connect();

  const project = (await Projects.findById(projectId)
    .select("name clientId section MaterialAvailable.unit MaterialUsed.unit")
    .lean()) as any;
  if (!project) return null;

  const sections: SectionInfo[] = (project.section ?? [])
    .map((s: any) => ({
      sectionId: String(s.sectionId || s._id),
      name: String(s.name || "").trim(),
      type: s.type,
    }))
    .filter((s: SectionInfo) => s.name);

  // Two mini-section document shapes exist in the collection; read both, unconverted
  const docs = await MiniSection.collection
    .find(
      { $or: [{ "projectDetails.projectId": projectId }, { projectId }] },
      { projection: { name: 1, sectionId: 1, "mainSectionDetails.sectionId": 1 } }
    )
    .toArray();
  const miniSections: MiniSectionInfo[] = docs
    .map((d: any) => ({
      id: String(d._id),
      name: String(d.name || "").trim(),
      sectionId: String(d.mainSectionDetails?.sectionId || d.sectionId || ""),
    }))
    .filter((m) => m.name && m.sectionId);

  const units = new Set<string>(["bags", "kg", "ton", "pieces", "meter", "sq ft", "cubic ft", "liters", "sheets", "nos"]);
  for (const m of [...(project.MaterialAvailable ?? []), ...(project.MaterialUsed ?? [])]) {
    if (m?.unit) units.add(String(m.unit).trim());
  }

  return {
    projectId: String(project._id),
    projectName: project.name,
    clientId: String(project.clientId),
    sections,
    miniSections,
    units: [...units].sort((a, b) => a.localeCompare(b)),
  };
};

const clearCaches = async (projectId: string, clientId: string) => {
  try {
    for (const pattern of [`material:${projectId}*`, `materialActivity:*`, `projects:${clientId}*`, `project:${projectId}*`]) {
      const keys = await safeRedisKeysCache(pattern);
      if (keys.length) await safeRedisDelCache(...keys);
    }
  } catch (error) {
    logger.warn("Cache clear after material import failed (non-fatal)", { error: String(error) });
  }
};

/** Writes a validated plan to the project. Returns the import record. */
export const applyImport = async (ctx: ProjectContext, plan: ImportPlan, fileName: string, importedBy: string) => {
  const stock = plan.available.map((a) => ({ ...a, _id: new Types.ObjectId() }));
  const record = await MaterialImport.create({
    projectId: ctx.projectId,
    clientId: ctx.clientId,
    projectName: ctx.projectName,
    fileName,
    importedBy,
    purchaseCount: plan.summary.purchaseRows,
    usageCount: plan.summary.usageRows,
    totalCost: plan.summary.totalPurchaseCost,
    status: "applied",
    stock: stock.map((a) => ({ id: String(a._id), qnt: a.qnt })),
  });
  const importId = String(record._id);

  try {
    await Projects.updateOne(
      { _id: new Types.ObjectId(ctx.projectId) },
      {
        $push: {
          MaterialAvailable: { $each: stock.map((a) => ({ ...a, importId })) },
          MaterialUsed: { $each: plan.used.map((u) => ({ _id: new Types.ObjectId(), ...stripNames(u), importId })) },
        },
        $inc: { spent: plan.summary.totalPurchaseCost },
      }
    );
  } catch (error) {
    await MaterialImport.deleteOne({ _id: record._id });
    throw error;
  }

  // Activity feed: one "imported" entry, one "used" entry per section / mini-section.
  // Created directly (no push notifications for a bulk import).
  try {
    const date = new Date().toISOString();
    const base = {
      user: IMPORT_USER,
      clientId: ctx.clientId,
      projectId: ctx.projectId,
      projectName: ctx.projectName,
      date,
      importId,
    };
    const activities: any[] = [
      {
        ...base,
        activity: "imported",
        message: `Imported ${plan.purchases.length} material purchase${plan.purchases.length === 1 ? "" : "s"} from Excel${fileName ? ` (${fileName})` : ""}`,
        materials: plan.purchases.map(({ row: _row, remaining: _remaining, ...p }) => ({ ...p, cost: p.totalCost, importId })),
      },
    ];
    const groups = new Map<string, typeof plan.used>();
    for (const u of plan.used) {
      const key = `${u.sectionId ?? ""}|${u.miniSectionId ?? ""}`;
      groups.set(key, [...(groups.get(key) ?? []), u]);
    }
    for (const items of groups.values()) {
      const first = items[0];
      activities.push({
        ...base,
        activity: "used",
        ...(first.sectionId ? { sectionId: first.sectionId, sectionName: first.sectionName } : {}),
        ...(first.miniSectionId ? { miniSectionId: first.miniSectionId, miniSectionName: first.miniSectionName } : {}),
        message: `Usage imported from Excel${fileName ? ` (${fileName})` : ""}`,
        materials: items.map((u) => ({ ...stripNames(u), cost: u.totalCost, importId })),
      });
    }
    await MaterialActivity.insertMany(activities);
  } catch (error) {
    logger.error("Material import: activity entries failed (materials were saved)", { importId, error: String(error) });
  }

  await clearCaches(ctx.projectId, ctx.clientId);
  return record.toObject();
};

export class UndoBlockedError extends Error {}

/**
 * Removes everything an import added. Returns null if the import isn't found or already undone.
 * Throws UndoBlockedError when imported stock was used or edited in the app since,
 * because removing it would leave those app records pointing at nothing.
 */
export const undoImport = async (importId: string) => {
  if (!Types.ObjectId.isValid(importId)) return null;
  await connect();
  const record = (await MaterialImport.findOne({ _id: importId, status: "applied" }).lean()) as any;
  if (!record) return null;

  const project = (await Projects.findById(record.projectId).select("MaterialAvailable._id MaterialAvailable.qnt").lean()) as any;
  const current = new Map<string, number>(
    (project?.MaterialAvailable ?? []).map((m: any) => [String(m._id), Number(m.qnt)])
  );
  const changed = (record.stock ?? []).filter((s: any) => current.get(s.id) !== s.qnt);
  if (changed.length) {
    throw new UndoBlockedError(
      `${changed.length} imported stock item${changed.length === 1 ? " was" : "s were"} used or changed in the app after this import, so it can't be undone automatically.`
    );
  }

  await Projects.updateOne(
    { _id: new Types.ObjectId(record.projectId) },
    {
      $pull: { MaterialAvailable: { importId }, MaterialUsed: { importId } },
      $inc: { spent: -Number(record.totalCost || 0) },
    }
  );
  await MaterialActivity.deleteMany({ importId });
  await MaterialImport.updateOne({ _id: record._id }, { status: "undone", undoneAt: new Date() });
  await clearCaches(record.projectId, record.clientId);
  return { ...record, status: "undone" };
};

export const listImports = async (projectId: string) => {
  await connect();
  return MaterialImport.find({ projectId }).sort({ createdAt: -1 }).limit(50).lean();
};

// MaterialUsed / activity materials don't store section names
const stripNames = ({ sectionName: _s, miniSectionName: _m, ...rest }: ImportPlan["used"][number]) => rest;
