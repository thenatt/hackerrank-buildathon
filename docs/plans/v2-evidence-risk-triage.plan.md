# v2 Evidence × Risk Triage — Implementation Plan

**Overall Progress:** `100%`
**Status:** Complete
**Task Ref:** exploration of "redesign the triage decision architecture" (parallel v2)
**Created:** 2026-05-29

---

## TL;DR
We're building a **parallel v2 triage pipeline** (reachable at `/#v2`, served by a new `/api/process-v2` endpoint) that replaces v1's single prompt-declared judgment with an **emergent, measurable decision**. For each ticket the v2 pipeline reuses the existing embedding index to retrieve grounding, then runs a short **deterministic** chain — *analyze* (lightweight intent extraction + risk classification + request_type/product_area + a draft response, anchored on the nearest labeled sample) → *verify* (every claim must map to a cited snippet) → *route* (a code-level **Evidence × Risk** matrix where escalation = `coverage < τ` **OR** `risk ∈ {authority, private-data, live-incident}`). It emits the **exact same five output fields** as v1 (written to `output.v2.csv`), plus UI-only telemetry (coverage score, risk chip, grounded badge). v1 (`src/*`, `/api/process`, `output.csv`) stays completely frozen until v2 is proven.

## Critical Decisions
- **Parallel, non-destructive** — new `code/src/v2/*` modules, new `/api/process-v2`, a v2 view entered via `window.location.hash === "#v2"`. Zero edits to v1 decision code, `/api/process`, or the graded `output.csv`.
- **Emergent escalation via Evidence × Risk** — routing is **deterministic code**, not an LLM judgment: `risk ∈ {authority, private_data, live_incident}` → escalate; else `coverage < τ` and no documented path → reply "not covered"/out-of-scope; else grounded reply. Kills the brittle ~20%-calibrated-to-sample behavior.
- **Determinism over sampling** — `temperature 0`, fixed `seed`, **no self-consistency sampling**. Quality comes from a bounded chain of **2 chat calls + 1 embed** per ticket (analyze, verify, query-embed), each streamed as its own UI stage for responsiveness.
- **Grounding verification gate** — a dedicated pass checks the draft response's claims against cited snippets; ungrounded claims trigger one revise, then downgrade (reply "not covered") or escalate. Targets the "faithful / non-hallucinated" scoring axis.
- **Dynamic few-shot, not rate-tuning** — inject the nearest of the 7 labeled sample rows (by cosine to the ticket) into the analyze prompt as a live precedent.
- **Reuse, don't rebuild** — reuse `retriever.ts`, `embeddings.ts`, `product-area-map.ts`, `tickets.ts`, and the v1 `normalizeFields`/field conventions and existing `data/embeddings.json` (no re-indexing).
- **Same output schema** — v2 produces identical 5 fields; coverage/risk/verification are **telemetry only, never CSV columns**.
- **Model unchanged** — `gpt-4o-mini` + `text-embedding-3-small` throughout.

## Out of Scope
- Any change to v1 decision code (`src/agent.ts`, `src/policy.ts`), `/api/process`, `/api/tickets`, the corpus, or `support_tickets/output.csv`.
- Agentic/ReAct tool-use loops; HyDE / hybrid BM25 / reranking retrieval (cosine index reused as-is).
- Self-consistency / temperature sampling.
- Re-embedding or re-chunking the corpus.
- Promoting v2 to the graded submission (a later, explicit decision once proven).
- Deep visual redesign of the v2 view (light-touch signals only, on the existing dark token system).

---

## Tasks

- [x] 🟩 **Step 1: v2 types + risk taxonomy**
  _What:_ Add `code/src/v2/types.ts` (Intent, `RiskClass = "authority" | "private_data" | "live_incident" | "none"`, CoverageSignal, AnalyzeResult, VerifyResult, V2Decision incl. telemetry) and `code/src/v2/risk-taxonomy.ts` (explicit, prompt-injectable definitions of each risk class, ported/sharpened from v1 `policy.ts` — human-authority, account-specific/PII, broad live incident).
  _Why:_ A typed contract + an auditable risk taxonomy is the backbone the analyze/route steps consume and the interview defends.
  _Files:_ `code/src/v2/types.ts`, `code/src/v2/risk-taxonomy.ts`.

