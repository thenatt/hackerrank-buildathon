// Retriever: given a ticket, return the most relevant corpus chunks.
//
// Loads the precomputed embeddings.json once (cached in memory), embeds the
// ticket query, and ranks every chunk by cosine similarity. The top chunk's
// folder also yields a free product_area candidate.
import fs from "node:fs";
import { PATHS, TOP_K } from "./config";
import {
  cosineSimilarity,
  embedQuery,
  type EmbeddedChunk,
  type EmbeddingIndex,
} from "./embeddings";
import { folderToProductArea } from "./product-area-map";

export interface RetrievedChunk {
  id: string;
  text: string;
  sourcePath: string;
  folder: string;
  title: string;
  sourceUrl?: string;
  /** Cosine similarity to the ticket query, in [-1, 1]. */
  score: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  /** product_area candidate derived from the top chunk's folder. */
  productAreaCandidate: string;
}

// Cache the parsed index so we only read/parse the big file once per process.
let indexCache: EmbeddingIndex | null = null;

function loadIndex(): EmbeddingIndex {
  if (indexCache) return indexCache;
  if (!fs.existsSync(PATHS.embeddings)) {
    throw new Error(
      `Embedding index not found at ${PATHS.embeddings}. Run "npm run index" first.`,
    );
  }
  indexCache = JSON.parse(
    fs.readFileSync(PATHS.embeddings, "utf8"),
  ) as EmbeddingIndex;
  return indexCache;
}

/** Build the query we embed for retrieval from a ticket's fields. */
export function ticketToQuery(issue: string, subject?: string): string {
  // Subject is often noisy/blank, so we lead with the issue body and append
  // the subject only as light extra signal.
  return subject?.trim() ? `${issue}\n\nSubject: ${subject}` : issue;
}

/**
 * Retrieve the top-k chunks for a ticket. Returns chunks sorted by descending
 * similarity plus a product_area candidate from the best match.
 */
export async function retrieve(
  issue: string,
  subject?: string,
  k: number = TOP_K,
): Promise<RetrievalResult> {
  const index = loadIndex();
  const queryVec = await embedQuery(ticketToQuery(issue, subject));

  const scored = index.chunks.map((c: EmbeddedChunk) => ({
    chunk: c,
    score: cosineSimilarity(queryVec, c.vector),
  }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, k).map(
    ({ chunk, score }): RetrievedChunk => ({
      id: chunk.id,
      text: chunk.text,
      sourcePath: chunk.sourcePath,
      folder: chunk.folder,
      title: chunk.title,
      sourceUrl: chunk.sourceUrl,
      score,
    }),
  );

  return {
    chunks: top,
    productAreaCandidate: top.length ? folderToProductArea(top[0].folder) : "general",
  };
}
