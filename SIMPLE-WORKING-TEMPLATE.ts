// WORKING TEMPLATE - Copy this pattern for all your API routes

import { NextRequest, NextResponse } from "next/server";
import { withBearerAuth } from "@/lib/middleware/bearer-auth";
import connect from "@/lib/db";

// GET Route Template
export const GET = withBearerAuth(async (req: NextRequest) => {
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }
    
    // Your logic here
    const data = { id, message: "Success" };
    
    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
});

// POST Route Template
export const POST = withBearerAuth(async (req: NextRequest) => {
  try {
    await connect();
    
    const body = await req.json();
    
    if (!body.name) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }
    
    // Your logic here
    const result = { id: "123", name: body.name };
    
    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
});

// PUT Route Template
export const PUT = withBearerAuth(async (req: NextRequest) => {
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }
    
    // Your logic here
    const result = { id, ...body };
    
    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
});

// DELETE Route Template
export const DELETE = withBearerAuth(async (req: NextRequest) => {
  try {
    await connect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }
    
    // Your logic here
    
    return NextResponse.json(
      { success: true, message: "Deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
});