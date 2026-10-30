import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Import scheduler initialization to ensure it starts
import '@/lib/init/scheduler';

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

// Helper function to apply CORS headers
function applyCorsHeaders(response: NextResponse, request: NextRequest) {
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ----- Allow free access to specific public pages -----
  const publicRoutes = [
    "/privacy-and-policy",
    "/analysis",
    "/analysis/setup",
    "/analysis/debug",
    "/analysis/simple",
    "/analysis/test",
    "/support",
    "/privacy-policy", 
    "/xsite-marketing",
    "/test",
  ];

  // Check if the current path or any parent path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ----- CORS for API routes (ALL APIs are now public) -----
  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return applyCorsHeaders(new NextResponse(null, { status: 204 }), request);
    }

    const response = NextResponse.next();
    // All API routes are now accessible without authentication
    return applyCorsHeaders(response, request);
  }

  // ----- Authentication for protected pages -----
  const token = request.cookies.get("client_auth_token")?.value;

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Matcher
export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};