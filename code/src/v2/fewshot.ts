// Dynamic few-shot: anchor each decision on the most similar LABELED example.
//
// Instead of hand-tuning the prompt until the escalation rate "feels right",
// we retrieve the closest of the 7 labeled sample rows (by cosine similarity to
// the current ticket) and show it to the model as a decided precedent. The
// sample embeddings are computed once and cached for the whole process.
import { embedTexts, cosineSimilarity } from "../embeddings";
import { ticketToQuery } from "../retriever";
import { readSampleTickets, type SampleRow } from "../tickets";
import { PATHS } from "../config";
import { FEWSHOT_K } from "./config-v2";

interface EmbeddedSample {
  sample: SampleRow;
  vector: number[];
}

// Cached so we only embed the (small, fixed) sample set once per process.
let samplesCache: EmbeddedSample[] | null = null;

/** Load + embed the labeled samples once, then reuse. */
async function getEmbeddedSamples(): Promise<EmbeddedSample[]> {
  if (samplesCache) return samplesCache;
  const samples = readSampleTickets(PATHS.sampleTickets);
  const vectors = await embedTexts(
    samples.map((s) => ticketToQuery(s.issue, s.subject)),
  );
  samplesCache = samples.map((sample, i) => ({ sample, vector: vectors[i] }));
  return samplesCache;
}

/** Render one labeled sample as a compact, decided precedent for the prompt. */
function renderExemplar(s: SampleRow): string {
  return `EXAMPLE TICKET
issue: ${s.issue}
subject: ${s.subject ?? ""}
company: ${s.company ?? ""}
DECIDED AS:
  request_type: ${s.expected.request_type}
  product_area: ${s.expected.product_area || "(blank)"}
  status: ${s.expected.status}
  response: ${s.expected.response}`;
}

/**
 * Given the current ticket's query vector, return the nearest labeled examples
 * formatted as in-context precedents. Returns "" if no samples are available.
 */
export async function selectFewshot(
  queryVec: number[],
  k: number = FEWSHOT_K,
): Promise<string> {
  const samples = await getEmbeddedSamples();
  if (!samples.length) return "";

  const ranked = samples
    .map((s) => ({ s, score: cosineSimilarity(queryVec, s.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return ranked.map(({ s }) => renderExemplar(s.sample)).join("\n\n---\n\n");
}
