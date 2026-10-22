import connect from "@/lib/db";
import { checkValidClient } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest, NextResponse } from "next/server";
import { Model, Types } from "mongoose";
import { Partnership, PartnerEntry, PartnershipDoc } from "@/lib/models/Xsite/Partnership";
import { PartnershipTransaction } from "@/lib/models/Xsite/PartnershipTransaction";
import { Projects } from "@/lib/models/Project";
import * as ClientModule from "@/lib/models/super-admin/Client";
import * as StaffModule from "@/lib/models/users/Staff";
import { STAFF_PERMISSIONS } from "@/lib/models/users/Staff";
import {
  buildSummaries,
  resolveActor,
  roundMoney,
  staffDisplayName,
} from "@/lib/services/partnershipService";
import { addProjectToStaff, assignStaffToProject } from "@/lib/utils/staffProjectUtils";
import { safeRedisDelCache, safeRedisKeysCache } from "@/lib/utils/redis-helpers";

// Per-project partnerships: the business plus staff members who share a money
// pool for one project. See lib/models/Xsite/Partnership.ts.

// The fields this route reads; both models are exported untyped
interface ClientRecord {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  phoneNumber?: string | number;
}

interface TeamStaffRecord {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string | number;
  clients?: { clientId: string | Types.ObjectId }[];
  permissions?: string[];
}

const Client = ClientModule.Client as Model<ClientRecord>;
const Staff = StaffModule.Staff as Model<TeamStaffRecord>;

const MAX_AMOUNT = 1_000_000_000_000;

const unauthorized = (error: unknown) =>
  NextResponse.json(
    { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
    { status: 401 }
  );

// Blank means "nothing yet"; anything else has to be a sane, non-negative amount
const parseAmount = (raw: unknown): { ok: true; value: number } | { ok: false } => {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: 0 };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > MAX_AMOUNT) return { ok: false };
  return { ok: true, value: roundMoney(value) };
};

const parseDate = (raw: unknown): Date | null => {
  if (!raw) return new Date();
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
};

// Partners must already be on the business's team (registered staff that the
// admin added from the Staff tab).
const loadTeamStaff = async (
  clientId: string,
  staffIds: string[]
): Promise<{ ok: true; value: TeamStaffRecord[] } | { ok: false; error: string }> => {
  const staffDocs = await Staff.find({
    _id: { $in: staffIds.map((id) => new Types.ObjectId(id)) },
  })
    .select("firstName lastName email phoneNumber clients")
    .lean<TeamStaffRecord[]>();
  const byId = new Map(staffDocs.map((staff) => [String(staff._id), staff]));

  const team: TeamStaffRecord[] = [];
  for (const id of staffIds) {
    const staff = byId.get(id);
    if (!staff) return { ok: false, error: "One of the selected partners no longer exists" };
    const onTeam = (staff.clients || []).some((c) => String(c.clientId) === clientId);
    if (!onTeam) {
      return { ok: false, error: `${staffDisplayName(staff)} isn't on this business's team` };
    }
    team.push(staff);
  }
  return { ok: true, value: team };
};

const staffPartnerEntry = (staff: TeamStaffRecord): PartnerEntry => ({
  partnerId: String(staff._id),
  partnerType: "staff",
  name: staffDisplayName(staff),
  email: staff.email || undefined,
  phoneNumber: staff.phoneNumber ? String(staff.phoneNumber) : undefined,
  status: "active",
  addedAt: new Date(),
  removedAt: null,
});

const withSummary = async (partnership: PartnershipDoc, notAssigned: string[] = []) => {
  const summaries = await buildSummaries([partnership]);
  return { partnership, summary: summaries.get(String(partnership._id)) || null, notAssigned };
};

