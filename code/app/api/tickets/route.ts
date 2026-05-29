// Returns the list of tickets to triage (inputs only).
//   GET  — the bundled sample CSV (the "Run the sample batch" fallback).
//   POST — an uploaded CSV (same format), parsed server-side and returned.
import { NextRequest, NextResponse } from "next/server";
import {
  readTickets,
  parseTicketsFromText,
  TicketCsvFormatError,
} from "@/src/tickets";
import { PATHS } from "@/src/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const tickets = readTickets(PATHS.tickets).map((t, index) => ({
    index,
    ...t,
  }));
  return NextResponse.json({ tickets });
}

/** Read the uploaded CSV text from either multipart form-data or a raw body. */
async function readUploadedCsv(req: NextRequest): Promise<string> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      throw new TicketCsvFormatError("No file was included in the upload.");
    }
    return await (file as File).text();
  }
  return await req.text();
}

export async function POST(req: NextRequest) {
  try {
    const text = await readUploadedCsv(req);
    const tickets = parseTicketsFromText(text).map((t, index) => ({
      index,
      ...t,
    }));
    return NextResponse.json({ tickets });
  } catch (err) {
    if (err instanceof TicketCsvFormatError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: `Could not read the uploaded file: ${(err as Error).message}` },
      { status: 400 },
    );
  }
}
