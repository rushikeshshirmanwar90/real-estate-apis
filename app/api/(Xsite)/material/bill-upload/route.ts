import { NextRequest } from "next/server";
import { checkValidClient } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils/api-response";

// ─── POST /api/material/bill-upload ──────────────────────────────────────────
// Uploads a photo of a vendor bill (captured on the payment step of the Xsite
// "Add Material" form) and returns the hosted URL that gets stored on the
// material / material activity as `billImages`.
//
// The upload is proxied through this route rather than done straight from the
// app so the storage config lives server-side only and every upload passes the
// same Bearer check as the rest of the material API.
//
// Accepts either:
//   • JSON:      { image: "data:image/jpeg;base64,...", fileName?, mimeType? }
//   • multipart: file=<binary>
// Responds with: { success, data: { url, publicId, width, height, bytes } }

// Matches the Cloudinary account/preset already used by the admin dashboards
// (super-admin client + agency forms), so no new storage account is needed.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dlcq8i2sc";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "realEstate";
const UPLOAD_FOLDER = process.env.CLOUDINARY_BILL_FOLDER || "material-bills";

// Bills are compressed on-device before upload; anything larger is either a
// mis-sized asset or an abuse attempt, so reject it before hitting Cloudinary.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
];

type CloudinaryUploadResult = {
  secure_url?: string;
  url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  bytes?: number;
  error?: { message?: string };
};

// "data:image/jpeg;base64,AAA…" → { mimeType, base64 }; a bare base64 string is
// accepted too and assumed to be JPEG (what the app sends after compression).
const parseDataUri = (raw: string, fallbackMime?: string) => {
  // [\s\S] rather than the /s flag — the project's TS target predates dotAll.
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(raw.trim());
  if (match) {
    return { mimeType: match[1].toLowerCase(), base64: match[2] };
  }
  return {
    mimeType: (fallbackMime || "image/jpeg").toLowerCase(),
    base64: raw.trim(),
  };
};

export const POST = async (req: NextRequest) => {
  // Bearer token authentication (same guard as the material routes)
  try {
    await checkValidClient(req);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unauthorized",
      401
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let buffer: Buffer;
    let mimeType: string;
    let fileName: string;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");

      if (!file || typeof file === "string") {
        return errorResponse("A 'file' field with the bill image is required", 400);
      }

      buffer = Buffer.from(await file.arrayBuffer());
      mimeType = (file.type || "image/jpeg").toLowerCase();
      fileName = file.name || "bill.jpg";
    } else {
      const body = await req.json().catch(() => null);

      if (!body || typeof body.image !== "string" || !body.image.trim()) {
        return errorResponse(
          "An 'image' field with a base64 (or data URI) bill image is required",
          400
        );
      }

      const parsed = parseDataUri(body.image, body.mimeType);
      mimeType = parsed.mimeType;
      fileName = typeof body.fileName === "string" && body.fileName
        ? body.fileName
        : "bill.jpg";

      buffer = Buffer.from(parsed.base64, "base64");
      if (buffer.length === 0) {
        return errorResponse("Bill image could not be decoded", 400);
      }
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return errorResponse(
        `Unsupported image type '${mimeType}'. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
        415
      );
    }

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return errorResponse(
        `Bill image is too large (${(buffer.length / (1024 * 1024)).toFixed(1)} MB). Maximum is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB`,
        413
      );
    }

    console.log("🧾 Uploading material bill:", {
      fileName,
      mimeType,
      sizeKb: Math.round(buffer.length / 1024),
      folder: UPLOAD_FOLDER,
    });

    // Unsigned upload with a preset — mirrors the existing admin dashboard flow,
    // so no API secret has to be provisioned for this route.
    const uploadForm = new FormData();
    uploadForm.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: mimeType }),
      fileName
    );
    uploadForm.append("upload_preset", UPLOAD_PRESET);
    uploadForm.append("folder", UPLOAD_FOLDER);

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: uploadForm }
    );

    const result = (await cloudinaryRes.json().catch(() => null)) as
      | CloudinaryUploadResult
      | null;

    if (!cloudinaryRes.ok || !result || (!result.secure_url && !result.url)) {
      const message = result?.error?.message || "Image host rejected the upload";
      console.error("❌ Bill upload failed:", cloudinaryRes.status, message);
      return errorResponse(`Failed to upload bill image: ${message}`, 502);
    }

    const url = result.secure_url || result.url!;
    console.log("✅ Bill uploaded:", url);

    return successResponse(
      {
        url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes ?? buffer.length,
        uploadedAt: new Date().toISOString(),
      },
      "Bill image uploaded successfully",
      201
    );
  } catch (error: unknown) {
    console.error("❌ /api/material/bill-upload error:", error);
    return errorResponse("Failed to upload bill image", 500, error);
  }
};