// A partner works on the project, so they're made project staff too if they
// aren't already, as the contractor flow does, and given every staff
// permission. That gives them the project's material and cost screens.
// Returns the names that couldn't be assigned.
const assignPartnersToProject = async (
  staff: TeamStaffRecord[],
  projectId: string,
  clientId: string,
  clientName: string
): Promise<string[]> => {
  const project = await Projects.findById(projectId)
    .select("name assignedStaff")
    .lean<{ name: string; assignedStaff?: { _id: string }[] }>();
  if (!project) return staff.map(staffDisplayName);

  const notAssigned: string[] = [];
  for (const member of staff) {
    const staffId = String(member._id);
    try {
      const onProject = (project.assignedStaff || []).some((s) => String(s._id) === staffId);
      if (onProject) {
        // Already on the project's list; make sure their own record has it too (no-op if so)
        await addProjectToStaff(staffId, projectId, project.name, clientId, clientName);
      } else {
        await assignStaffToProject(staffId, projectId, project.name, clientId, clientName);
      }
      // Added to whatever they already have, so nothing is taken away
      await Staff.updateOne(
        { _id: member._id },
        { $addToSet: { permissions: { $each: STAFF_PERMISSIONS } } }
      );
    } catch (error) {
      console.error(`⚠️ Couldn't assign partner ${staffId} to project ${projectId}:`, error);
      notAssigned.push(staffDisplayName(member));
    }
  }

  // Staff lists and the project are cached; drop them so the new assignment shows
  try {
    const staffKeys = await safeRedisKeysCache("staff:*");
    if (staffKeys.length > 0) await safeRedisDelCache(...staffKeys);
    await safeRedisDelCache(`project:${projectId}`);
  } catch (cacheError) {
    console.error("⚠️ Cache invalidation error (non-critical):", cacheError);
  }

  return notAssigned;
};

// GET /api/partnership
//   ?projectId=  → that project's partnership (or null) with its summary
//   ?partnerId=  → active partnerships this staff member is an active partner in
//   ?clientId=   → every partnership of the business
export const GET = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return unauthorized(error);
  }

  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const partnerId = searchParams.get("partnerId");
    const clientId = searchParams.get("clientId");

    if (projectId) {
      if (!Types.ObjectId.isValid(projectId)) return errorResponse("Invalid project ID", 400);
      const partnership = await Partnership.findOne({
        projectId: new Types.ObjectId(projectId),
      }).lean<PartnershipDoc>();
      if (!partnership) return successResponse({ partnership: null, summary: null });
      return successResponse(await withSummary(partnership));
    }

    let partnerships: PartnershipDoc[] = [];
    if (partnerId) {
      partnerships = await Partnership.find({
        status: "active",
        partners: { $elemMatch: { partnerId, status: "active" } },
      })
        .sort({ updatedAt: -1 })
        .lean<PartnershipDoc[]>();
    } else if (clientId) {
      if (!Types.ObjectId.isValid(clientId)) return errorResponse("Invalid client ID", 400);
      partnerships = await Partnership.find({ clientId: new Types.ObjectId(clientId) })
        .sort({ status: 1, updatedAt: -1 })
        .lean<PartnershipDoc[]>();
    } else {
      return errorResponse("projectId, partnerId or clientId is required", 400);
    }

    const summaries = await buildSummaries(partnerships);
    return successResponse(
      partnerships.map((partnership) => ({
        partnership,
        summary: summaries.get(String(partnership._id)) || null,
      }))
    );
  } catch (error) {
    console.error("GET /api/partnership error:", error);
    return errorResponse("Failed to load partnerships", 500, error);
  }
};

