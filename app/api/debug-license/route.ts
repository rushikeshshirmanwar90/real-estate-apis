import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { Staff } from "@/lib/models/users/Staff";
import { Projects } from "@/lib/models/Project";

export async function GET(req: NextRequest) {
    try {
        await connect();
        
        const { searchParams } = new URL(req.url);
        const staffId = searchParams.get("staffId");
        const clientId = searchParams.get("clientId");
        
        if (!staffId && !clientId) {
            return NextResponse.json({
                error: "Please provide staffId or clientId parameter"
            }, { status: 400 });
        }
        
        const debugInfo: any = {
            timestamp: new Date().toISOString(),
            request: { staffId, clientId }
        };
        
        // If staffId provided, get staff info and their clients
        if (staffId) {
            const staff = await Staff.findById(staffId)
                .populate('assignedProjects.projectId', 'name clientId')
                .lean() as any;
            
            if (!staff) {
                return NextResponse.json({
                    error: "Staff not found"
                }, { status: 404 });
            }
            
            debugInfo.staff = {
                _id: staff._id,
                name: `${staff.firstName} ${staff.lastName}`,
                email: staff.email,
                assignedProjectsCount: staff.assignedProjects?.length || 0
            };
            
            // Get unique client IDs from assigned projects
            const clientIds = [...new Set(
                (staff.assignedProjects || []).map((ap: any) => ap.clientId?.toString())
            )].filter(Boolean);
            
            debugInfo.clientIds = clientIds;
            
            // Get license info for each client
            debugInfo.clients = [];
            for (const cId of clientIds) {
                const client = await Client.findById(cId).select('name companyName license isLicenseActive licenseExpiryDate').lean() as any;
                if (client) {
                    const hasAccess = client.license === -1 || (client.license > 0 && client.isLicenseActive);
                    debugInfo.clients.push({
                        _id: client._id,
                        name: client.name || client.companyName,
                        license: client.license,
                        isLicenseActive: client.isLicenseActive,
                        licenseExpiryDate: client.licenseExpiryDate,
                        hasAccess: hasAccess,
                        status: hasAccess ? '✅ ACTIVE' : '❌ EXPIRED'
                    });
                }
            }
            
            // Get projects for each client
            debugInfo.projectsByClient = [];
            for (const cId of clientIds) {
                const projects = await Projects.find({ clientId: cId }).select('name _id').lean();
                const client = debugInfo.clients.find((c: any) => c._id.toString() === cId);
                debugInfo.projectsByClient.push({
                    clientId: cId,
                    clientName: client?.name || 'Unknown',
                    clientStatus: client?.status || 'Unknown',
                    projectCount: projects.length,
                    projects: projects.map((p: any) => ({
                        _id: p._id,
                        name: p.name
                    }))
                });
            }
        }
        
        // If clientId provided, get client license info
        if (clientId) {
            const client = await Client.findById(clientId).select('name companyName license isLicenseActive licenseExpiryDate').lean() as any;
            
            if (!client) {
                return NextResponse.json({
                    error: "Client not found"
                }, { status: 404 });
            }
            
            const hasAccess = client.license === -1 || (client.license > 0 && client.isLicenseActive);
            
            debugInfo.client = {
                _id: client._id,
                name: client.name || client.companyName,
                license: client.license,
                isLicenseActive: client.isLicenseActive,
                licenseExpiryDate: client.licenseExpiryDate,
                hasAccess: hasAccess,
                status: hasAccess ? '✅ ACTIVE' : '❌ EXPIRED',
                explanation: hasAccess 
                    ? `License is ${client.license === -1 ? 'LIFETIME' : `active with ${client.license} days`}`
                    : `License is ${client.license === 0 ? 'EXPIRED (0 days)' : `inactive (${client.license} days but isLicenseActive=false)`}`
            };
            
            // Get projects for this client
            const projects = await Projects.find({ clientId }).select('name _id').lean();
            debugInfo.projects = projects.map((p: any) => ({
                _id: p._id,
                name: p.name,
                shouldBeAccessible: hasAccess,
                expectedButton: hasAccess ? 'View Details' : 'Project Blocked'
            }));
        }
        
        return NextResponse.json({
            success: true,
            debug: debugInfo
        }, { status: 200 });
        
    } catch (error: any) {
        console.error("Debug license error:", error);
        return NextResponse.json({
            error: error.message || "Failed to debug license"
        }, { status: 500 });
    }
}
