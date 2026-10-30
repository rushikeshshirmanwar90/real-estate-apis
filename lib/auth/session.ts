import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import { Admin } from "@/lib/models/users/Admin";
import { Staff } from "@/lib/models/users/Staff";
import { Client } from "@/lib/models/super-admin/Client";
import { Projects } from "@/lib/models/Project";
import { errorResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logger";

/**
 * Who is calling the API.
 * - user:       someone signed in to xsite (JWT from /api/login or /api/password, never expires)
 * - superadmin: the super-admin panel (JWT from /api/super-admin/login, 24h)
 * - partner:    other apps using PARTNER_API_TOKEN (a server-side shared secret)
 */
export type SessionKind = "user" | "superadmin" | "partner";

export interface UserSession {
  kind: "user";
  loginUserId: string;
  email: string;
  userType: string;
  /** _id in the Admin / Staff / Client collection for this account */
  userId: string | null;
  /** Staff role (site-engineer, supervisor, manager) when userType is staff */
  role: string | null;
  /** Companies (Client ids) this user may access. Looked up on every request. */
  clientIds: string[];
}

export interface SuperAdminSession {
  kind: "superadmin";
  email: string;
}

export interface PartnerSession {
  kind: "partner";
}

export type Session = UserSession | SuperAdminSession | PartnerSession;

export const ALL_CALLERS: SessionKind[] = ["user", "superadmin", "partner"];

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** HTTP status to use for an error thrown by getSession / checkValidClient. */
export const authStatus = (error: unknown): number =>
  error instanceof AuthError ? error.status : 401;

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthError("Server configuration error", 500);
  }
  return secret;
};

// Compare secrets without leaking timing information
const safeEqual = (a: string, b: string): boolean => {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

// ---------------------------------------------------------------------------
// Token issuing
// ---------------------------------------------------------------------------

/** Login token for xsite users. No expiry: revoke by bumping LoginUser.tokenVersion. */
export const signUserToken = (loginUser: { _id: unknown; tokenVersion?: number }): string =>
  jwt.sign(
    { typ: "user", sub: String(loginUser._id), tv: loginUser.tokenVersion ?? 0 },
    getJwtSecret(),
    { algorithm: "HS256" }
  );

export const signSuperAdminToken = (email: string): string =>
  jwt.sign({ typ: "superadmin", email }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "24h",
  });

/** Short-lived proof that the email owner entered the right OTP. */
export const signResetToken = (email: string): string =>
  jwt.sign({ typ: "pw-reset", email }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "15m",
  });

