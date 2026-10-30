import jwt from "jsonwebtoken";

// --- Mocks: no database is touched in these tests ---------------------------
const loginUsers: Record<string, any> = {};
const staffByEmail: Record<string, any> = {};
const adminByEmail: Record<string, any> = {};
const clientByEmail: Record<string, any> = {};
const projectsById: Record<string, any> = {};

const chain = (value: any) => ({
  select: () => chain(value),
  lean: async () => value,
});

jest.mock("@/lib/db", () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock("@/lib/utils/logger", () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/models/Xsite/LoginUsers", () => ({
  LoginUser: { findById: (id: string) => chain(loginUsers[id] ?? null) },
}));
const inCompanies = (doc: any, ids: string[]) =>
  (doc.clients ?? []).some((c: any) => ids.includes(String(c.clientId)));
jest.mock("@/lib/models/users/Staff", () => ({
  Staff: {
    findOne: ({ email }: any) => chain(staffByEmail[email] ?? null),
    find: (q: any) =>
      chain(Object.values(staffByEmail).filter((s: any) => q._id.$in.includes(s._id) && inCompanies(s, q["clients.clientId"].$in))),
    exists: async (q: any) =>
      Object.values(staffByEmail).some((s: any) => s._id === q._id && inCompanies(s, q["clients.clientId"].$in)) ? { _id: q._id } : null,
  },
}));
jest.mock("@/lib/models/users/Admin", () => ({
  Admin: {
    findOne: ({ email }: any) => chain(adminByEmail[email] ?? null),
    find: (q: any) =>
      chain(Object.values(adminByEmail).filter((a: any) => q._id.$in.includes(a._id) && q.clientId.$in.includes(String(a.clientId)))),
  },
}));
jest.mock("@/lib/models/super-admin/Client", () => ({
  Client: { findOne: ({ email }: any) => chain(clientByEmail[email] ?? null) },
}));
jest.mock("@/lib/models/Project", () => ({
  Projects: { findById: (id: string) => chain(projectsById[id] ?? null) },
}));

import {
  AuthError,
  clientAccessError,
  docAccessError,
  filterRecipientIds,
  getSession,
  isOwnUserId,
  projectAccessError,
  signResetToken,
  signSuperAdminToken,
  signUserToken,
  scopeAccessError,
  staffAccessError,
  superAdminOnlyError,
  verifyResetToken,
} from "./session";

const SECRET = "test-jwt-secret";
const PARTNER = "test-partner-token";

const COMPANY_A = "64b000000000000000000a01";
const COMPANY_B = "64b000000000000000000b01";
const STAFF_LOGIN_ID = "64b000000000000000000001";
const ADMIN_LOGIN_ID = "64b000000000000000000002";
const PROJECT_A = "64b000000000000000000c01";
const PROJECT_B = "64b000000000000000000c02";
const STAFF_A = "64b000000000000000000d01";
const STAFF_B = "64b000000000000000000d02";
const ADMIN_A = "64b000000000000000000e01";
const ADMIN_B = "64b000000000000000000e02";

const req = (token?: string, url = "http://localhost/api/project") =>
  new Request(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });

const expectAuthError = async (promise: Promise<unknown>, status: number) => {
  await expect(promise).rejects.toBeInstanceOf(AuthError);
  await promise.catch((e) => expect(e.status).toBe(status));
};

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.PARTNER_API_TOKEN = PARTNER;
  process.env.SUPER_ADMIN_EMAIL = "owner@example.com";

  loginUsers[STAFF_LOGIN_ID] = { _id: STAFF_LOGIN_ID, email: "staff@a.com", userType: "staff", tokenVersion: 0 };
  loginUsers[ADMIN_LOGIN_ID] = { _id: ADMIN_LOGIN_ID, email: "admin@a.com", userType: "admin" };
  staffByEmail["staff@a.com"] = { _id: STAFF_A, role: "site-engineer", clients: [{ clientId: COMPANY_A }] };
  staffByEmail["other@b.com"] = { _id: STAFF_B, role: "supervisor", clients: [{ clientId: COMPANY_B }] };
  adminByEmail["admin@a.com"] = { _id: ADMIN_A, clientId: COMPANY_A };
  adminByEmail["admin@b.com"] = { _id: ADMIN_B, clientId: COMPANY_B };
  projectsById[PROJECT_A] = { _id: PROJECT_A, clientId: COMPANY_A };
  projectsById[PROJECT_B] = { _id: PROJECT_B, clientId: COMPANY_B };
});

