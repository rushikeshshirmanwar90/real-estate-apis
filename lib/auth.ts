// lib/auth.ts
// Entry points used by route handlers. The logic lives in lib/auth/session.ts.
import {
  ALL_CALLERS,
  authStatus,
  getSession,
  type Session,
  type SessionKind,
} from "@/lib/auth/session";

export { authStatus };
export type { Session, SessionKind };

/**
 * Authenticates the request and returns who is calling.
 * By default accepts signed-in users, the super-admin panel and partner apps;
 * pass `allow` to narrow it. Throws AuthError — use authStatus(error) for the HTTP status.
 */
export const checkValidClient = async (
  req: Request,
  allow: SessionKind[] = ALL_CALLERS
): Promise<Session> => getSession(req, allow);

/**
 * Non-throwing variant kept for older routes.
 */
export const verifyAuthorization = async (
  req: Request,
  allow: SessionKind[] = ALL_CALLERS
): Promise<{ valid: boolean; message?: string; status?: number; session?: Session }> => {
  try {
    const session = await getSession(req, allow);
    return { valid: true, session };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : "Unauthorized",
      status: authStatus(error),
    };
  }
};
