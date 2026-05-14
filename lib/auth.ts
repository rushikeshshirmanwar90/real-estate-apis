// lib/auth.ts
import { NextRequest } from "next/server";

export const verifyAuthorization = (req: Request): { valid: boolean; message?: string } => {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      valid: false,
      message: "Authorization header missing or malformed",
    };
  }

  const token = authHeader.split(" ")[1];
  const validToken = process.env.API_BEARER_TOKEN;

  if (token !== validToken) {
    return { valid: false, message: "Invalid or expired token" };
  }

  return { valid: true };
};

export const checkValidClient = async (req: NextRequest | Request) => {
  const authHeader = req.headers.get("authorization");
  console.log('🔍 DEBUG: Authorization header:', authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ DEBUG: Missing or malformed authorization header');
    throw new Error("Authorization header missing or malformed");
  }

  const token = authHeader.substring(7);
  const validToken = process.env.API_BEARER_TOKEN;

  console.log('🔍 DEBUG: Received token:', token);
  console.log('🔍 DEBUG: Expected token:', validToken);
  console.log('🔍 DEBUG: Tokens match:', token === validToken);
  console.log('🔍 DEBUG: Received token length:', token?.length);
  console.log('🔍 DEBUG: Expected token length:', validToken?.length);

  if (!validToken) {
    console.log('❌ DEBUG: API_BEARER_TOKEN not set in environment');
    throw new Error("Server configuration error - API_BEARER_TOKEN not set");
  }

  if (token !== validToken) {
    console.log('❌ DEBUG: Token mismatch!');
    console.log('❌ DEBUG: Received bytes:', Buffer.from(token).toString('hex').substring(0, 100));
    console.log('❌ DEBUG: Expected bytes:', Buffer.from(validToken).toString('hex').substring(0, 100));
    throw new Error("Invalid or expired token");
  }

  console.log('✅ DEBUG: API access granted - valid Bearer token provided');
  return;
};