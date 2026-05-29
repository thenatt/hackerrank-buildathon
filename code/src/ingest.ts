// Corpus ingestion + chunking.
//
// Walks the HackerRank support corpus (data/hackerrank/**), reads every
// markdown article, and splits it into reasonably sized, heading-aware chunks.
// Each chunk remembers where it came from (source path + top-level folder),
// which is what powers grounding citations and the product_area mapping.
import fs from "node:fs";
import path from "node:path";
import { PATHS, REPO_ROOT } from "./config";

export interface Chunk {
  /** Stable id: "<relativePath>#<chunkIndex>". */
  id: string;
  /** Text we embed and show to the agent (includes a small metadata header). */
  text: string;
  /** Path relative to the repo root, e.g. "data/hackerrank/screen/...". */
  sourcePath: string;
  /** Top-level corpus folder, e.g. "screen" — drives product_area. */
  folder: string;
  /** Human title from the article frontmatter. */
  title: string;
  /** Canonical support.hackerrank.com URL, if present in frontmatter. */
  sourceUrl?: string;
  /** Breadcrumb trail, e.g. ["Screen", "Test Settings"]. */
  breadcrumbs: string[];
}

interface ParsedDoc {
  title: string;
  sourceUrl?: string;
  breadcrumbs: string[];
  body: string;
}

// Target chunk size in characters. Big enough to keep a section coherent,
// small enough that retrieval stays focused and embeddings stay sharp.
const MAX_CHUNK_CHARS = 1400;

/**
 * Parse the simple YAML-ish frontmatter at the top of each article. We only
 * need title, source_url, and breadcrumbs, so we hand-roll a tiny parser
 * rather than pulling in a YAML dependency.
 */
function parseFrontmatter(raw: string): ParsedDoc {
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fm) {
    return { title: "", breadcrumbs: [], body: raw.trim() };
  }
  const [, header, body] = fm;
  const lines = header.split("\n");

  let title = "";
  let sourceUrl: string | undefined;
  const breadcrumbs: string[] = [];
  let inBreadcrumbs = false;

  for (const line of lines) {
    const kv = line.match(/^(\w[\w_]*):\s*(.*)$/);
    if (kv) {
      const [, key, value] = kv;
      inBreadcrumbs = key === "breadcrumbs";
      const clean = value.replace(/^"(.*)"$/, "$1").trim();
      if (key === "title") title = clean;
      if (key === "source_url") sourceUrl = clean;
      continue;
    }
    // List items under "breadcrumbs:".
    const item = line.match(/^\s*-\s*"?(.*?)"?\s*$/);
    if (inBreadcrumbs && item) breadcrumbs.push(item[1]);
  }

  return { title, sourceUrl, breadcrumbs, body: body.trim() };
}

/**
 * Split a markdown body into chunks. We first break on markdown headings so a
 * chunk stays within one topic, then greedily pack paragraphs up to the size
 * limit, and finally hard-split any oversized block (e.g. the 225 KB pricing
 * table) so no single chunk blows past the limit.
 */
function chunkBody(body: string): string[] {
  // Split into heading-led sections. Keep the heading with its content.
  const sections = body.split(/\n(?=#{1,6}\s)/g);

  const chunks: string[] = [];
  for (const section of sections) {
    const blocks = section.split(/\n{2,}/).filter((b) => b.trim().length > 0);
    let current = "";

    const flush = () => {
      if (current.trim()) chunks.push(current.trim());
      current = "";
    };

    for (const block of blocks) {
      if (block.length > MAX_CHUNK_CHARS) {
        // Oversized single block: flush what we have, then hard-split by lines.
        flush();
        const lines = block.split("\n");
        let buf = "";
        for (const line of lines) {
          if ((buf + "\n" + line).length > MAX_CHUNK_CHARS && buf) {
            chunks.push(buf.trim());
            buf = "";
          }
          buf += (buf ? "\n" : "") + line;
        }
        if (buf.trim()) chunks.push(buf.trim());
        continue;
      }
      if ((current + "\n\n" + block).length > MAX_CHUNK_CHARS && current) {
        flush();
      }
      current += (current ? "\n\n" : "") + block;
    }
    flush();
  }
  return chunks;
}

/** Recursively list every .md file under a directory. */
function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

/**
 * Read and chunk the whole corpus. Returns a flat list of chunks ready to be
 * embedded. The top-level index.md is skipped — it's just a link directory.
 */
export function ingestCorpus(): Chunk[] {
  const files = walkMarkdown(PATHS.corpus).filter(
    (f) => path.basename(f) !== "index.md",
  );

  const chunks: Chunk[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const { title, sourceUrl, breadcrumbs, body } = parseFrontmatter(raw);

    const relPath = path.relative(REPO_ROOT, file);
    // First path segment under data/hackerrank/ is the product folder.
    const folder = path.relative(PATHS.corpus, file).split(path.sep)[0];

    const pieces = chunkBody(body);
    pieces.forEach((piece, i) => {
      // Prepend a light metadata header so embeddings capture the doc's topic,
      // not just the raw section text.
      const header = [
        breadcrumbs.length ? breadcrumbs.join(" > ") : null,
        title ? `# ${title}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      chunks.push({
        id: `${relPath}#${i}`,
        text: header ? `${header}\n\n${piece}` : piece,
        sourcePath: relPath,
        folder,
        title,
        sourceUrl,
        breadcrumbs,
      });
    });
  }
  return chunks;
}
