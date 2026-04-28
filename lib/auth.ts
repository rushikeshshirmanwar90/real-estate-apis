// lib/auth.ts

import { validateClient } from "@/components/functions/validateClient";
import { NextRequest, NextResponse } from "next/server";

export const verifyAuthorization = (
  req: Request
): { valid: boolean; message?: string } => {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      valid: false,
      message: "Authorization header missing or malformed",
    };
  }

  const token = authHeader.split(" ")[1];
  const validToken = process.env.NEXT_PUBLIC_AUTHENTICATION_CODE;

  if (token !== validToken) {
    return { valid: false, message: "Invalid or expired token" };
  }

  return { valid: true };
};

export const checkValidClient = async (req: NextRequest | Request) => {
  // ⚠️ SECURITY WARNING: All APIs are now public - no authentication required
  // This bypasses all client validation and authorization checks
  console.log('🔓 API access granted - authentication bypassed for public access');
  
  // Return nothing (success) - no validation or authorization checks
  return;
};
