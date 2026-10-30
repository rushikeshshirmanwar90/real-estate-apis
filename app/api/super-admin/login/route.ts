import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { signSuperAdminToken } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";

// POST /api/super-admin/login { email, password }
// Credentials live only in server env vars:
//   SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD_HASH (bcrypt)
// Returns a super-admin token valid for 24 hours.

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;
let failed = { count: 0, lockUntil: 0 };

export async function POST(req: NextRequest) {
  try {
    const superEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const passwordHash = process.env.SUPER_ADMIN_PASSWORD_HASH;
    if (!superEmail || !passwordHash || !process.env.JWT_SECRET) {
      logger.error("Super-admin login is not configured (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD_HASH / JWT_SECRET)");
      return errorResponse("Super-admin login is not configured", 500);
    }

    if (failed.lockUntil > Date.now()) {
      const minutes = Math.ceil((failed.lockUntil - Date.now()) / 60000);
      return errorResponse(`Too many failed attempts. Try again in ${minutes} minutes.`, 423);
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // Always run bcrypt so a wrong email takes as long as a wrong password
    const passwordOk = await bcrypt.compare(password, passwordHash);
    if (email !== superEmail || !passwordOk) {
      failed.count += 1;
      if (failed.count >= MAX_FAILED_ATTEMPTS) {
        failed = { count: 0, lockUntil: Date.now() + LOCK_TIME_MS };
        logger.warn("Super-admin login locked after repeated failures");
        return errorResponse("Too many failed attempts. Try again in 15 minutes.", 423);
      }
      logger.warn("Super-admin login failed", { email });
      return errorResponse("Invalid email or password", 401);
    }

    failed = { count: 0, lockUntil: 0 };
    logger.info("Super-admin signed in", { email });
    return successResponse({ token: signSuperAdminToken(superEmail), expiresIn: 24 * 60 * 60 }, "Signed in");
  } catch (error) {
    logger.error("Super-admin login error", error);
    return errorResponse("Login failed", 500);
  }
}