/** Returns the email from a valid reset token, or null. */
export const verifyResetToken = (token: unknown): string | null => {
  if (typeof token !== "string" || !token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as any;
    return payload?.typ === "pw-reset" && typeof payload.email === "string"
      ? payload.email
      : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Account lookup
// ---------------------------------------------------------------------------

/**
 * Finds which companies a login account may access, based on its role record.
 * Done per request so removing staff from a company takes effect immediately.
 */
export const resolveAccount = async (loginUser: {
  _id: unknown;
  email: string;
  userType: string;
}): Promise<{ userId: string | null; role: string | null; clientIds: string[] }> => {
  const email = loginUser.email;

  switch (loginUser.userType) {
    case "admin": {
      const admin = (await Admin.findOne({ email }).select("clientId").lean()) as any;
      if (admin) {
        return {
          userId: String(admin._id),
          role: null,
          clientIds: admin.clientId ? [String(admin.clientId)] : [],
        };
      }
      // Some admins are the client owner and only exist as a Client record
      const owner = (await Client.findOne({ email }).select("_id").lean()) as any;
      return {
        userId: owner ? String(owner._id) : null,
        role: null,
        clientIds: owner ? [String(owner._id)] : [],
      };
    }
    case "users":
    case "clients": {
      const client = (await Client.findOne({ email }).select("_id").lean()) as any;
      return {
        userId: client ? String(client._id) : null,
        role: null,
        clientIds: client ? [String(client._id)] : [],
      };
    }
    case "staff": {
      const staff = (await Staff.findOne({ email }).select("clients role").lean()) as any;
      return {
        userId: staff ? String(staff._id) : null,
        role: staff?.role ?? null,
        clientIds: (staff?.clients ?? [])
          .map((c: any) => (c?.clientId ? String(c.clientId) : null))
          .filter(Boolean),
      };
    }
    default:
      // Customers don't access company data through these routes
      return { userId: String(loginUser._id), role: null, clientIds: [] };
  }
};

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Identifies the caller from `Authorization: Bearer <token>`.
 * Throws AuthError (401 = who are you?, 403 = not allowed here).
 */
export const getSession = async (
  req: Request,
  allow: SessionKind[] = ALL_CALLERS
): Promise<Session> => {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new AuthError("Authentication required", 401);
  }
  const token = header.slice(7).trim();
  if (!token) {
    throw new AuthError("Authentication required", 401);
  }

  // Partner apps send a plain shared secret, not a JWT
  const partnerToken = process.env.PARTNER_API_TOKEN;
  if (partnerToken && safeEqual(token, partnerToken)) {
    if (!allow.includes("partner")) {
      throw new AuthError("This route is not available to partner apps", 403);
    }
    let path = "";
    try {
      path = new URL(req.url).pathname;
    } catch {
      /* ignore */
    }
    logger.info("Partner token used", { method: req.method, path });
    return { kind: "partner" };
  }

  let payload: any;
  try {
    payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid or expired token", 401);
  }

  if (payload?.typ === "superadmin") {
    const superEmail = process.env.SUPER_ADMIN_EMAIL;
    if (!superEmail || payload.email !== superEmail) {
      throw new AuthError("Invalid or expired token", 401);
    }
    if (!allow.includes("superadmin")) {
      throw new AuthError("This route is not available to the super-admin panel", 403);
    }
    return { kind: "superadmin", email: payload.email };
  }

  if (payload?.typ !== "user" || !payload.sub || !Types.ObjectId.isValid(payload.sub)) {
    throw new AuthError("Invalid or expired token", 401);
  }

  await connect();
  const loginUser = (await LoginUser.findById(payload.sub).lean()) as any;
  if (!loginUser) {
    throw new AuthError("Account no longer exists", 401);
  }
  if ((loginUser.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
    throw new AuthError("Session has been signed out. Please sign in again.", 401);
  }
  if (!allow.includes("user")) {
    throw new AuthError("You don't have permission for this action", 403);
  }

  const account = await resolveAccount(loginUser);
  return {
    kind: "user",
    loginUserId: String(loginUser._id),
    email: loginUser.email,
    userType: loginUser.userType,
    ...account,
  };
};

// ---------------------------------------------------------------------------
// Company (tenant) access checks.
// Each returns an error response to send back, or null when access is allowed.
// Super-admin and partner callers are not limited to one company.
// ---------------------------------------------------------------------------

const toId = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object" && value !== null && "_id" in (value as any)) {
    return String((value as any)._id);
  }
  return String(value);
};

export const canAccessClient = (session: Session, clientId: unknown): boolean => {
  if (session.kind !== "user") return true;
  const id = toId(clientId);
  return !!id && session.clientIds.includes(id);
};

export const clientAccessError = (
  session: Session,
  clientId: unknown
): NextResponse | null => {
  if (session.kind !== "user") return null;
  if (!toId(clientId)) {
    return errorResponse("clientId is required", 400);
  }
  return canAccessClient(session, clientId)
    ? null
    : errorResponse("You don't have access to this company's data", 403);
};

export const projectAccessError = async (
  session: Session,
  projectId: unknown
): Promise<NextResponse | null> => {
  if (session.kind !== "user") return null;
  const id = toId(projectId);
  if (!id || !Types.ObjectId.isValid(id)) {
    return errorResponse("A valid projectId is required", 400);
  }
  await connect();
  const project = (await Projects.findById(id).select("clientId").lean()) as any;
  if (!project) {
    return errorResponse("Project not found", 404);
  }
  return clientAccessError(session, project.clientId);
};

/**
 * For a document loaded by id: checks its clientId, or else its projectId.
 * Documents with neither are refused for users, since ownership can't be shown.
 */
export const docAccessError = async (
  session: Session,
  doc: any
): Promise<NextResponse | null> => {
  if (session.kind !== "user" || !doc) return null;
  if (doc.clientId) return clientAccessError(session, doc.clientId);
  // Some collections (e.g. mini-sections) keep the project under projectDetails
  const projectId = doc.projectId ?? doc.projectDetails?.projectId;
  if (projectId) return projectAccessError(session, projectId);
  return errorResponse("You don't have access to this record", 403);
};

