# HackerRank Support Triage Agent

A support-triage agent for the HackerRank product ecosystem, with a live UI that
shows tickets being processed. For each ticket it retrieves the most relevant
snippets from the HackerRank support corpus and emits five fields — `status`,
`request_type`, `product_area`, `response`, `justification` — grounded **only**
in the corpus, escalating the genuinely human-only / high-risk cases.

## Approach (how it works)

```
ticket ──▶ retrieve (embeddings + cosine top-k) ──▶ agent (1 structured LLM call) ──▶ 5 fields
              │                                          ▲
              └── corpus folder ─▶ product_area hint ────┘
```

- **Retrieval (RAG).** The ~470-doc corpus in `../data/hackerrank/**` is chunked
  (`src/ingest.ts`), embedded once with `text-embedding-3-small` (512-dim) into
  `data/embeddings.json` (`scripts/build-index.ts`). At runtime we embed only the
  ticket and rank chunks by cosine similarity (`src/retriever.ts`). No vector DB —
  in-memory cosine is plenty for this scale and is fully deterministic.
- **Grounding.** The agent is given only the retrieved snippets and is instructed
  never to use outside knowledge or invent policy.
- **Escalation policy.** Explicit, auditable rules in `src/policy.ts`: escalate
  only for human-authority / private-account-data / live-incident cases — **not**
  merely because a ticket mentions money or account access. Documented
  self-service flows get grounded replies.
- **The brain.** One structured-output call at `temperature 0` returns all five
  fields validated against a strict JSON schema (`src/agent.ts`, `src/schema.ts`),
  so every row is a valid CSV row.
- **`product_area`.** Normalized top-level corpus folder of the best match
  (`src/product-area-map.ts`), with `conversation_management` for out-of-scope
  chit-chat and blank for escalations.

## Project layout

```
code/
├── src/
│   ├── config.ts            # paths, model names, determinism knobs
│   ├── ingest.ts            # corpus walk + heading-aware chunking
│   ├── embeddings.ts        # OpenAI embeddings + cosine similarity
│   ├── retriever.ts         # cosine top-k retrieval
│   ├── product-area-map.ts  # folder -> product_area
│   ├── policy.ts            # escalation + request_type policy (prompt-injected)
│   ├── schema.ts            # strict 5-field JSON schema + normalization
│   ├── agent.ts             # the single structured-output decision call
│   └── tickets.ts           # CSV read/write
├── scripts/
│   ├── build-index.ts       # precompute embeddings.json  (npm run index)
│   ├── calibrate.ts         # score vs. the 7 labeled samples (npm run calibrate)
│   └── run.ts               # triage all 16 -> output.csv  (npm run run:tickets)
└── app/                     # Next.js live UI (queue / ticket+decision / sources)
```

## Setup

Requires Node.js 18+ and an OpenAI API key.

```bash
cd code
npm install
cp .env.example .env.local      # then paste your key
#   OPENAI_API_KEY=sk-...
```

The key is read from the environment only (`src/config.ts`) — never hardcoded.

## Run the agent

1. **Build the embedding index once** (regenerates `data/embeddings.json`):

   ```bash
   npm run index
   ```

2. **Produce the graded output** for all 16 tickets:

   ```bash
   npm run run:tickets        # writes ../support_tickets/output.csv
   ```

3. **(Optional) Calibrate** against the 7 labeled sample rows:

   ```bash
   npm run calibrate
   ```

## Run the UI

```bash
npm run dev                   # http://localhost:3000
```

The UI loads the 16 tickets, and **Run all** processes them through the *real*
pipeline (not a mock): for each ticket it streams the retrieved corpus sources,
then the decision and the response. Requires `npm run index` to have been run and
`OPENAI_API_KEY` to be set.

## Determinism

- `temperature: 0` and a fixed `seed` on every LLM call (`src/config.ts`).
- Fixed `TOP_K` retrieval; the index is precomputed and stable.
- Dependencies are pinned to exact versions.

## Known advisories

`npm audit` reports transitive advisories in `next` / `postcss` whose only fix is
a major Next.js upgrade. They are build-time/SSR concerns not exploitable in this
local-only UI, so the major bump is intentionally deferred.
