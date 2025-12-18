import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../utils/api-response";
import { connectDB } from "../utils/db-connection";
import { LoginUser } from "../models/Xsite/LoginUsers";
import { logger } from "../utils/logger";
import mongoose from "mongoose";

// Type for user document from database
interface UserDocument {
  _id: mongoose.Types.ObjectId;
  email: string;
  userType: string;
  clientId?: mongoose.Types.ObjectId;
  [key: string]: any;
}

// Type guard to ensure we have a single user document, not an array
function isSingleUserDocument(doc: any): doc is UserDocument {
  return doc && !Array.isArray(doc) && typeof doc === 'object' && doc._id && doc.email;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    userType: string;
    clientId?: string;
  };
}

export const authenticate = async (
  req: NextRequest
): Promise<{
  authorized: boolean;
  user?: AuthenticatedRequest["user"];
  response?: NextResponse;
}> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        authorized: false,
        response: errorResponse("Authentication required", 401),
      };
    }

    const token = authHeader.substring(7);

    // For now, we'll use email as token (you should implement JWT)
    // This is a placeholder - implement proper JWT verification
    await connectDB();

    const userResult = await LoginUser.findOne({ email: token }).lean();

    if (!userResult) {
      return {
        authorized: false,
        response: errorResponse("Invalid authentication token", 401),
      };
    }

    // Ensure we have a single document, not an array
    if (Array.isArray(userResult)) {
      return {
        authorized: false,
        response: errorResponse("Invalid authentication token", 401),
      };
    }

    // Type assertion after validation - convert through unknown first for strict TypeScript
    const user = userResult as unknown as UserDocument;

    // Additional validation to ensure required fields exist
    if (!user._id || !user.email || !user.userType) {
      return {
        authorized: false,
        response: errorResponse("Invalid user data", 401),
      };
    }

    return {
      authorized: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        userType: user.userType,
        clientId: user.clientId?.toString(),
      },
    };
  } catch (error) {
    logger.error("Authentication error:", error);
    return {
      authorized: false,
      response: errorResponse("Authentication failed", 500),
    };
  }
};

export const requireAuth = (userTypes?: string[]) => {
  return async (
    req: NextRequest
  ): Promise<{
    authorized: boolean;
    user?: AuthenticatedRequest["user"];
    response?: NextResponse;
  }> => {
    const authResult = await authenticate(req);

    if (!authResult.authorized) {
      return authResult;
    }

    // Check user type if specified
    if (
      userTypes &&
      authResult.user &&
      !userTypes.includes(authResult.user.userType)
    ) {
      return {
        authorized: false,
        response: errorResponse("Insufficient permissions", 403),
      };
    }

    return authResult;
  };
};
