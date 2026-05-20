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
    
    console.log('📝 Creating mini-section with data:', body);
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, message: "Mini-section name is required" },
        { status: 400 }
      );
    }
    
    if (!body.mainSectionDetails || !body.mainSectionDetails.sectionId) {
      return NextResponse.json(
        { success: false, message: "Parent section ID is required" },
        { status: 400 }
      );
    }
    
    // Create new mini-section
    const newMiniSection = new MiniSection({
      name: body.name,
      description: body.description || '',
      projectDetails: body.projectDetails || {},
      mainSectionDetails: body.mainSectionDetails || {},
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Save to database
    const savedMiniSection = await newMiniSection.save();
    
    console.log('✅ Mini-section created successfully:', savedMiniSection._id);
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Mini-section created successfully",
        section: savedMiniSection, // Return as 'section' for compatibility
        data: savedMiniSection // Also return as 'data'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ mini-section POST error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create mini-section",
        error: error instanceof Error ? error.message : String(error)
      },
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
    
    console.log('📝 Updating mini-section:', id, body);
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Mini-section ID is required" },
        { status: 400 }
      );
    }
    
    // Find and update the mini-section
    const updatedMiniSection = await MiniSection.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updatedMiniSection) {
      return NextResponse.json(
        { success: false, message: "Mini-section not found" },
        { status: 404 }
      );
    }
    
    console.log('✅ Mini-section updated successfully:', id);
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Mini-section updated successfully",
        section: updatedMiniSection,
        data: updatedMiniSection
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ mini-section PUT error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update mini-section",
        error: error instanceof Error ? error.message : String(error)
      },
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
    
    console.log('🗑️ Deleting mini-section:', id);
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Mini-section ID is required" },
        { status: 400 }
      );
    }
    
    // Find and delete the mini-section
    const deletedMiniSection = await MiniSection.findByIdAndDelete(id).lean();
    
    if (!deletedMiniSection) {
      return NextResponse.json(
        { success: false, message: "Mini-section not found" },
        { status: 404 }
      );
    }
    
    console.log('✅ Mini-section deleted successfully:', id);
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Mini-section deleted successfully",
        data: deletedMiniSection
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ mini-section DELETE error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete mini-section",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
};