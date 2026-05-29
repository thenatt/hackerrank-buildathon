// The "Evidence" axis: how well the retrieved corpus actually covers the ticket.
//
// This is intentionally deterministic and explainable — a blend of the best
// single match and the average of the top-k — so the escalate/fallback decision
// rests on a number we can show in the UI, not a model's mood.
import {
  COVERAGE_TOP1_WEIGHT,
  COVERAGE_MEAN_WEIGHT,
} from "./config-v2";
import type { RetrievedChunk } from "../retriever";
import type { CoverageSignal } from "./types";

/** Compute the coverage signal from the retrieved chunks (already ranked). */
export function computeCoverage(chunks: RetrievedChunk[]): CoverageSignal {
  if (!chunks.length) return { score: 0, top1: 0, meanTopK: 0 };

  const top1 = chunks[0].score;
  const meanTopK =
    chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length;
  const score = COVERAGE_TOP1_WEIGHT * top1 + COVERAGE_MEAN_WEIGHT * meanTopK;

  return { score, top1, meanTopK };
}
