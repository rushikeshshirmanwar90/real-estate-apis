import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../utils/api-response";

/**
 * Simple Bearer Token Authentication Middleware
 * Validates Bearer token against environment variable
 */
export const validateBearerToken = (req: NextRequest | Request): { 
  valid: boolean; 
  error?: NextResponse 
} => {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        valid: false,
        error: errorResponse("Authorization header missing or malformed. Use: Bearer <token>", 401)
      };
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const validToken = process.env.API_BEARER_TOKEN;

    if (!validToken) {
      console.error("API_BEARER_TOKEN environment variable not set");
      return {
        valid: false,
        error: errorResponse("Server configuration error", 500)
      };
    }

    if (token !== validToken) {
      return {
        valid: false,
        error: errorResponse("Invalid or expired token", 401)
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Bearer token validation error:", error);
    return {
      valid: false,
      error: errorResponse("Authentication failed", 500)
    };
  }
};

/**
 * Higher-order function to wrap API routes with Bearer token authentication
 */
export const withBearerAuth = (
  handler: (req: NextRequest) => Promise<NextResponse>
) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authResult = validateBearerToken(req);

    if (!authResult.valid) {
      return authResult.error!;
    }

    return handler(req);
  };
};