import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/db";
import { Client } from "@/lib/models/super-admin/Client";
import { Admin } from "@/lib/models/users/Admin";
import { Types } from "mongoose";

const SHIVAI_CLIENT_ID = "69600d70cd1b223a43790497";

export const POST = async (req: NextRequest) => {
  try {
    await connect();

    // Check if any admins exist with this clientId
    console.log(`🔍 Checking for admins with clientId: ${SHIVAI_CLIENT_ID}`);
    const adminsWithClientId = await Admin.find({ clientId: SHIVAI_CLIENT_ID });
    console.log(`📊 Found ${adminsWithClientId.length} admin(s) with this clientId`);

    console.log(`🔍 Checking if Client document exists with ID: ${SHIVAI_CLIENT_ID}`);
    
    const existingClient = await Client.findById(SHIVAI_CLIENT_ID);

    if (existingClient) {
      return NextResponse.json({
        success: true,
        message: "Client document already exists",
        data: {
          client: existingClient,
          adminCount: adminsWithClientId.length,
        },
      }, { status: 200 });
    }

    console.log("❌ Client document not found. Creating new client...");

    const newClient = new Client({
      _id: new Types.ObjectId(SHIVAI_CLIENT_ID),
      name: "Shivai Construction",
      phoneNumber: 9876543210, // Replace with actual phone
      email: "admin@shivaiconstruction.com", // Replace with actual email
      city: "Mumbai",
      state: "Maharashtra",
      address: "Mumbai, Maharashtra, India",
      logo: "", // Optional
    });

    await newClient.save();

    console.log("✅ Client document created successfully");

    return NextResponse.json({
      success: true,
      message: "Client document created successfully. Your admin dashboard should now work.",
      data: {
        client: newClient,
        adminCount: adminsWithClientId.length,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to setup client",
      error: error.message,
    }, { status: 500 });
  }
};

export const GET = async (req: NextRequest) => {
  try {
    await connect();

    // Check if any admins exist with this clientId
    const adminsWithClientId = await Admin.find({ clientId: SHIVAI_CLIENT_ID });
    
    console.log(`🔍 Checking if Client document exists with ID: ${SHIVAI_CLIENT_ID}`);
    
    const existingClient = await Client.findById(SHIVAI_CLIENT_ID);

    if (existingClient) {
      return NextResponse.json({
        success: true,
        message: "Client document exists",
        data: {
          client: existingClient,
          adminCount: adminsWithClientId.length,
          admins: adminsWithClientId.map(admin => ({
            name: `${admin.firstName} ${admin.lastName}`,
            email: admin.email,
          })),
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: "Client document not found. Use POST to create it.",
      data: {
        adminCount: adminsWithClientId.length,
        admins: adminsWithClientId.map(admin => ({
          name: `${admin.firstName} ${admin.lastName}`,
          email: admin.email,
        })),
        note: "Admins exist with this clientId, but no Client document found. This will cause API validation errors.",
      },
    }, { status: 404 });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to check client",
      error: error.message,
    }, { status: 500 });
  }
};
