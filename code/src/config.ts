// Central configuration: filesystem paths, model names, and tuning knobs.
// Everything that another module might want to change lives here so the rest
// of the pipeline stays declarative.
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

// Load secrets from .env.local first (Next.js convention), then .env as a
// fallback. We never hardcode keys — they come from the environment only.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Resolve the repository root by walking up from the current directory until
 * we find the `data/hackerrank` corpus. This makes the scripts work whether
 * they're launched from `code/` or the repo root.
 */
function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "data", "hackerrank"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume we're inside code/ and the repo root is one level up.
  return path.resolve(start, "..");
}

export const REPO_ROOT = findRepoRoot(process.cwd());
export const CODE_DIR = path.join(REPO_ROOT, "code");

export const PATHS = {
  corpus: path.join(REPO_ROOT, "data", "hackerrank"),
  embeddings: path.join(CODE_DIR, "data", "embeddings.json"),
  sampleTickets: path.join(
    REPO_ROOT,
    "support_tickets",
    "sample_support_tickets.csv",
  ),
  tickets: path.join(REPO_ROOT, "support_tickets", "support_tickets.csv"),
  output: path.join(REPO_ROOT, "support_tickets", "output.csv"),
};

// Models. Overridable via env so the judge can swap if needed, but pinned to
// deterministic-friendly defaults.
export const EMBED_MODEL = process.env.EMBED_MODEL ?? "text-embedding-3-small";
// text-embedding-3-* supports native dimension reduction. 512 dims is plenty
// for ~470 small docs and keeps the index ~1/3 the size and faster to score.
export const EMBED_DIMENSIONS = 512;
export const CHAT_MODEL = process.env.CHAT_MODEL ?? "gpt-4o-mini";

// Retrieval: how many corpus chunks to put in front of the model per ticket.
export const TOP_K = 6;

// Determinism: every LLM call uses temperature 0 and a fixed seed.
export const TEMPERATURE = 0;
export const SEED = 42;

export function requireOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not set. Copy code/.env.example to code/.env.local and add your key.",
    );
  }
  return key;
}
