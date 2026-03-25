import { Client } from "@/lib/models/super-admin/Client";
import connectDB from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Check if a specific client's license is active
 * Used for filtering projects by license status
 */
export async function checkClientLicense(clientId: string): Promise<{ hasAccess: boolean; license: number }> {
    try {
        await connectDB();

        if (!clientId) {
            return { hasAccess: false, license: 0 };
        }

        // Fetch client license
        const clientData = await Client.findById(clientId).select('license isLicenseActive').lean() as any;

        if (!clientData) {
            return { hasAccess: false, license: 0 };
        }

        const license: number = clientData.license !== undefined ? clientData.license : 0;
        const isLicenseActive: boolean = clientData.isLicenseActive !== undefined ? clientData.isLicenseActive : false;

        // Check license status
        // -1 = Lifetime (always access)
        // 0 = Expired (no access)
        // >0 = Active (has access)
        const hasAccess = license === -1 || (license > 0 && isLicenseActive);

        return { hasAccess, license };

    } catch (error) {
        console.error("Error checking client license:", error);
        return { hasAccess: false, license: 0 };
    }
}

/**
 * Add license status to projects
 * For staff users: Adds isAccessible flag and blockReason to each project
 */
export async function addLicenseStatusToProjects(projects: any[], userRole: string = 'admin'): Promise<any[]> {
    console.log(`🔐 addLicenseStatusToProjects called with userRole: "${userRole}", projects: ${projects.length}`);
    
    // Admin users: all projects are accessible
    if (userRole === 'admin') {
        console.log(`👨‍💼 Admin user - marking all projects as accessible`);
        return projects.map(project => ({
            ...project,
            isAccessible: true,
            licenseStatus: 'active'
        }));
    }

    // Staff users: check each project's client license
    console.log(`👤 Staff user - checking license for each project`);
    const projectsWithStatus = [];
    
    for (const project of projects) {
        const clientId = project.clientId?._id || project.clientId;
        
        console.log(`🔍 Checking project "${project.name}" with clientId:`, clientId);
        
        if (!clientId) {
            // No clientId, mark as inaccessible
            console.log(`❌ No clientId found for project "${project.name}"`);
            projectsWithStatus.push({
                ...project,
                isAccessible: false,
                licenseStatus: 'unknown',
                blockReason: 'Client information not available'
            });
            continue;
        }

        const { hasAccess, license } = await checkClientLicense(clientId.toString());
        
        console.log(`📋 License check result for "${project.name}":`, { hasAccess, license });
        
        if (hasAccess) {
            projectsWithStatus.push({
                ...project,
                isAccessible: true,
                licenseStatus: license === -1 ? 'lifetime' : 'active'
            });
            console.log(`✅ Project "${project.name}" is accessible`);
        } else {
            projectsWithStatus.push({
                ...project,
                isAccessible: false,
                licenseStatus: 'expired',
                blockReason: license === 0 
                    ? "Client's license has expired. Contact client to renew."
                    : "Client's license is inactive."
            });
            console.log(`🚫 Project "${project.name}" is BLOCKED - license: ${license}`);
        }
    }

    console.log(`📊 Final result: ${projectsWithStatus.length} projects with status`);
    return projectsWithStatus;
}

/**
 * Filter projects based on client license status
 * For staff users: Only return projects where the client's license is active
 * For admin users: Return all their projects (admin-level blocking handled separately)
 */
export async function filterProjectsByLicense(projects: any[], userRole: string = 'admin'): Promise<any[]> {
    // Admin users: no filtering (they're blocked at app level if license expired)
    if (userRole === 'admin') {
        return projects;
    }

    // Staff users: filter out projects with expired client licenses
    const filteredProjects = [];
    
    for (const project of projects) {
        const clientId = project.clientId?._id || project.clientId;
        
        if (!clientId) {
            // No clientId, skip this project
            continue;
        }

        const { hasAccess } = await checkClientLicense(clientId.toString());
        
        if (hasAccess) {
            filteredProjects.push(project);
        } else {
            console.log(`🚫 Filtered out project ${project._id} - client ${clientId} license expired`);
        }
    }

    return filteredProjects;
}

/**
 * Middleware wrapper to check project access for staff users
 * Validates that staff can only access projects with active client licenses
 */
export async function withProjectAccessCheck(
    handler: (req: NextRequest) => Promise<NextResponse>,
    options: { requireProjectId?: boolean; requireClientId?: boolean } = {}
) {
    return async (req: NextRequest): Promise<NextResponse> => {
        try {
            const { searchParams } = new URL(req.url);
            const userRole = searchParams.get("userRole") || 'admin';
            
            // Admin users: no restrictions
            if (userRole === 'admin') {
                return handler(req);
            }

            // Staff users: check project access
            let projectClientId = searchParams.get("projectClientId") || searchParams.get("clientId");
            
            // Try to get from body for POST/PUT requests
            if (!projectClientId && (req.method === "POST" || req.method === "PUT")) {
                try {
                    const body = await req.json();
                    projectClientId = body.projectClientId || body.clientId;
                    
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

            if (options.requireClientId && !projectClientId) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Client ID is required for staff access validation",
                        error: "MISSING_CLIENT_ID"
                    },
                    { status: 400 }
                );
            }

            // Check if staff can access this project's client
            if (projectClientId) {
                const accessCheck = await canAccessProject(projectClientId);
                
                if (!accessCheck.canAccess) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: accessCheck.reason || "Access denied to this project",
                            error: "PROJECT_ACCESS_DENIED"
                        },
                        { status: 403 }
                    );
                }
            }

            // Access granted, proceed to handler
            return handler(req);

        } catch (error) {
            console.error("Project access check error:", error);
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to verify project access",
                    error: "ACCESS_CHECK_FAILED"
                },
                { status: 500 }
            );
        }
    };
}

/**
 * Check if a staff user can access a specific project based on client license
 */
export async function canAccessProject(projectClientId: string): Promise<{ canAccess: boolean; reason?: string }> {
    const { hasAccess, license } = await checkClientLicense(projectClientId);
    
    if (!hasAccess) {
        return {
            canAccess: false,
            reason: license === 0 
                ? "This project's client license has expired. Please contact the client to renew their subscription."
                : "This project's client license is inactive."
        };
    }

    return { canAccess: true };
}
