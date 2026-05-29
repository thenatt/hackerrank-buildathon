// Processes a single ticket through the REAL pipeline and streams the result
// back as newline-delimited JSON so the UI can show grounding first, then the
// decision:
//   {"type":"sources", ...}   emitted right after retrieval
//   {"type":"decision", ...}  emitted after the structured LLM call
//   {"type":"error", ...}     on failure (e.g. missing index / key)
import { NextRequest } from "next/server";
import { retrieve } from "@/src/retriever";
import { decide } from "@/src/agent";
import { readTickets } from "@/src/tickets";
import { PATHS } from "@/src/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { index } = (await req.json()) as { index: number };
  const tickets = readTickets(PATHS.tickets);
  const ticket = tickets[index];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        if (!ticket) throw new Error(`No ticket at index ${index}`);

        // Phase 1: retrieval — emit the grounding sources immediately.
        const retrieval = await retrieve(ticket.issue, ticket.subject);
        send({ type: "sources", index, sources: retrieval.chunks });

        // Phase 2: the single structured decision call.
        const result = await decide(ticket, retrieval);
        send({
          type: "decision",
          index,
          status: result.status,
          request_type: result.request_type,
          product_area: result.product_area,
          response: result.response,
          justification: result.justification,
        });
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
