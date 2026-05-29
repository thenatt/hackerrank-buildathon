// Build the embedding index once and write it to code/data/embeddings.json.
//
// This is the "precompute the expensive thing once" step: every corpus chunk
// is embedded here so that at runtime we only ever embed the 16 tickets.
// Idempotent — re-run with `--force` to rebuild from scratch.
import fs from "node:fs";
import path from "node:path";
import { ingestCorpus } from "../src/ingest";
import { embedTexts, type EmbeddingIndex } from "../src/embeddings";
import { PATHS, EMBED_MODEL, EMBED_DIMENSIONS } from "../src/config";

async function main() {
  const force = process.argv.includes("--force");

  const chunks = ingestCorpus();
  console.log(`Ingested ${chunks.length} chunks from the corpus.`);

  // Skip rebuilds unless forced or the existing index is stale.
  if (fs.existsSync(PATHS.embeddings) && !force) {
    const existing = JSON.parse(
      fs.readFileSync(PATHS.embeddings, "utf8"),
    ) as EmbeddingIndex;
    const fresh =
      existing.model === EMBED_MODEL &&
      existing.dimensions === EMBED_DIMENSIONS &&
      existing.chunks.length === chunks.length;
    if (fresh) {
      console.log(
        `Index already up to date (${existing.chunks.length} chunks). Use --force to rebuild.`,
      );
      return;
    }
    console.log("Existing index is stale; rebuilding.");
  }

  console.log(
    `Embedding with ${EMBED_MODEL} @ ${EMBED_DIMENSIONS} dims (this calls the API once)...`,
  );
  const vectors = await embedTexts(
    chunks.map((c) => c.text),
    (done, total) => {
      if (done % 512 === 0 || done === total) {
        process.stdout.write(`\r  embedded ${done}/${total}`);
      }
    },
  );
  process.stdout.write("\n");

  const index: EmbeddingIndex = {
    model: EMBED_MODEL,
    dimensions: EMBED_DIMENSIONS,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((c, i) => ({ ...c, vector: vectors[i] })),
  };

  fs.mkdirSync(path.dirname(PATHS.embeddings), { recursive: true });
  fs.writeFileSync(PATHS.embeddings, JSON.stringify(index));
  const sizeMb = (fs.statSync(PATHS.embeddings).size / 1e6).toFixed(1);
  console.log(
    `Wrote ${index.chunks.length} embedded chunks to ${PATHS.embeddings} (${sizeMb} MB).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
