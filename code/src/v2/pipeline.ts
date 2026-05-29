// The v2 orchestrator: one ticket -> the five fields + telemetry.
//
// Exposed two ways from ONE implementation:
//   - triageTicketV2Stream: an async generator that yields each stage
//     (sources -> analysis -> verification -> decision) for the live UI.
//   - triageTicketV2: drains the generator and returns the final result, for
//     the batch runner and calibration.
// The ticket is embedded ONCE; the vector is reused for both retrieval and
// few-shot selection (1 embed + 2 chat calls per ticket).
import { embedQuery } from "../embeddings";
import { rankChunks, ticketToQuery, type RetrievedChunk } from "../retriever";
import { TOP_K } from "../config";
import type { Ticket } from "../agent";
import type { TriageFields } from "../schema";
import { computeCoverage } from "./coverage";
import { selectFewshot } from "./fewshot";
import { analyzeTicket } from "./analyze";
import { verifyGrounding } from "./verify";
import { route } from "./route";
import type { CoverageSignal, RiskClass, V2Result, V2Telemetry } from "./types";

/** The staged events emitted while a ticket is processed. */
export type V2Stage =
  | { type: "sources"; sources: RetrievedChunk[]; coverage: CoverageSignal }
  | {
      type: "analysis";
      risk_class: RiskClass;
      intents: string[];
      request_type: string;
      product_area: string;
    }
  | { type: "verification"; grounded: boolean; unsupported_claims: string[] }
  | ({ type: "decision"; telemetry: V2Telemetry } & TriageFields);

/** Process one ticket, yielding each stage and returning the final result. */
export async function* triageTicketV2Stream(
  ticket: Ticket,
): AsyncGenerator<V2Stage, V2Result> {
  // Embed once; reuse for retrieval ranking and few-shot selection.
  const queryVec = await embedQuery(ticketToQuery(ticket.issue, ticket.subject));
  const retrieval = rankChunks(queryVec, TOP_K);
  const coverage = computeCoverage(retrieval.chunks);
  yield { type: "sources", sources: retrieval.chunks, coverage };

  const fewshot = await selectFewshot(queryVec);
  const analyze = await analyzeTicket(ticket, retrieval, fewshot);
  yield {
    type: "analysis",
    risk_class: analyze.risk_class,
    intents: analyze.intents,
    request_type: analyze.request_type,
    product_area: analyze.product_area,
  };

  const verify = await verifyGrounding(analyze.draft_response, retrieval.chunks);
  yield {
    type: "verification",
    grounded: verify.grounded,
    unsupported_claims: verify.unsupported_claims,
  };

  const fields = route(analyze, coverage, verify);
  const telemetry: V2Telemetry = {
    coverage,
    risk_class: analyze.risk_class,
    intents: analyze.intents,
    grounded: verify.grounded,
    unsupported_claims: verify.unsupported_claims,
  };
  yield { type: "decision", telemetry, ...fields };

  return { ...fields, sources: retrieval.chunks, telemetry };
}

/** Convenience wrapper: run the full pipeline and return only the result. */
export async function triageTicketV2(ticket: Ticket): Promise<V2Result> {
  const gen = triageTicketV2Stream(ticket);
  let step = await gen.next();
  while (!step.done) step = await gen.next();
  return step.value;
}