// POST /api/partnership — start a partnership for a project
// body: {
//   clientId, projectId,
//   partners: [{ staffId, initialAmount? }],   // at least one staff partner
//   ownerInitialAmount?,                        // what the business puts in
//   date?, recordedBy?
// }
export const POST = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return unauthorized(error);
  }

  try {
    await connect();
    const body = await req.json();
    const clientId = String(body?.clientId || "");
    const projectId = String(body?.projectId || "");

    if (!Types.ObjectId.isValid(clientId)) return errorResponse("Valid clientId is required", 400);
    if (!Types.ObjectId.isValid(projectId)) return errorResponse("Valid projectId is required", 400);

    const staffInputs: Array<{ staffId?: unknown; initialAmount?: unknown }> =
      Array.isArray(body?.partners) ? body.partners : [];
    if (staffInputs.length === 0) return errorResponse("Add at least one partner", 400);

    const staffIds = staffInputs.map((p) => String(p?.staffId || ""));
    if (staffIds.some((id) => !Types.ObjectId.isValid(id))) {
      return errorResponse("Each partner needs a valid staffId", 400);
    }
    if (new Set(staffIds).size !== staffIds.length) {
      return errorResponse("The same person was added twice", 400);
    }

    const ownerAmount = parseAmount(body?.ownerInitialAmount);
    const staffAmounts = staffInputs.map((p) => parseAmount(p?.initialAmount));
    if (!ownerAmount.ok || staffAmounts.some((a) => !a.ok)) {
      return errorResponse("Initial amounts must be zero or more", 400);
    }
    const date = parseDate(body?.date);
    if (!date) return errorResponse("date must be a valid date", 400);

    const project = await Projects.findOne({
      _id: new Types.ObjectId(projectId),
      clientId: new Types.ObjectId(clientId),
    })
      .select("name")
      .lean<{ _id: Types.ObjectId; name: string }>();
    if (!project) return errorResponse("Project not found for this business", 404);

    const existing = await Partnership.exists({ projectId: project._id });
    if (existing) return errorResponse("This project already has a partnership", 409);

    const client = await Client.findById(clientId).select("name email phoneNumber").lean<ClientRecord>();
    if (!client) return errorResponse("Business not found", 404);

    const team = await loadTeamStaff(clientId, staffIds);
    if (!team.ok) return errorResponse(team.error, 400);

    const actor = resolveActor(req, body);
    const owner: PartnerEntry = {
      partnerId: clientId,
      partnerType: "owner",
      name: client.name || "Business",
      email: client.email || undefined,
      phoneNumber: client.phoneNumber ? String(client.phoneNumber) : undefined,
      status: "active",
      addedAt: new Date(),
      removedAt: null,
    };
    const staffPartners = team.value.map(staffPartnerEntry);

    const created = await Partnership.create({
      clientId: new Types.ObjectId(clientId),
      projectId: project._id,
      projectName: project.name,
      partners: [owner, ...staffPartners],
      status: "active",
      createdBy: actor,
    }).catch((error: { code?: number }) => {
      // The unique projectId index catches two admins starting one at once
      if (error?.code === 11000) return null;
      throw error;
    });
    if (!created) return errorResponse("This project already has a partnership", 409);

    const initialLines = [
      { partner: owner, amount: ownerAmount.ok ? ownerAmount.value : 0 },
      ...staffPartners.map((partner, i) => {
        const amount = staffAmounts[i];
        return { partner, amount: amount.ok ? amount.value : 0 };
      }),
    ]
      .filter((line) => line.amount > 0)
      .map((line) => ({
        partnershipId: created._id,
        clientId: created.clientId,
        projectId: created.projectId,
        kind: "contribution",
        category: "initial",
        amount: line.amount,
        paidFrom: "partner",
        partnerId: line.partner.partnerId,
        partnerName: line.partner.name,
        description: "Initial amount",
        date,
        recordedBy: actor,
      }));

    if (initialLines.length > 0) {
      try {
        await PartnershipTransaction.insertMany(initialLines);
      } catch (error) {
        // Don't leave a partnership behind whose opening balances are missing
        await Partnership.deleteOne({ _id: created._id });
        throw error;
      }
    }

    const notAssigned = await assignPartnersToProject(
      team.value,
      String(project._id),
      clientId,
      client.name || "Business"
    );

    return successResponse(
      await withSummary(created.toObject() as PartnershipDoc, notAssigned),
      "Partnership started",
      201
    );
  } catch (error) {
    console.error("POST /api/partnership error:", error);
    return errorResponse("Failed to start partnership", 500, error);
  }
};

