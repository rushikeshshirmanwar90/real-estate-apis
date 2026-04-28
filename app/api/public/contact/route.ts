import { NextRequest, NextResponse } from "next/server";

// Public API - No authentication required
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "XSite Contact Information",
      data: {
        company: "XSite - Construction Cost Intelligence Platform",
        email: "growwithexponentor@gmail.com",
        businessHours: "Monday to Saturday: 10:00 AM – 7:00 PM IST",
        services: [
          "Construction Project Management",
          "Cost Tracking & Analytics", 
          "Labor Management",
          "Equipment Tracking",
          "Material Management"
        ]
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch contact information" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, message, inquiryType } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Here you would typically save to database or send email
    // For now, just return success
    
    return NextResponse.json({
      success: true,
      message: "Contact request submitted successfully",
      data: {
        inquiryId: `INQ-${Date.now()}`,
        status: "received",
        estimatedResponse: "24-48 hours"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to submit contact request" },
      { status: 500 }
    );
  }
}