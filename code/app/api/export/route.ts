// Serializes the processed rows back into a CSV download, using the exact same
// column order/quoting as the graded support_tickets/output.csv.
import { NextRequest, NextResponse } from "next/server";
import { ticketsToCsv, type OutputRow } from "@/src/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { rows } = (await req.json()) as { rows: OutputRow[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows to export." },
        { status: 400 },
      );
    }
    const csv = ticketsToCsv(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="output.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not build the CSV: ${(err as Error).message}` },
      { status: 400 },
    );
  }
}