describe("getSession", () => {
  it("rejects requests with no token", async () => {
    await expectAuthError(getSession(req()), 401);
  });

  it("rejects the old shared token and random strings", async () => {
    await expectAuthError(getSession(req("eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9.")), 401);
  });

  it("rejects tokens signed with another secret", async () => {
    const forged = jwt.sign({ typ: "user", sub: STAFF_LOGIN_ID, tv: 0 }, "wrong-secret");
    await expectAuthError(getSession(req(forged)), 401);
  });

  it("accepts a user token and resolves the user's companies", async () => {
    const session = await getSession(req(signUserToken(loginUsers[STAFF_LOGIN_ID])));
    expect(session).toMatchObject({ kind: "user", userType: "staff", role: "site-engineer", clientIds: [COMPANY_A] });
  });

  it("user tokens have no expiry", () => {
    const decoded = jwt.decode(signUserToken(loginUsers[STAFF_LOGIN_ID])) as any;
    expect(decoded.exp).toBeUndefined();
  });

  it("treats a missing tokenVersion as 0", async () => {
    const session = await getSession(req(signUserToken(loginUsers[ADMIN_LOGIN_ID])));
    expect(session).toMatchObject({ kind: "user", clientIds: [COMPANY_A] });
  });

  it("rejects a token after tokenVersion is bumped (password reset)", async () => {
    const token = signUserToken(loginUsers[STAFF_LOGIN_ID]);
    loginUsers[STAFF_LOGIN_ID].tokenVersion = 1;
    await expectAuthError(getSession(req(token)), 401);
  });

  it("rejects a token for a deleted account", async () => {
    const token = signUserToken(loginUsers[STAFF_LOGIN_ID]);
    delete loginUsers[STAFF_LOGIN_ID];
    await expectAuthError(getSession(req(token)), 401);
  });

  it("drops company access as soon as staff is unassigned", async () => {
    const token = signUserToken(loginUsers[STAFF_LOGIN_ID]);
    staffByEmail["staff@a.com"].clients = [];
    const session = await getSession(req(token));
    expect(clientAccessError(session, COMPANY_A)?.status).toBe(403);
  });

  it("does not accept a password-reset token as a login", async () => {
    await expectAuthError(getSession(req(signResetToken("staff@a.com"))), 401);
  });

  it("user tokens get 403 on routes for other callers", async () => {
    const token = signUserToken(loginUsers[STAFF_LOGIN_ID]);
    await expectAuthError(getSession(req(token), ["superadmin"]), 403);
  });

  it("partner token works only where partners are allowed", async () => {
    await expect(getSession(req(PARTNER))).resolves.toEqual({ kind: "partner" });
    await expectAuthError(getSession(req(PARTNER), ["user", "superadmin"]), 403);
  });

  it("partner token is ignored when PARTNER_API_TOKEN is not set", async () => {
    delete process.env.PARTNER_API_TOKEN;
    await expectAuthError(getSession(req(PARTNER)), 401);
  });

  it("accepts a super-admin token only for the configured email", async () => {
    await expect(getSession(req(signSuperAdminToken("owner@example.com")))).resolves.toMatchObject({ kind: "superadmin" });
    await expectAuthError(getSession(req(signSuperAdminToken("someone@else.com"))), 401);
  });

  it("super-admin tokens expire", () => {
    const decoded = jwt.decode(signSuperAdminToken("owner@example.com")) as any;
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
  });
});

