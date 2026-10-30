import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyCorsHeaders } from "@/lib/cors";

// Next.js 15 runs middleware.ts (proxy.ts is the Next 16 name and is not run on 15).
// This only handles CORS for API routes; when upgrading to Next 16, delete this
// file and let proxy.ts take over (it uses the same lib/cors.ts helper).
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), request);
  }
  return applyCorsHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: ["/api/:path*"],
};
