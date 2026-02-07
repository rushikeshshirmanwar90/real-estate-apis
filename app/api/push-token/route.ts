import connect from "@/lib/db";
import { PushToken } from "@/lib/models/PushToken";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Security configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-for-tokens';

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security middleware functions
function authenticateToken(req: NextRequest): { success: boolean; user?: any; error?: string } {
  const authHeader = req.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return { success: false, error: 'Access token required' };
  }
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Invalid or expired token' };
  }
}

function checkRateLimit(req: NextRequest): { success: boolean; error?: string } {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             req.headers.get('cf-connecting-ip') || 
             'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10;
  
  const key = `push-token:${ip}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }
  
  if (current.count >= maxRequests) {
    return { success: false, error: 'Too many requests, please try again later' };
  }
  
  current.count++;
  return { success: true };
}

function validatePushTokenInput(data: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Validate userId (MongoDB ObjectId format)
  if (!data.userId || !/^[0-9a-fA-F]{24}$/.test(data.userId)) {
    errors.push('Invalid user ID format');
  }
  
  // Validate token format (Expo push token)
  if (!data.token || !data.token.startsWith('ExponentPushToken[') || data.token.length < 10 || data.token.length > 500) {
    errors.push('Invalid Expo push token format');
  }
  
  // Validate platform
  if (!data.platform || !['ios', 'android'].includes(data.platform)) {
    errors.push('Platform must be ios or android');
  }
  
  // Validate userType
  if (!data.userType || !['admin', 'staff', 'client'].includes(data.userType)) {
    errors.push('Invalid user type');
  }
  
  // Validate deviceId
  if (!data.deviceId || data.deviceId.length < 1 || data.deviceId.length > 100) {
    errors.push('Device ID required and must be 1-100 characters');
  }
  
  // Validate appVersion
  if (data.appVersion && !/^\d+\.\d+\.\d+$/.test(data.appVersion)) {
    errors.push('Invalid app version format (expected: x.y.z)');
  }
  
  return errors.length === 0 ? { success: true } : { success: false, errors };
}

function sanitizeInput(data: any): any {
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      // Remove HTML tags and dangerous content
      sanitized[key] = sanitized[key]
        .replace(/<script.*?>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/\$\{.*?\}/gi, '') // Remove template literals
        .replace(/DROP\s+TABLE/gi, '') // Remove SQL injection attempts
        .replace(/\.\.\/\.\.\//gi, '') // Remove path traversal attempts
        .replace(/jndi:/gi, '') // Remove JNDI injection attempts
        .trim();
    }
  }
  
  return sanitized;
}

function encryptToken(token: string): string {
  try {
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const iv = Buffer.alloc(16, 0); // In production, use random IV
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Token encryption failed:', error);
    throw new Error('Token encryption failed');
  }
}

function securityLog(req: NextRequest, message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             req.headers.get('cf-connecting-ip') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  console.log(`🔐 SECURITY LOG [${level}]: ${message}`, {
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}

// POST: Register or update push token
export const POST = async (req: NextRequest) => {
  try {
    // Security: Rate limiting
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.success) {
      securityLog(req, 'Rate limit exceeded for push token registration', 'WARN');
      return errorResponse(rateLimitResult.error!, 429);
    }

    // Security: Authentication
    const authResult = authenticateToken(req);
    if (!authResult.success) {
      securityLog(req, `Authentication failed: ${authResult.error}`, 'WARN');
      return errorResponse(authResult.error!, 401);
    }

    await connect();

    const rawData = await req.json();
    
    // Security: Input sanitization
    const sanitizedData = sanitizeInput(rawData);
    
    // Security: Input validation
    const validationResult = validatePushTokenInput(sanitizedData);
    if (!validationResult.success) {
      securityLog(req, `Input validation failed: ${validationResult.errors?.join(', ')}`, 'WARN');
      return errorResponse("Validation failed", 400, validationResult.errors?.join(', '));
    }

    const {
      userId,
      userType = 'client',
      token,
      platform,
      deviceId,
      deviceName,
      appVersion,
    } = sanitizedData;

    // Security: Verify user owns this userId
    if (authResult.user.id !== userId) {
      securityLog(req, `User ${authResult.user.id} attempted to register token for user ${userId}`, 'ERROR');
      return errorResponse("Cannot register token for another user", 403);
    }

    securityLog(req, `Push token registration attempt for user ${userId}`, 'INFO');

    // Security: Encrypt token before storing
    const encryptedToken = encryptToken(token);

    // Check if token already exists
    const existingToken = await PushToken.findOne({ token: encryptedToken });

    if (existingToken) {
      // Update existing token
      existingToken.userId = userId;
      existingToken.userType = userType;
      existingToken.platform = platform;
      existingToken.deviceId = deviceId;
      existingToken.deviceName = deviceName;
      existingToken.appVersion = appVersion;
      existingToken.isActive = true;
      existingToken.lastUsed = new Date();

      await existingToken.save();

      securityLog(req, `Updated existing push token for user ${userId}`, 'INFO');

      return successResponse(
        {
          tokenId: existingToken._id,
          isNew: false,
        },
        "Push token updated successfully",
        200
      );
    }

    // Deactivate old tokens for this user/device combination
    if (deviceId) {
      await PushToken.updateMany(
        { userId, deviceId, isActive: true },
        { isActive: false }
      );
    }

    // Create new token
    const newToken = new PushToken({
      userId,
      userType,
      token: encryptedToken, // Store encrypted token
      platform,
      deviceId,
      deviceName,
      appVersion,
      isActive: true,
      lastUsed: new Date(),
    });

    await newToken.save();

    securityLog(req, `Created new push token for user ${userId}`, 'INFO');

    return successResponse(
      {
        tokenId: newToken._id,
        isNew: true,
      },
      "Push token registered successfully",
      201
    );

  } catch (error: unknown) {
    securityLog(req, `Push token registration error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ERROR');
    if (error instanceof Error) {
      return errorResponse("Failed to register push token", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// GET: Get push tokens for a user
export const GET = async (req: NextRequest) => {
  try {
    // Security: Rate limiting
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.success) {
      securityLog(req, 'Rate limit exceeded for push token retrieval', 'WARN');
      return errorResponse(rateLimitResult.error!, 429);
    }

    // Security: Authentication
    const authResult = authenticateToken(req);
    if (!authResult.success) {
      securityLog(req, `Authentication failed: ${authResult.error}`, 'WARN');
      return errorResponse(authResult.error!, 401);
    }

    await connect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const userType = searchParams.get("userType");
    const isActive = searchParams.get("isActive");

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    // Security: Verify user can access this data
    if (authResult.user.id !== userId) {
      securityLog(req, `User ${authResult.user.id} attempted to access tokens for user ${userId}`, 'ERROR');
      return errorResponse("Cannot access another user's tokens", 403);
    }

    const query: any = { userId };
    
    if (userType) {
      query.userType = userType;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    const tokens = await PushToken.find(query)
      .select('-token') // Don't return the actual token for security
      .sort({ lastUsed: -1 });

    securityLog(req, `Retrieved ${tokens.length} push tokens for user ${userId}`, 'INFO');

    return successResponse(
      {
        tokens,
        count: tokens.length,
      },
      "Push tokens retrieved successfully",
      200
    );

  } catch (error: unknown) {
    securityLog(req, `Push token retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ERROR');
    if (error instanceof Error) {
      return errorResponse("Failed to retrieve push tokens", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};

// DELETE: Deactivate push token
export const DELETE = async (req: NextRequest) => {
  try {
    // Security: Rate limiting
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.success) {
      securityLog(req, 'Rate limit exceeded for push token deactivation', 'WARN');
      return errorResponse(rateLimitResult.error!, 429);
    }

    // Security: Authentication
    const authResult = authenticateToken(req);
    if (!authResult.success) {
      securityLog(req, `Authentication failed: ${authResult.error}`, 'WARN');
      return errorResponse(authResult.error!, 401);
    }

    await connect();

    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get("tokenId");
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");

    if (!tokenId && !token && !userId) {
      return errorResponse("tokenId, token, or userId is required", 400);
    }

    let query: any = {};
    
    if (tokenId) {
      query._id = tokenId;
    } else if (token) {
      // Encrypt the token for comparison
      query.token = encryptToken(token);
    } else if (userId) {
      // Security: Verify user can deactivate this token
      if (authResult.user.id !== userId) {
        securityLog(req, `User ${authResult.user.id} attempted to deactivate tokens for user ${userId}`, 'ERROR');
        return errorResponse("Cannot deactivate another user's tokens", 403);
      }
      query.userId = userId;
    }

    const result = await PushToken.updateMany(query, { isActive: false });

    securityLog(req, `Deactivated ${result.modifiedCount} push tokens`, 'INFO');

    return successResponse(
      {
        deactivatedCount: result.modifiedCount,
      },
      `${result.modifiedCount} push token(s) deactivated successfully`,
      200
    );

  } catch (error: unknown) {
    securityLog(req, `Push token deactivation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ERROR');
    if (error instanceof Error) {
      return errorResponse("Failed to deactivate push tokens", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};