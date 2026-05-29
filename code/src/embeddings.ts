// Thin wrapper around the OpenAI embeddings API + a cosine helper.
// The client is created lazily so importing this module never requires a key
// (only actually calling the API does).
import OpenAI from "openai";
import { EMBED_MODEL, EMBED_DIMENSIONS, requireOpenAIKey } from "./config";
import type { Chunk } from "./ingest";

/** A corpus chunk with its embedding vector attached. */
export interface EmbeddedChunk extends Chunk {
  vector: number[];
}

/** Shape of the on-disk embeddings.json produced by `npm run index`. */
export interface EmbeddingIndex {
  model: string;
  dimensions: number;
  createdAt: string;
  chunks: EmbeddedChunk[];
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: requireOpenAIKey() });
  return client;
}

/**
 * Embed a batch of texts. We chunk into sub-batches to stay well under request
 * limits and keep memory flat for the full ~4.6k-chunk corpus.
 */
export async function embedTexts(
  texts: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number[][]> {
  const BATCH = 128;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await getClient().embeddings.create({
      model: EMBED_MODEL,
      dimensions: EMBED_DIMENSIONS,
      input: slice,
    });
    for (const item of res.data) out.push(item.embedding as number[]);
    onProgress?.(Math.min(i + BATCH, texts.length), texts.length);
  }
  return out;
}

/** Embed a single query string (e.g. a support ticket). */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}

/**
 * Cosine similarity between two equal-length vectors. The embedding API returns
 * unit-normalized vectors, so this is effectively a dot product, but we
 * normalize defensively to stay correct if that ever changes.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