// PATCH /api/partnership — { partnershipId, action, … }
//   add_partner     { staffId, initialAmount?, date? }  — also re-adds a removed partner
//   remove_partner  { partnerId }   — their past money stays in the totals
//   close | reopen
export const PATCH = async (req: NextRequest) => {
  try {
    await checkValidClient(req);
  } catch (error) {
    return unauthorized(error);
  }

  try {
    await connect();
    const body = await req.json();
    const partnershipId = String(body?.partnershipId || "");
    const action = String(body?.action || "");

    if (!Types.ObjectId.isValid(partnershipId)) return errorResponse("Valid partnershipId is required", 400);

    const partnership = await Partnership.findById(partnershipId);
    if (!partnership) return errorResponse("Partnership not found", 404);

    const actor = resolveActor(req, body);
    const partners: PartnerEntry[] = partnership.partners;
    // Partners who couldn't be made project staff (add_partner only)
    let notAssigned: string[] = [];

    switch (action) {
      case "add_partner": {
        if (partnership.status !== "active") return errorResponse("Reopen the partnership to add partners", 400);

        const staffId = String(body?.staffId || "");
        if (!Types.ObjectId.isValid(staffId)) return errorResponse("Valid staffId is required", 400);
        const amount = parseAmount(body?.initialAmount);
        if (!amount.ok) return errorResponse("Initial amount must be zero or more", 400);
        const date = parseDate(body?.date);
        if (!date) return errorResponse("date must be a valid date", 400);

        const team = await loadTeamStaff(String(partnership.clientId), [staffId]);
        if (!team.ok) return errorResponse(team.error, 400);

        const existingPartner = partners.find((p) => p.partnerId === staffId);
        if (existingPartner?.status === "active") return errorResponse("Already a partner on this project", 409);

        const entry = staffPartnerEntry(team.value[0]);
        if (existingPartner) {
          existingPartner.status = "active";
          existingPartner.removedAt = null;
          existingPartner.name = entry.name;
        } else {
          partners.push(entry);
        }
        partnership.markModified("partners");
        await partnership.save();

        const client = await Client.findById(partnership.clientId).select("name").lean<ClientRecord>();
        notAssigned = await assignPartnersToProject(
          team.value,
          String(partnership.projectId),
          String(partnership.clientId),
          client?.name || "Business"
        );

        if (amount.value > 0) {
          await PartnershipTransaction.create({
            partnershipId: partnership._id,
            clientId: partnership.clientId,
            projectId: partnership.projectId,
            kind: "contribution",
            category: "initial",
            amount: amount.value,
            paidFrom: "partner",
            partnerId: entry.partnerId,
            partnerName: entry.name,
            description: "Initial amount",
            date,
            recordedBy: actor,
          });
        }
        break;
      }

      case "remove_partner": {
        const partnerId = String(body?.partnerId || "");
        const partner = partners.find((p) => p.partnerId === partnerId && p.status === "active");
        if (!partner) return errorResponse("Partner not found on this project", 404);
        if (partner.partnerType === "owner") return errorResponse("The business can't be removed", 400);

        partner.status = "removed";
        partner.removedAt = new Date();
        partnership.markModified("partners");
        await partnership.save();
        break;
      }

      case "close":
      case "reopen": {
        partnership.status = action === "close" ? "closed" : "active";
        await partnership.save();
        break;
      }

      default:
        return errorResponse("action must be add_partner, remove_partner, close or reopen", 400);
    }

    return successResponse(
      await withSummary(partnership.toObject() as PartnershipDoc, notAssigned),
      "Partnership updated"
    );
  } catch (error) {
    console.error("PATCH /api/partnership error:", error);
    return errorResponse("Failed to update partnership", 500, error);
  }
};
