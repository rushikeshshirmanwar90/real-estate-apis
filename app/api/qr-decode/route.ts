import { NextRequest, NextResponse } from "next/server";
import { Jimp } from "jimp";
// @ts-ignore - jsqr doesn't have TypeScript definitions
import jsQR from "jsqr";

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          message: "Image data is required",
        },
        { status: 400 }
      );
    }

    // Validate base64 format
    if (typeof image !== 'string' || image.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid image data format",
        },
        { status: 400 }
      );
    }

    // Check if image is too large (limit to 10MB base64)
    if (image.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: "Image too large. Please use a smaller image.",
        },
        { status: 413 }
      );
    }

    let imageBuffer;
    try {
      // Convert base64 to buffer
      imageBuffer = Buffer.from(image, "base64");
    } catch (bufferError) {
      console.error("Buffer conversion error:", bufferError);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid base64 image data",
        },
        { status: 400 }
      );
    }

    if (imageBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Empty image data",
        },
        { status: 400 }
      );
    }

    let jimpImage;
    try {
      // Read image using Jimp with error handling
      jimpImage = await Jimp.read(imageBuffer);
    } catch (jimpError) {
      console.error("Jimp read error:", jimpError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to process image. Please ensure it's a valid image file.",
        },
        { status: 400 }
      );
    }

    // Validate image dimensions
    if (!jimpImage.bitmap || jimpImage.bitmap.width === 0 || jimpImage.bitmap.height === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid image dimensions",
        },
        { status: 400 }
      );
    }

    // Get image data
    const imageData = {
      data: new Uint8ClampedArray(jimpImage.bitmap.data),
      width: jimpImage.bitmap.width,
      height: jimpImage.bitmap.height,
    };

    console.log(`📸 Processing image: ${imageData.width}x${imageData.height}`);

    let code;
    try {
      // Decode QR code using jsQR with multiple attempts
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth", // Try both normal and inverted
      });
    } catch (qrError) {
      console.error("jsQR decode error:", qrError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to scan QR code from image",
        },
        { status: 500 }
      );
    }

    if (code && code.data) {
      console.log("✅ QR Code decoded:", code.data);
      
      // Validate QR code data
      if (typeof code.data !== 'string' || code.data.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Empty QR code data",
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        {
          success: true,
          message: "QR code detected successfully",
          data: code.data.trim(),
        },
        { status: 200 }
      );
    } else {
      console.log("❌ No QR code found in image");
      return NextResponse.json(
        {
          success: false,
          message: "No QR code found in the image. Please ensure the image contains a clear, visible QR code.",
        },
        { status: 404 }
      );
    }
  } catch (error: unknown) {
    console.error("QR decode error:", error);
    
    let errorMessage = "Failed to decode QR code from image";
    
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        errorMessage = "Invalid request format";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Request timeout while processing image";
      } else if (error.message.includes('memory') || error.message.includes('heap')) {
        errorMessage = "Image too large to process";
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
