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
jest.mock("@/lib/models/users/Staff", () => ({
  Staff: { findOne: ({ email }: any) => chain(staffByEmail[email] ?? null) },
}));
jest.mock("@/lib/models/users/Admin", () => ({
  Admin: { findOne: ({ email }: any) => chain(adminByEmail[email] ?? null) },
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
  getSession,
  projectAccessError,
  signResetToken,
  signSuperAdminToken,
  signUserToken,
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
  staffByEmail["staff@a.com"] = { _id: "s1", role: "site-engineer", clients: [{ clientId: COMPANY_A }] };
  adminByEmail["admin@a.com"] = { _id: "a1", clientId: COMPANY_A };
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