describe("company access checks", () => {
  const userSession = async () => getSession(req(signUserToken(loginUsers[STAFF_LOGIN_ID])));

  it("allows the user's own company and blocks others", async () => {
    const session = await userSession();
    expect(clientAccessError(session, COMPANY_A)).toBeNull();
    expect(clientAccessError(session, COMPANY_B)?.status).toBe(403);
    expect(clientAccessError(session, null)?.status).toBe(400);
  });

  it("checks projects by their owning company", async () => {
    const session = await userSession();
    expect(await projectAccessError(session, PROJECT_A)).toBeNull();
    expect((await projectAccessError(session, PROJECT_B))?.status).toBe(403);
    expect((await projectAccessError(session, "not-an-id"))?.status).toBe(400);
    expect((await projectAccessError(session, "64b000000000000000000fff"))?.status).toBe(404);
  });

  it("checks loaded documents by clientId, then projectId", async () => {
    const session = await userSession();
    expect(await docAccessError(session, { clientId: COMPANY_A })).toBeNull();
    expect((await docAccessError(session, { projectId: PROJECT_B }))?.status).toBe(403);
    expect((await docAccessError(session, { name: "no owner" }))?.status).toBe(403);
  });

  it("does not limit super-admin or partner callers", async () => {
    expect(clientAccessError({ kind: "partner" }, COMPANY_B)).toBeNull();
    expect(await projectAccessError({ kind: "superadmin", email: "x" }, PROJECT_B)).toBeNull();
  });
});

describe("reset tokens", () => {
  it("round-trips the email", () => {
    expect(verifyResetToken(signResetToken("staff@a.com"))).toBe("staff@a.com");
  });

  it("rejects login tokens and junk", () => {
    expect(verifyResetToken(signUserToken(loginUsers[STAFF_LOGIN_ID]))).toBeNull();
    expect(verifyResetToken("junk")).toBeNull();
    expect(verifyResetToken(undefined)).toBeNull();
  });
});

describe("list and people checks", () => {
  const staffSession = async () => getSession(req(signUserToken(loginUsers[STAFF_LOGIN_ID])));

  it("list endpoints need a filter the user owns", async () => {
    const session = await staffSession();
    expect((await scopeAccessError(session, {}))?.status).toBe(400);
    expect(await scopeAccessError(session, { clientId: COMPANY_A })).toBeNull();
    expect((await scopeAccessError(session, { clientId: COMPANY_A, projectId: PROJECT_B }))?.status).toBe(403);
    expect(await scopeAccessError({ kind: "partner" }, {})).toBeNull();
  });

  it("staff records: self and own-company staff only", async () => {
    const session = await staffSession();
    expect(await staffAccessError(session, STAFF_A)).toBeNull();
    expect((await staffAccessError(session, STAFF_B))?.status).toBe(403);
  });

  it("isOwnUserId recognises the caller", async () => {
    const session = await staffSession();
    expect(isOwnUserId(session, STAFF_A)).toBe(true);
    expect(isOwnUserId(session, STAFF_LOGIN_ID)).toBe(true);
    expect(isOwnUserId(session, STAFF_B)).toBe(false);
    // staff don't act as the company itself
    expect(isOwnUserId(session, COMPANY_A)).toBe(false);
  });

  it("notification recipients are limited to the caller's companies", async () => {
    const session = await staffSession();
    const kept = await filterRecipientIds(session, [STAFF_A, STAFF_B, ADMIN_A, ADMIN_B, COMPANY_A, COMPANY_B]);
    expect(kept.sort()).toEqual([ADMIN_A, COMPANY_A, STAFF_A].sort());
    expect(await filterRecipientIds({ kind: "superadmin", email: "x" }, [STAFF_B])).toEqual([STAFF_B]);
  });

  it("super-admin-only actions", async () => {
    expect(superAdminOnlyError({ kind: "superadmin", email: "x" })).toBeNull();
    expect(superAdminOnlyError(await staffSession())?.status).toBe(403);
    expect(superAdminOnlyError({ kind: "partner" })?.status).toBe(403);
  });
});