- [x] 🟩 **Step 2: Dynamic few-shot selector**
  _What:_ `code/src/v2/fewshot.ts` — read the 7 labeled rows (`readSampleTickets`), embed each ticket once (cached), and given the current ticket's query vector return the nearest 1–2 labeled exemplars formatted for the prompt.
  _Why:_ Anchors each decision on the closest decided precedent instead of a hand-tuned escalation rate; deterministic and near-free.
  _Files:_ `code/src/v2/fewshot.ts` (reuses `embeddings.ts`, `tickets.ts`).

- [x] 🟩 **Step 3: Analyze call (structured)**
  _What:_ `code/src/v2/analyze.ts` + its schema — one `temp 0` structured-output call taking the ticket + retrieved snippets + nearest exemplar, returning: `intents[]`, `risk_class`, `request_type`, `product_area`, and a **draft** `response` + `justification`. Treats ticket text as data (port v1 injection guard).
  _Why:_ Consolidates classification, intent surfacing, and a grounded draft into one deterministic call; the draft feeds verification, the structured fields feed routing.
  _Files:_ `code/src/v2/analyze.ts`, `code/src/v2/schema-v2.ts`.

- [x] 🟩 **Step 4: Coverage signal**
  _What:_ In `code/src/v2/coverage.ts`, compute a deterministic coverage score from retrieval (top-1 cosine + mean of top-k, normalized) and expose τ as a tunable constant in `config` (e.g. `code/src/v2/config-v2.ts`).
  _Why:_ Coverage is the "Evidence" axis of the matrix — a number we can show and threshold, not a model mood.
  _Files:_ `code/src/v2/coverage.ts`, `code/src/v2/config-v2.ts`.

- [x] 🟩 **Step 5: Verification call (grounding gate)**
  _What:_ `code/src/v2/verify.ts` + schema — a `temp 0` structured call that checks each concrete claim/step in the draft response against the cited snippets, returning `grounded: boolean`, `unsupported_claims[]`, and an optional `revised_response`.
  _Why:_ Turns "avoid hallucinated policy" from hope into a mechanism and produces the UI's grounded ✓ / unverified ⚠ badge.
  _Files:_ `code/src/v2/verify.ts`, `code/src/v2/schema-v2.ts`.

- [x] 🟩 **Step 6: Evidence × Risk router (deterministic)**
  _What:_ `code/src/v2/route.ts` — pure function over `{risk_class, coverage, grounded}`: high-risk → `escalated`; else ungrounded/`coverage < τ` with no documented path → reply "not covered"/out-of-scope; else grounded reply. Aggregates multi-intent (escalate if ANY sub-intent is high-risk). Applies v1 `normalizeFields` + field conventions (blank `product_area` + "Escalate to a human" on escalation; `conversation_management`/blank for invalid).
  _Why:_ The centerpiece — escalation becomes an explainable function of two measured axes, reusing v1's exact output conventions so v2 is swap-in compatible.
  _Files:_ `code/src/v2/route.ts` (reuses `src/schema.ts`).

- [x] 🟩 **Step 7: v2 pipeline orchestrator**
  _What:_ `code/src/v2/pipeline.ts` exporting `triageTicketV2(ticket)` and a staged async generator (`retrieve → analyze → verify → route`) so both the batch runner and the streaming API consume one source of truth. Emits the final 5 fields + telemetry.
  _Why:_ Single orchestration path keeps batch output and live UI identical and the call budget bounded.
  _Files:_ `code/src/v2/pipeline.ts`.

- [x] 🟩 **Step 8: Batch runner → `output.v2.csv`**
  _What:_ `code/scripts/run-v2.ts` (npm script `run:tickets:v2`) runs `triageTicketV2` over all 16 and writes `support_tickets/output.v2.csv` via the existing `writeOutput` (identical columns).
  _Why:_ Produces the comparable v2 artifact without touching the graded `output.csv`.
  _Files:_ `code/scripts/run-v2.ts`, `code/package.json`, `support_tickets/output.v2.csv` (generated).

- [x] 🟩 **Step 9: Calibrate v2 on the 7 samples** _(7/7 on status / request_type / product_area)_
  _What:_ `code/scripts/calibrate-v2.ts` (npm script `calibrate:v2`) scores v2 against the 7 labeled rows (status / request_type / product_area) and tune τ + risk taxonomy wording until v2 matches v1's 7/7 on the discrete fields.
  _Why:_ The 7 rows are the only ground truth; calibration here is what justifies τ and the risk classes in the interview.
  _Files:_ `code/scripts/calibrate-v2.ts`, `code/package.json`.

