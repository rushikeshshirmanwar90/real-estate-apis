import { NextRequest, NextResponse } from "next/server";
import { checkValidClient } from "@/lib/auth";
import connect from "@/lib/db";

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
    const id = searchParams.get("id");
    
    return NextResponse.json(
      { 
        success: true, 
        message: "room-changes GET endpoint working",
        data: { id }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("room-changes GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
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
        message: "room-changes POST endpoint working",
        data: body
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("room-changes POST error:", error);
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
        message: "room-changes PUT endpoint working",
        data: { id, ...body }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("room-changes PUT error:", error);
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
        message: "room-changes DELETE endpoint working"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("room-changes DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};
