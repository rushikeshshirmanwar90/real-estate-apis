import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/api-response";
import { connectDB } from "../utils/db-connection";
import { LoginUser } from "../models/Xsite/LoginUsers";
import { logger } from "../utils/logger";

export interface JWTPayload {
  id: string;
  email: string;
  userType: string;
  clientId?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and extracts user information
 */
export const verifyJWT = async (
  req: NextRequest
): Promise<{
  authorized: boolean;
  user?: JWTPayload;
  response?: NextResponse;
}> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        authorized: false,
        response: errorResponse("Authorization header missing or malformed", 401),
      };
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET environment variable not set");
      return {
        authorized: false,
        response: errorResponse("Server configuration error", 500),
      };
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return {
          authorized: false,
          response: errorResponse("Token expired", 401),
        };
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        return {
          authorized: false,
          response: errorResponse("Invalid token", 401),
        };
      } else {
        logger.error("JWT verification error:", jwtError);
        return {
          authorized: false,
          response: errorResponse("Token verification failed", 401),
        };
      }
    }

    // Optional: Verify user still exists in database
    await connectDB();
    const user = await LoginUser.findById(decoded.id).lean();
    if (!user) {
      return {
        authorized: false,
        response: errorResponse("User not found", 401),
      };
    }

    return {
      authorized: true,
      user: decoded,
    };
  } catch (error) {
    logger.error("JWT authentication error:", error);
    return {
      authorized: false,
      response: errorResponse("Authentication failed", 500),
    };
  }
};

/**
 * Role-based authentication middleware
 * Requires specific user types to access the endpoint
 */
export const requireAuth = (allowedRoles?: string[]) => {
  return async (
    req: NextRequest
  ): Promise<{
    authorized: boolean;
    user?: JWTPayload;
    response?: NextResponse;
  }> => {
    const authResult = await verifyJWT(req);

    if (!authResult.authorized) {
      return authResult;
    }

    // Check user role if specified
    if (allowedRoles && authResult.user) {
      if (!allowedRoles.includes(authResult.user.userType)) {
        return {
          authorized: false,
          response: errorResponse(
            `Access denied. Required roles: ${allowedRoles.join(", ")}`,
            403
          ),
        };
      }
    }

    return authResult;
  };
};

/**
 * Admin-only authentication middleware
 */
export const requireAdmin = () => requireAuth(["admin", "super-admin"]);

/**
 * Staff or Admin authentication middleware
 */
export const requireStaffOrAdmin = () => requireAuth(["staff", "admin", "super-admin"]);

/**
 * Client authentication middleware
 */
export const requireClient = () => requireAuth(["client"]);

/**
 * Higher-order function to wrap API routes with authentication
 */
export const withAuth = (
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  allowedRoles?: string[]
) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAuth(allowedRoles)(req);

    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Add user to request object
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = authResult.user;

    return handler(authenticatedReq);
  };
};

/**
 * Admin-only route wrapper
 */
export const withAdminAuth = (
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) => withAuth(handler, ["admin", "super-admin"]);

/**
 * Staff or Admin route wrapper
 */
export const withStaffAuth = (
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) => withAuth(handler, ["staff", "admin", "super-admin"]);

/**
 * Client-only route wrapper
 */
export const withClientAuth = (
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) => withAuth(handler, ["client"]);