- [x] 🟩 **Step 10: `/api/process-v2` streaming endpoint**
  _What:_ `code/app/api/process-v2/route.ts` — mirrors `/api/process` but streams the richer NDJSON contract: `{type:"sources"}` → `{type:"analysis", risk_class, coverage, intents}` → `{type:"verification", grounded, unsupported_claims}` → `{type:"decision", ...5 fields}` → `{type:"error"}`.
  _Why:_ Feeds the live v2 view; new event types are additive and isolated to this endpoint (v1 `/api/process` untouched).
  _Files:_ `code/app/api/process-v2/route.ts`.

- [x] 🟩 **Step 11: v2 view at `/#v2` (light-touch UI)**
  _What:_ In `page.tsx`, detect `window.location.hash === "#v2"` to enter a v2 run scene that consumes `/api/process-v2`. Extend the client types + a v2 `TicketDetail` variant to render a **coverage score**, a **risk-class chip**, and a **grounded ✓ / unverified ⚠ badge** alongside the existing queue/decision/sources. Reuse `Queue`/`Sources` as-is.
  _Why:_ Satisfies "light touch" — the new signals make the demo *show its reasoning*, with minimal surface change and no disturbance to the default v1 journey.
  _Files:_ `code/app/page.tsx`, `code/app/components/types.ts`, a v2 detail component (e.g. `code/app/components/TicketDetailV2.tsx`), `globals.css` (chip/badge styles via existing tokens).

- [x] 🟩 **Step 12: Determinism + isolation verification** _(2 runs identical on discrete fields; frozen files untouched; adversarial #1/#15 not obeyed)_
  _What:_ Run `run:tickets:v2` twice and diff `output.v2.csv` (discrete fields must be identical); confirm adversarial rows (#1 "increase my score", #15 "delete all files") behave correctly; verify `git status` shows **no** changes to `src/agent.ts`, `src/policy.ts`, `/api/process`, or `output.csv`. Lint all touched files clean.
  _Why:_ Determinism is a scored axis and the whole premise is non-destructive parallelism — both must be proven.
  _Files:_ all v2 files (verification only).

- [x] 🟩 **Step 13: v2 README section + log the turn**
  _What:_ Add a "v2 (Evidence × Risk)" section to `code/README.md` (architecture diagram, how to run `run:tickets:v2` / `calibrate:v2`, how to open `/#v2`), and append the §5.2 turn entry to `~/hackerrank_buildathon/log.txt`.
  _Why:_ Reproducibility is scored; logging is mandatory per AGENTS.md.
  _Files:_ `code/README.md`, `~/hackerrank_buildathon/log.txt` (outside repo).

---

## Risks & Watchouts
- **Don't touch v1.** Any diff to `src/agent.ts`, `src/policy.ts`, `/api/process`, or `output.csv` violates the parallel premise — verify in Step 12.
- **Unverifiable accuracy.** Only 7/16 rows are labeled; v2's edge is defensibility + grounding, not a provable score bump. Calibrate on the 7, eyeball the 16, don't over-claim.
- **τ overfitting.** A threshold tuned only to make the 7 pass can be as brittle as the old rate — keep τ justified by the coverage distribution, not reverse-engineered to a target count.
- **Latency.** 2 chat calls + 1 embed per ticket is ~1.5–2× v1; rely on staged streaming so the demo stays lively. If verification doubles cost on easy tickets, consider skipping verify when coverage is very high (document the shortcut).
- **product_area drift.** Multi-intent aggregation must still emit a single best-fit area from the allowed enum — pick the primary (highest-coverage) intent's area.
- **Borderline flips.** v2 may legitimately reclassify v1 rows (e.g. #13 "Resume Builder is Down" — single feature vs. incident). That's a feature, but note the divergence when comparing `output.v2.csv` to `output.csv`.
- **Hash routing.** `window.location.hash` entry must not break the default landing scene or SSR; guard for client-only access.

## Done Criteria
- `/#v2` runs the real v2 pipeline live, streaming sources → analysis (risk + coverage) → verification → decision, with the coverage score, risk chip, and grounded badge visible.
- `support_tickets/output.v2.csv` has 16 rows in the exact v1 column schema and valid allowed values.
- v2 matches v1's 7/7 on the labeled sample's discrete fields after calibration; escalation is produced by the Evidence × Risk router, not a fixed rate.
- Two consecutive `run:tickets:v2` runs are byte-identical on discrete fields; adversarial rows are not obeyed.
- `git status` confirms v1 decision code, `/api/process`, and `output.csv` are unchanged.
- `code/README.md` documents v2; the turn is appended to the log.
