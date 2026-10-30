import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Import scheduler initialization to ensure it starts
import '@/lib/init/scheduler';

import { applyCorsHeaders } from "@/lib/cors";

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