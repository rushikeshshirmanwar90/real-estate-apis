// Example: How to add caching to your project API
import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project"; // Adjust import path
import {  getCachedResponse, cacheResponse, invalidateCache } from "@/lib/middleware/cacheMiddleware";

// GET - Retrieve projects with caching
export async function GET(request: NextRequest) {
  try {
    
    await connect();
    
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const skipCache = searchParams.get('skipCache') === 'true';
    
    // Generate cache key
    const cacheKey = `projects:${clientId || 'all'}`;
    
    // Try cache first (unless skipping)
    if (!skipCache) {
      const cachedData = await getCachedResponse(cacheKey);
      if (cachedData) {
        console.log(`🎯 Cache HIT for projects: ${cacheKey}`);
        return NextResponse.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }
    }
    
    console.log(`🔍 Cache MISS for projects: ${cacheKey}`);
    
    // Fetch from database
    let query = {};
    if (clientId) {
      query = { clientId };
    }
    
    const projects = await Projects.find(query)
      .select('name description status clientId createdAt')
      .sort({ createdAt: -1 });
    
    // Cache the result for 10 minutes
    await cacheResponse(cacheKey, projects, 600);
    
    return NextResponse.json({
      success: true,
      data: projects,
      cached: false
    });
    
  } catch (error) {
    console.error("Projects GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve projects" },
      { status: 500 }
    );
  }
}

// POST - Create project and invalidate cache
export async function POST(request: NextRequest) {
  try {
    await connect();
    
    const body = await request.json();
    const { name, description, clientId } = body;
    
    // Create project
    const project = new Projects({
      name,
      description,
      clientId,
      createdAt: new Date()
    });
    
    await project.save();
    
    // Invalidate related caches
    await invalidateCache('projects:*');
    console.log('🗑️ Invalidated projects cache after creation');
    
    return NextResponse.json({
      success: true,
      message: "Project created successfully",
      data: project
    });
    
  } catch (error) {
    console.error("Projects POST error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
