// Shared types for the v2 (Evidence x Risk) pipeline.
//
// v2 keeps the SAME five graded output fields as v1 (so it can later swap in),
// and adds "telemetry" — the measured signals behind the decision (coverage,
// risk, grounding) that we show in the UI and defend in the interview.
import type { TriageFields, RequestType } from "../schema";
import type { RetrievedChunk } from "../retriever";

/**
 * The risk axis. A ticket needs a human ONLY when it falls into one of the
 * first three classes; "none" means the agent may answer if it has grounding.
 */
export type RiskClass =
  | "authority" // needs a human's authority (alter a score, overturn a decision)
  | "private_data" // needs a specific account/order/candidate record we can't see
  | "live_incident" // a current, broad outage a human must investigate
  | "none"; // no human strictly required

/** Output of the analyze call: the ticket understood + a draft answer. */
export interface AnalyzeResult {
  /** The atomic asks found in the ticket (a row may contain several). */
  intents: string[];
  risk_class: RiskClass;
  request_type: RequestType;
  product_area: string;
  /** A draft, corpus-grounded answer (may be replaced by routing/verification). */
  draft_response: string;
  justification: string;
}

/** Output of the verification call: is the draft actually backed by the corpus? */
export interface VerifyResult {
  grounded: boolean;
  /** Claims in the draft that no retrieved snippet supports (empty if grounded). */
  unsupported_claims: string[];
  /** A trimmed, fully-grounded rewrite, when the model could produce one. */
  revised_response?: string;
}

/** The "Evidence" axis, derived deterministically from retrieval scores. */
export interface CoverageSignal {
  /** Blended score used for the threshold decision. */
  score: number;
  /** Cosine similarity of the single best chunk. */
  top1: number;
  /** Mean cosine similarity across the retrieved top-k. */
  meanTopK: number;
}

/** Everything the UI shows beyond the five fields — never written to CSV. */
export interface V2Telemetry {
  coverage: CoverageSignal;
  risk_class: RiskClass;
  intents: string[];
  grounded: boolean;
  unsupported_claims: string[];
}

/** Full v2 result: the five graded fields + grounding sources + telemetry. */
export interface V2Result extends TriageFields {
  sources: RetrievedChunk[];
  telemetry: V2Telemetry;
}
