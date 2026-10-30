import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Browser origins allowed to call the API. Add more with CORS_ALLOWED_ORIGINS
// (comma-separated). The mobile app sends no Origin header and isn't affected.
const DEFAULT_ALLOWED_ORIGINS = [
  "https://xsite.tech",
  "https://real-estate-web-pied.vercel.app",
  "https://real-estate-optimize-apis.vercel.app",
  "https://real-estate-frontend-red.vercel.app",
  "http://187.127.137.30:8000", // Super Admin
  "http://localhost:8080",
  "http://localhost:8000",
  "http://localhost:3000",
];

const allowedOrigins = new Set(
  [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.CORS_ALLOWED_ORIGINS || "").split(","),
  ]
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean)
);

// Adds CORS headers for allowlisted browser origins
export function applyCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");

  // Only echo back known origins; anything else gets no CORS headers and is blocked by the browser
  if (!origin || !allowedOrigins.has(origin)) {
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  return response;
}

