// Processes a single ticket through the v2 (Evidence x Risk) pipeline and
// streams each stage as newline-delimited JSON so the UI can show the reasoning
// unfold:
//   {"type":"sources", ..., coverage}        after retrieval
//   {"type":"analysis", risk_class, intents}  after the analyze call
//   {"type":"verification", grounded, ...}    after the grounding check
//   {"type":"decision", ...5 fields, telemetry} after routing
//   {"type":"error", ...}                     on failure
// This endpoint is additive — v1's /api/process is untouched.
import { NextRequest } from "next/server";
import { triageTicketV2Stream } from "@/src/v2/pipeline";
import { readTickets } from "@/src/tickets";
import { PATHS } from "@/src/config";
import type { Ticket } from "@/src/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { index, ticket: uploaded } = (await req.json()) as {
    index: number;
    ticket?: Ticket;
  };
  // Prefer the ticket sent by the client (uploaded CSV); fall back to the
  // bundled sample CSV by index for the sample-batch path.
  const ticket = uploaded ?? readTickets(PATHS.tickets)[index];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        if (!ticket) throw new Error(`No ticket at index ${index}`);

        // Drain the staged generator, forwarding each stage to the client with
        // the ticket index attached so the UI can route it to the right row.
        for await (const stage of triageTicketV2Stream(ticket)) {
          send({ index, ...stage });
        }
      } catch (err) {
        send({ type: "error", index, message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
