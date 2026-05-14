import { NextRequest, NextResponse } from "next/server";
import { checkValidClient } from "@/lib/auth";
import connect from "@/lib/db";
import { MiniSection } from "@/lib/models/Xsite/mini-section";

export const GET = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");
    const id = searchParams.get("id");
    
    console.log('📥 Mini-section GET request:', { sectionId, id });
    
    // If specific mini-section ID is provided, fetch that one
    if (id) {
      const miniSection = await MiniSection.findById(id).lean();
      
      if (!miniSection) {
        return NextResponse.json(
          { success: false, message: "Mini-section not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          success: true, 
          message: "Mini-section fetched successfully",
          data: [miniSection] // Return as array for consistency
        },
        { status: 200 }
      );
    }
    
    // If sectionId is provided, fetch all mini-sections for that parent section
    if (sectionId) {
      const miniSections = await MiniSection.find({
        "mainSectionDetails.sectionId": sectionId
      })
      .sort({ createdAt: -1 }) // Newest first
      .lean();
      
      console.log(`✅ Found ${miniSections.length} mini-sections for sectionId: ${sectionId}`);
      
      return NextResponse.json(
        { 
          success: true, 
          message: `Found ${miniSections.length} mini-sections`,
          data: miniSections
        },
        { status: 200 }
      );
    }
    
    // If no parameters provided, return error
    return NextResponse.json(
      { 
        success: false, 
        message: "Please provide either 'id' or 'sectionId' parameter"
      },
      { status: 400 }
    );
    
  } catch (error) {
    console.error("❌ mini-section GET error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    await connect();
    
    const body = await req.json();
    
    return NextResponse.json(
      { 
        success: true, 
        message: "mini-section POST endpoint working",
        data: body
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("mini-section POST error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();
    
    return NextResponse.json(
      { 
        success: true, 
        message: "mini-section PUT endpoint working",
        data: { id, ...body }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("mini-section PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const DELETE = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    return NextResponse.json(
      { 
        success: true, 
        message: "mini-section DELETE endpoint working"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("mini-section DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};
