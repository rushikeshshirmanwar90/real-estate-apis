import { NextRequest, NextResponse } from "next/server";

// Public API - No authentication required
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "XSite Marketing Information",
      data: {
        platform: "XSite - Construction Cost Intelligence Platform",
        tagline: "Streamline Your Construction Projects with Smart Cost Management",
        features: [
          {
            title: "Real-time Cost Tracking",
            description: "Monitor project expenses as they happen with detailed analytics"
          },
          {
            title: "Labor Management", 
            description: "Track staff productivity and optimize workforce allocation"
          },
          {
            title: "Equipment Monitoring",
            description: "Manage equipment usage and maintenance schedules efficiently"
          },
          {
            title: "Material Management",
            description: "Track material consumption and optimize inventory levels"
          },
          {
            title: "Project Analytics",
            description: "Comprehensive reporting and insights for better decision making"
          }
        ],
        benefits: [
          "Reduce project costs by up to 20%",
          "Improve project completion time",
          "Better resource allocation",
          "Real-time project visibility",
          "Data-driven decision making"
        ],
        targetAudience: [
          "Construction Companies",
          "Project Managers", 
          "Site Supervisors",
          "Construction Consultants",
          "Real Estate Developers"
        ]
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch marketing information" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, company, projectSize, interests } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Here you would typically save to marketing database
    // For now, just return success
    
    return NextResponse.json({
      success: true,
      message: "Marketing inquiry submitted successfully",
      data: {
        leadId: `LEAD-${Date.now()}`,
        status: "received",
        nextStep: "Our team will contact you within 24 hours"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to submit marketing inquiry" },
      { status: 500 }
    );
  }
}