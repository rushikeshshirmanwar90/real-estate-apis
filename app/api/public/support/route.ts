import { NextRequest, NextResponse } from "next/server";

// Public API - No authentication required
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "XSite Support Information",
      data: {
        email: "growwithexponentor@gmail.com",
        supportHours: "Monday to Saturday: 10:00 AM – 7:00 PM IST",
        topics: [
          "Login and account issues",
          "Project creation and updates", 
          "Cost graph and analytics issues",
          "Staff management support",
          "Bug reports and feedback"
        ]
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch support information" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message, topic } = body;

    // Here you would typically save to database or send email
    // For now, just return success
    
    return NextResponse.json({
      success: true,
      message: "Support request submitted successfully",
      data: {
        ticketId: `TICKET-${Date.now()}`,
        status: "received"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to submit support request" },
      { status: 500 }
    );
  }
}