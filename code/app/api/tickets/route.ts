// Returns the list of tickets to triage (inputs only), read live from the CSV.
import { NextResponse } from "next/server";
import { readTickets } from "@/src/tickets";
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
