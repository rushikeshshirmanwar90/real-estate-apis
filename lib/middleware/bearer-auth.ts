import { NextRequest, NextResponse } from "next/server";
import {
  ALL_CALLERS,
  authErrorResponse,
  getSession,
  type SessionKind,
} from "@/lib/auth/session";

/**
 * Wraps a route handler so it only runs for an authenticated caller.
 */
export const withBearerAuth = (
  handler: (req: NextRequest) => Promise<NextResponse>,
  allow: SessionKind[] = ALL_CALLERS
) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      await getSession(req, allow);
    } catch (error) {
      return authErrorResponse(error);
    }
    return handler(req);
  };
};

/** Same as withBearerAuth, with the allowed callers given first: withAuthFor(["user"])(handler) */
export const withAuthFor =
  (allow: SessionKind[]) => (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withBearerAuth(handler, allow);
