import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    try {
        await connect();
        
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');

        console.log('\n========================================');
        console.log('📋 CLIENT PROJECTS API');
        console.log('========================================');
        console.log('Request Parameters:');
        console.log('  - Client ID:', clientId);

        // Validation
        if (!clientId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "clientId is required",
                },
                { status: 400 }
            );
        }

        // Fetch projects for this client
        const projects = await Projects.find({ clientId })
            .select('_id name title createdAt')
            .sort({ createdAt: -1 }) // Latest first
            .lean();

        console.log('✅ Found Projects:', projects.length);

        // Process projects to ensure consistent naming
        const processedProjects = projects.map((project: any) => ({
            _id: project._id.toString(),
            name: project.name || project.title || 'Unnamed Project',
            createdAt: project.createdAt || new Date().toISOString()
        }));

        console.log('📋 Processed Projects:');
        processedProjects.forEach((project, index) => {
            console.log(`  ${index + 1}. ${project.name} (ID: ${project._id})`);
        });

        console.log('========================================\n');

        return NextResponse.json(
            {
                success: true,
                data: {
                    projects: processedProjects,
                    count: processedProjects.length
                },
                message: `Found ${processedProjects.length} projects`
            },
            { status: 200 }
        );

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ Error in client-projects API:", msg);
        console.error("Stack trace:", error);
        
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch client projects",
                details: msg
            },
            { status: 500 }
        );
    }
};