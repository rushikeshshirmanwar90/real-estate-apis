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
        message: "user GET endpoint working",
        data: { id }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("user GET error:", error);
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
        message: "user POST endpoint working",
        data: body
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("user POST error:", error);
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
        message: "user PUT endpoint working",
        data: { id, ...body }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("user PUT error:", error);
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
        message: "user DELETE endpoint working"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("user DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};
