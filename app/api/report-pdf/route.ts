import { NextRequest, NextResponse } from "next/server";
import { verifyAuthorization } from "@/lib/auth";
import { pageFooter } from "@/lib/pdf/costReport";
import { renderPdf } from "@/lib/pdf/renderPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A year of activity for a busy project is a few MB of HTML; this is well above that.
const MAX_HTML_BYTES = 25 * 1024 * 1024;
const CHUNK_BYTES = 256 * 1024;

// Reports written for the phone's printer set no page size; give them A4.
const DEFAULT_PAGE_CSS = "<style>@page { size: A4; margin: 12mm 12mm 16mm; } html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }</style>";

function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.subarray(offset, offset + CHUNK_BYTES));
      offset += CHUNK_BYTES;
    },
  });
}

function withPageSize(html: string): string {
  if (/@page\s*\{/.test(html)) return html;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (head) => `${head}${DEFAULT_PAGE_CSS}`) : DEFAULT_PAGE_CSS + html;
}

/**
 * Prints a report the xsite app laid out (the Profile page's Complete Report)
 * to PDF. The app builds the HTML; printing it on the phone with expo-print
 * could stall for good on Android. Chrome renders it with JavaScript off and
 * every network request refused, so the page can only show what it contains.
 */
export async function POST(req: NextRequest) {
  const auth = verifyAuthorization(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.message ?? "Unauthorized" }, { status: 401 });
  }

  let html: string;
  let fileName: string;
  try {
    const body = await req.json();
    html = typeof body?.html === "string" ? body.html : "";
    fileName = typeof body?.fileName === "string" ? body.fileName : "";
  } catch {
    return NextResponse.json({ error: "Send the report as JSON" }, { status: 400 });
  }
  if (!html.trim()) return NextResponse.json({ error: "The report is empty." }, { status: 400 });
  if (Buffer.byteLength(html) > MAX_HTML_BYTES) {
    return NextResponse.json({ error: "This report is too large. Pick a shorter date range." }, { status: 413 });
  }
  fileName = (fileName.replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|\x00-\x1f]+/g, " ").trim().slice(0, 120) || "Report") + ".pdf";

  try {
    const started = Date.now();
    const pdf = await renderPdf(withPageSize(html), { footer: pageFooter(fileName.replace(/\.pdf$/i, "")) });
    const renderMs = Date.now() - started;
    console.log(`[report-pdf] ${Math.round(html.length / 1024)} KB of HTML -> ${Math.round(pdf.length / 1024)} KB PDF in ${renderMs} ms`);
    return new Response(streamOf(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
        "X-File-Name": encodeURIComponent(fileName),
        "X-Render-Ms": String(renderMs),
      },
    });
  } catch (error) {
    console.error("[report-pdf] failed:", error);
    const detail = error instanceof Error ? error.message.slice(0, 500) : String(error);
    return NextResponse.json({ error: "Could not make the PDF. Try again.", detail }, { status: 500 });
  }
}
