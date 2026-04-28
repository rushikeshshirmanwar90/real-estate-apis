import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper function to apply CORS headers
function applyCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");

  const allowedOrigins = [
    "https://real-estate-web-pied.vercel.app",
    "https://real-estate-optimize-apis.vercel.app",
    "http://localhost:8080",
    "http://localhost:8000",
    "http://localhost:3000",
    "https://real-estate-frontend-red.vercel.app",
    "http://187.127.137.30:8000", // Super Admin
  ];

  // Allow the requesting origin if it's in the allowed list, or allow all origins
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (origin) {
    // Allow any origin (less secure but more flexible)
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set(
      "Access-Control-Allow-Origin",
      "https://real-estate-optimize-apis-f9c2h2o6g.vercel.app"
    );
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
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