/**
 * For list/filter endpoints that take clientId and/or projectId.
 * Users must give at least one, and every one they give must be theirs,
 * so a missing filter can never return other companies' data.
 */
export const scopeAccessError = async (
  session: Session,
  scope: { clientId?: unknown; projectId?: unknown }
): Promise<NextResponse | null> => {
  if (session.kind !== "user") return null;
  const hasClient = !!toId(scope.clientId);
  const hasProject = !!toId(scope.projectId);
  if (!hasClient && !hasProject) {
    return errorResponse("clientId or projectId is required", 400);
  }
  if (hasClient) {
    const denied = clientAccessError(session, scope.clientId);
    if (denied) return denied;
  }
  if (hasProject) {
    return projectAccessError(session, scope.projectId);
  }
  return null;
};

type FindableModel = { findById: (id: string) => any };

/**
 * For a record addressed by id: loads its clientId/projectId and checks them.
 * Pass several models when the id may belong to any of them (first match wins).
 * Returns null when the id is missing/invalid or the record doesn't exist,
 * so the route's own validation and 404 handling still apply.
 */
export const recordAccessError = async (
  session: Session,
  model: FindableModel | FindableModel[],
  id: unknown
): Promise<NextResponse | null> => {
  if (session.kind !== "user") return null;
  const recordId = toId(id);
  if (!recordId || !Types.ObjectId.isValid(recordId)) return null;
  await connect();
  for (const m of Array.isArray(model) ? model : [model]) {
    const doc = await m.findById(recordId).select("clientId projectId projectDetails.projectId").lean();
    if (doc) return docAccessError(session, doc);
  }
  return null;
};

/**
 * Keeps only the user ids that belong to the caller's companies
 * (the company itself, its admins and its staff). Other callers are not filtered.
 */
export const filterRecipientIds = async (session: Session, ids: unknown[]): Promise<string[]> => {
  const all = ids.map((id) => toId(id)).filter((id): id is string => !!id);
  if (session.kind !== "user") return all;
  const valid = all.filter((id) => Types.ObjectId.isValid(id));
  await connect();
  const [staff, admins] = await Promise.all([
    Staff.find({ _id: { $in: valid }, "clients.clientId": { $in: session.clientIds } }).select("_id").lean(),
    Admin.find({ _id: { $in: valid }, clientId: { $in: session.clientIds } }).select("_id").lean(),
  ]);
  const allowed = new Set<string>([
    ...session.clientIds,
    ...(staff as any[]).map((s) => String(s._id)),
    ...(admins as any[]).map((a) => String(a._id)),
  ]);
  return all.filter((id) => allowed.has(id));
};

/**
 * True when `userId` is the caller themselves (their role record, login record,
 * or — for company owners — their company id). Super-admin may act for anyone.
 */
export const isOwnUserId = (session: Session, userId: unknown): boolean => {
  if (session.kind === "superadmin") return true;
  if (session.kind !== "user") return false;
  const id = toId(userId);
  if (!id) return false;
  if (id === session.userId || id === session.loginUserId) return true;
  return session.userType !== "staff" && session.clientIds.includes(id);
};

/** A staff record the caller may see: themselves, or staff assigned to one of their companies. */
export const staffAccessError = async (
  session: Session,
  staffId: unknown
): Promise<NextResponse | null> => {
  if (session.kind !== "user") return null;
  const id = toId(staffId);
  if (!id || !Types.ObjectId.isValid(id)) return null;
  if (isOwnUserId(session, id)) return null;
  await connect();
  const inCompany = await Staff.exists({ _id: id, "clients.clientId": { $in: session.clientIds } });
  return inCompany ? null : errorResponse("You don't have access to this staff member", 403);
};

/** For actions only the super-admin panel may perform. */
export const superAdminOnlyError = (session: Session): NextResponse | null =>
  session.kind === "superadmin"
    ? null
    : errorResponse("Only the super-admin can do this", 403);

/** Standard response for an error thrown by getSession. */
export const authErrorResponse = (error: unknown): NextResponse =>
  errorResponse(
    error instanceof Error ? error.message : "Unauthorized",
    authStatus(error)
  );
