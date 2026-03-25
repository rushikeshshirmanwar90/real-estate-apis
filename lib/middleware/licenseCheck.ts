import { NextRequest, NextResponse } from "next/server";
import { Client } from "@/lib/models/super-admin/Client";
import connectDB from "@/lib/db";

/**
 * Middleware to check if a client's license is active
 * Returns 403 if license is expired
 * Note: Staff users are also checked - they cannot access if their assigned client's license is expired
 */
export async function checkLicense(clientId: string): Promise<{ hasAccess: boolean; license: number; message: string }> {
    try {
        await connectDB();

        if (!clientId) {
            return {
                hasAccess: false,
                license: 0,
                message: "Client ID is required"
            };
        }

        // Fetch client license
        const clientData = await Client.findById(clientId).select('license isLicenseActive licenseExpiryDate').lean() as any;

        if (!clientData) {
            return {
                hasAccess: false,
                license: 0,
                message: "Client not found"
            };
        }

        const license: number = clientData.license !== undefined ? clientData.license : 0;
        const isLicenseActive: boolean = clientData.isLicenseActive !== undefined ? clientData.isLicenseActive : false;

        // Check license status
        // -1 = Lifetime (always access)
        // 0 = Expired (no access)
        // >0 = Active (has access)
        const hasAccess = license === -1 || (license > 0 && isLicenseActive);

        let message = "";
        if (license === -1) {
            message = "Lifetime access";
        } else if (license === 0) {
            message = "License expired. Please contact support to renew.";
        } else if (license > 0 && !isLicenseActive) {
            message = "License inactive. Please contact support.";
        } else if (license > 0) {
            message = `License active with ${license} days remaining`;
        }

        return {
            hasAccess,
            license,
            message
        };

    } catch (error) {
        console.error("Error checking license:", error);
        return {
            hasAccess: false,
            license: 0,
            message: "Failed to verify license"
        };
    }
}

/**
 * Express-style middleware wrapper for Next.js API routes
 */
export function withLicenseCheck(handler: (req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest): Promise<NextResponse> => {
        try {
            // Extract clientId from query params or body
            const { searchParams } = new URL(req.url);
            let clientId = searchParams.get("clientId");

            // If not in query, try to get from body (for POST/PUT requests)
            if (!clientId && (req.method === "POST" || req.method === "PUT")) {
                try {
                    const body = await req.json();
                    clientId = body.clientId;
                    // Re-create request with body for handler
                    req = new NextRequest(req.url, {
                        method: req.method,
                        headers: req.headers,
                        body: JSON.stringify(body),
                    });
                } catch (e) {
                    // Body might not be JSON, continue
                }
            }

            if (!clientId) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Client ID is required for license verification",
                        error: "MISSING_CLIENT_ID"
                    },
                    { status: 400 }
                );
            }

            // Check license
            const licenseCheck = await checkLicense(clientId);

            if (!licenseCheck.hasAccess) {
                return NextResponse.json(
                    {
                        success: false,
                        message: licenseCheck.message,
                        error: "LICENSE_EXPIRED",
                        license: licenseCheck.license
                    },
                    { status: 403 }
                );
            }

            // License valid, proceed to handler
            return handler(req);

        } catch (error) {
            console.error("License check middleware error:", error);
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to verify license",
                    error: "LICENSE_CHECK_FAILED"
                },
                { status: 500 }
            );
        }
    };
}
