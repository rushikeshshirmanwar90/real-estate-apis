import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidEmail } from "@/lib/utils/validation";
import { rateLimit } from "@/lib/utils/rate-limiter";
import { logger } from "@/lib/utils/logger";

// Track failed login attempts
const failedAttempts = new Map<string, { count: number; lockUntil: number }>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const POST = async (req: NextRequest) => {
  try {
    // Rate limiting: 10 requests per minute
    const rateLimitResult = rateLimit(req, {
      maxRequests: 10,
      windowMs: 60000,
    });
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Too many login attempts. Please try again later.",
        429
      );
    }

    await connect();
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Check if account is locked
    const attemptData = failedAttempts.get(email);
    if (attemptData && attemptData.lockUntil > Date.now()) {
      const remainingTime = Math.ceil(
        (attemptData.lockUntil - Date.now()) / 1000 / 60
      );
      return errorResponse(
        `Account temporarily locked. Try again in ${remainingTime} minutes.`,
        423
      );
    }

    // Find user (don't use .lean() here because we need password field)
    const user = await LoginUser.findOne({ email }).select("+password");
    if (!user) {
      // Track failed attempt even if user doesn't exist (prevent user enumeration)
      trackFailedAttempt(email);
      return errorResponse("Invalid credentials", 401);
    }

    // Check if user.password exists and is a string
    if (!user.password || typeof user.password !== "string") {
      logger.error("User password is invalid", { email });
      return errorResponse("Invalid credentials", 401);
    }

    // Verify password
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      logger.error("Bcrypt comparison error", bcryptError);
      return errorResponse("Authentication error", 500);
    }

    if (!isValidPassword) {
      trackFailedAttempt(email);
      const attempts = failedAttempts.get(email);
      const remaining = MAX_FAILED_ATTEMPTS - (attempts?.count || 0);

      if (remaining > 0) {
        return errorResponse(
          `Invalid credentials. ${remaining} attempts remaining.`,
          401
        );
      } else {
        return errorResponse(
          "Account locked due to too many failed attempts. Try again in 15 minutes.",
          423
        );
      }
    }

    // Clear failed attempts on successful login
    failedAttempts.delete(email);

    // Success response (exclude password)
    return successResponse(
      {
        user: {
          id: user._id,
          email: user.email,
          userType: user.userType,
        },
        // TODO: Generate and return JWT token here
        token: user.email, // Placeholder - implement JWT
      },
      "Login successful"
    );
  } catch (error: unknown) {
    logger.error("Login error", error);
    return errorResponse("An error occurred during login", 500);
  }
};

function trackFailedAttempt(email: string): void {
  const attemptData = failedAttempts.get(email) || { count: 0, lockUntil: 0 };
  attemptData.count++;

  if (attemptData.count >= MAX_FAILED_ATTEMPTS) {
    attemptData.lockUntil = Date.now() + LOCK_TIME_MS;
  }

  failedAttempts.set(email, attemptData);

  // Clean up old entries after 1 hour
  setTimeout(
    () => {
      const data = failedAttempts.get(email);
      if (data && data.lockUntil < Date.now()) {
        failedAttempts.delete(email);
      }
    },
    60 * 60 * 1000
  );
}
