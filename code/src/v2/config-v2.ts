// v2 tuning knobs, kept separate from the v1 config so the two pipelines never
// interfere. We deliberately REUSE v1's model + determinism settings (same
// model, temperature 0, fixed seed) and only add the few v2-specific dials.
import { PATHS } from "../config";

// Where the v2 batch runner writes its predictions. The graded v1 output.csv
// is never touched — v2 produces a sibling file for side-by-side comparison.
export const OUTPUT_V2_PATH = PATHS.output.replace(/output\.csv$/, "output.v2.csv");

// COVERAGE THRESHOLD (the "Evidence" axis).
// A genuine support reply is only trusted when the retrieved corpus actually
// covers the question. Below this score we fall back to a safe "contact support"
// reply instead of a possibly-ungrounded answer. Calibrated against the 7
// labeled sample rows (see scripts/calibrate-v2.ts).
export const COVERAGE_TAU = 0.3;

// How the coverage score blends the retrieval signal: the single best chunk
// matters most, the breadth of the top-k is a secondary sanity check.
export const COVERAGE_TOP1_WEIGHT = 0.7;
export const COVERAGE_MEAN_WEIGHT = 0.3;

// How many labeled sample rows to inject as in-context precedents per ticket.
export const FEWSHOT_K = 2;
