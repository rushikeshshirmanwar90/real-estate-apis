import { NextRequest } from "next/server";

/**
 * Debug SMTP Configuration Endpoint
 * ⚠️ REMOVE THIS FILE AFTER DEBUGGING!
 * 
 * This endpoint helps you verify that SMTP environment variables
 * are properly set in your deployment environment.
 * 
 * Usage: GET /api/debug-smtp
 */
export const GET = async (req: NextRequest) => {
  // Check if we're in production and add a warning
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config = {
    environment: process.env.NODE_ENV || "NOT SET",
    smtp: {
      SMTP_HOST: process.env.SMTP_HOST || "❌ NOT SET",
      SMTP_PORT: process.env.SMTP_PORT || "❌ NOT SET",
      SMTP_USER: process.env.SMTP_USER || "❌ NOT SET",
      SMTP_PASS: process.env.SMTP_PASS ? "✅ SET (hidden for security)" : "❌ NOT SET",
      SMTP_SECURE: process.env.SMTP_SECURE || "NOT SET (defaults to false)",
    },
    warning: isProduction 
      ? "⚠️ This endpoint should be removed in production!" 
      : "Debug mode - safe for development",
    instructions: {
      step1: "Verify all SMTP variables show '✅ SET'",
      step2: "If any show '❌ NOT SET', add them to your deployment platform",
      step3: "After fixing, redeploy your application",
      step4: "Test OTP sending again",
      step5: "DELETE this debug endpoint file: app/api/debug-smtp/route.ts",
    },
    nextSteps: process.env.SMTP_USER && process.env.SMTP_PASS
      ? "✅ SMTP credentials are set! If emails still fail, check:\n" +
        "1. Gmail App Password is correct\n" +
        "2. 2-Step Verification is enabled\n" +
        "3. Check deployment logs for other errors"
      : "❌ SMTP credentials are missing! Add them to your deployment platform:\n" +
        "Railway: Variables tab\n" +
        "Vercel: Project Settings → Environment Variables\n" +
        "Render: Environment tab",
  };

  return Response.json(config, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
