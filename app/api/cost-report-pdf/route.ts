import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connect from "@/lib/db";
import { verifyAuthorization } from "@/lib/auth";
import { Client } from "@/lib/models/super-admin/Client";
import { costReportFileName, costReportFooter, costReportHtml, CostReportRequestError, parseCostReport } from "@/lib/pdf/costReport";
import { renderPdf } from "@/lib/pdf/renderPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK_BYTES = 256 * 1024;

/** The PDF as a stream, so a large report isn't held in one response buffer. */
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

/** The client's company name for the report header; "Company" if it can't be found. */
async function companyNameOf(clientId: string): Promise<string> {
  if (!clientId || !Types.ObjectId.isValid(clientId)) return "Company";
  try {
    await connect();
    const client = await Client.findById(clientId).select("name").lean<{ name?: string }>();
    return client?.name?.trim() || "Company";
  } catch {
    return "Company";
  }
}

/**
 * Makes a Cost Summary report PDF (materials, equipment, other costs or
 * contractors). The xsite app posts the rows it shows and gets the PDF back.
 * Phones used to print it themselves with expo-print, and on Android that
 * could stall for good.
 */
export async function POST(req: NextRequest) {
  const auth = verifyAuthorization(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.message ?? "Unauthorized" }, { status: 401 });
  }

  let report;
  try {
    report = parseCostReport(await req.json());
  } catch (error) {
    const message = error instanceof CostReportRequestError ? error.message : "Send the report as JSON";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const started = Date.now();
    const companyName = await companyNameOf(report.clientId);
    const pdf = await renderPdf(costReportHtml(report, companyName), { footer: costReportFooter(report, companyName) });
    const renderMs = Date.now() - started;
    console.log(
      `[cost-report-pdf] ${report.type}, ${report.rows.length} rows, ${Math.round(pdf.length / 1024)} KB in ${renderMs} ms`
    );

    const fileName = costReportFileName(report);
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
    console.error("[cost-report-pdf] failed:", error);
    // `detail` is the underlying error, so a failure can be traced without the server logs.
    const detail = error instanceof Error ? error.message.slice(0, 500) : String(error);
    return NextResponse.json({ error: "Could not make the PDF. Try again.", detail }, { status: 500 });
  }
}
