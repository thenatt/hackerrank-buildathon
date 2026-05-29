// The Evidence x Risk router — the decision itself, made by CODE, not the LLM.
//
// This is the centerpiece of v2: escalate-vs-reply is no longer a model
// judgment but a transparent function of two measured axes:
//   - RISK  (from analyze): does this genuinely need a human?
//   - EVIDENCE (coverage + grounding): is our answer actually backed by the corpus?
// It reuses v1's exact output conventions (via normalizeFields) so a v2 row is
// shape-identical to a v1 row.
import { normalizeFields, type TriageFields } from "../schema";
import { COVERAGE_TAU } from "./config-v2";
import { riskRequiresHuman } from "./risk-taxonomy";
import type { AnalyzeResult, CoverageSignal, VerifyResult } from "./types";

// A safe, corpus-neutral reply used when we can't ground a real answer. It makes
// no policy claims — it only points the user to the official support channel.
const FALLBACK_RESPONSE =
  "I couldn't find a definitive answer for this in the HackerRank support documentation. Please submit a request by selecting Support in the footer of the HackerRank for Work platform, or email support@hackerrank.com, and our team will assist you further.";

/**
 * Decide the five fields from the analyzed ticket + the two evidence signals.
 * Precedence: risk first, then out-of-scope, then the grounded-reply gate.
 */
export function route(
  analyze: AnalyzeResult,
  coverage: CoverageSignal,
  verify: VerifyResult,
): TriageFields {
  // 1. RISK GATE — a human is required regardless of how good our evidence is.
  if (riskRequiresHuman(analyze.risk_class)) {
    return normalizeFields({
      status: "escalated",
      request_type: analyze.request_type,
      product_area: "", // normalized anyway; explicit for clarity
      response: "Escalate to a human",
      justification: analyze.justification,
    });
  }

  // 2. OUT-OF-SCOPE / INVALID — chit-chat, courtesy, or malicious asks. These
  // are declines, not grounded answers, so they skip the evidence gate.
  if (analyze.request_type === "invalid") {
    return normalizeFields({
      status: "replied",
      request_type: "invalid",
      product_area: analyze.product_area, // conversation_management or ""
      response: analyze.draft_response,
      justification: analyze.justification,
    });
  }

  // 3. GENUINE SUPPORT REPLY — gated by EVIDENCE (coverage) x GROUNDING.
  // Use the full draft only when it's verified grounded AND retrieval coverage
  // clears the threshold. Otherwise prefer a trimmed grounded rewrite, and if
  // even that isn't possible, fall back to a safe support-contact reply.
  const trustworthy = verify.grounded && coverage.score >= COVERAGE_TAU;
  let response: string;
  let justification = analyze.justification;

  if (trustworthy) {
    response = analyze.draft_response;
  } else if (verify.revised_response) {
    response = verify.revised_response;
    justification = `${justification} (Response trimmed to only corpus-supported steps during grounding verification.)`;
  } else {
    response = FALLBACK_RESPONSE;
    justification = `Replied with a safe support-contact fallback because the corpus did not sufficiently cover this request (coverage ${coverage.score.toFixed(
      2,
    )}, grounded=${verify.grounded}).`;
  }

  return normalizeFields({
    status: "replied",
    request_type: analyze.request_type,
    product_area: analyze.product_area,
    response,
    justification,
  });
}
