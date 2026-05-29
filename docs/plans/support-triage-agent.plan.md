# HackerRank Support Triage Agent — Implementation Plan

**Overall Progress:** `100%` _(All 12 steps complete. Final `git commit`/`push` is the user's submission step.)_  
**Status:** Complete  
**Task Ref:** problem_statement.md (HackerRank Buildathon starter repo)  
**Created:** 2026-05-29

---

## TL;DR
We're building a support-triage agent for HackerRank with a live UI. For each of the 16 tickets in `support_tickets.csv`, the agent retrieves the most relevant snippets from the ~470-doc HackerRank support corpus and emits five fields (`status`, `request_type`, `product_area`, `response`, `justification`), grounded only in the corpus and escalating the genuinely human-only / high-risk minority. Stack: Next.js full-stack + OpenAI, with embeddings + in-memory cosine retrieval (precomputed once), a folder→`product_area` mapping, and an explicit escalation policy. We secure a correct, scorable `output.csv` first; a clean boilerplate UI sits on top, with deep UI polish deferred to a separate session.

## Critical Decisions
- **Stack: Next.js (TypeScript) full-stack** — single language, single deploy, pipeline + UI in one app; UI polish is directly scored. RAG here is featherweight, so Python's ML edge is irrelevant at this scale.
- **Retrieval: OpenAI embeddings + in-memory cosine, precomputed once** — best grounding-per-line-of-code, zero infra, deterministic. No vector DB for ~470 small docs.
- **`product_area`: normalized top-level corpus folder names** (`screen`, `community`, `interviews`, `settings`, `integrations`, `library`, `engage`, `skillup`, `chakra`, `general`) **+** special `conversation_management` for chit-chat/out-of-scope **+** blank for escalations (matches the sample).
- **Escalation principle:** escalate only when the request needs human authority, private/account-specific data, or is a live incident — NOT merely because it mentions money or account access. Documented self-service flows get grounded replies. Result: ~3/16 (≈19%) escalate (tickets 1, 3, 6).
- **Agent brain: a single structured-output LLM call** returns all five fields at once, given the ticket + retrieved snippets, at temperature 0 for determinism.
- **Calibration target:** match the 7 labeled rows in `sample_support_tickets.csv`.

## Out of Scope
- Deep UI polish / bespoke visual design (separate dedicated session — boilerplate-but-clean only for now).
- Vector database or external retrieval infrastructure.
- Multi-turn / conversational ticket handling.
- Any live web calls for ground-truth answers (corpus-only).
- Authentication, user accounts, persistence beyond local files.
- Vercel deployment (decided later as part of the UI session).

---

## Tasks

- [x] 🟩 **Step 1: Bootstrap repo into the workspace**  
  _What:_ Clone the starter repo into this workspace so `code/`, `data/hackerrank/`, and `support_tickets/` exist locally; confirm corpus + both CSVs are present.  
  _Why:_ Nothing but a screenshot + `.cursor/` exists here yet; all build artifacts depend on the corpus and CSVs being on disk.  
  _Files:_ workspace root (clone target), `data/hackerrank/**`, `support_tickets/*.csv`.

- [x] 🟩 **Step 2: Scaffold the Next.js app in `code/`**  
  _What:_ Initialize a TypeScript Next.js (App Router) app inside `code/`, install the OpenAI SDK, set up `.env` reading `OPENAI_API_KEY`, add scripts for indexing and batch-run.  
  _Why:_ Establishes the single app that hosts both the pipeline and the UI.  
  _Files:_ `code/package.json`, `code/.env.example`, `code/tsconfig.json`, `code/app/`.

- [x] 🟩 **Step 3: Corpus ingestion + chunking**  
  _What:_ Walk `data/hackerrank/**`, read each markdown file, and split into reasonably sized chunks (split the large files — release notes, glossary, the 225 KB pricing table); retain each chunk's source path + top-level folder.  
  _Why:_ Big docs must be chunked before embedding; folder path is what powers `product_area`.  
  _Files:_ `code/src/ingest.ts`.

- [ ] 🟥 **Step 4: Build the embedding index (precompute once)**  
  _What:_ Embed all chunks with `text-embedding-3-small`, write `embeddings.json` (vector + text + folder + source path per chunk). Idempotent script, run once.  
  _Why:_ "Precompute the expensive thing once" — runtime then only embeds the 16 tickets; fast + deterministic.  
  _Files:_ `code/scripts/build-index.ts`, `code/data/embeddings.json` (generated).

- [x] 🟩 **Step 5: Retriever + `product_area` mapping**  
  _What:_ Given a ticket, embed it and return top-k chunks by cosine similarity; map the top chunk's folder to a normalized `product_area` label. Sanity-check on a few tickets.  
  _Why:_ Provides grounded sources for the agent and a free `product_area` candidate.  
  _Files:_ `code/src/retriever.ts`, `code/src/product-area-map.ts`.

- [x] 🟩 **Step 6: Escalation + classification policy module**  
  _What:_ Encode the escalation principle and the `request_type` logic as explicit, testable rules/guidance the agent prompt enforces (human-authority / private-data / live-incident → escalate; documented self-service → reply; out-of-scope → polite decline).  
  _Why:_ Escalation calibration is the highest-value scoring axis; keeping it explicit makes it defensible in the AI Judge interview.  
  _Files:_ `code/src/policy.ts`.

- [x] 🟩 **Step 7: Agent brain (structured 5-field output)**  
  _What:_ One LLM call (temp 0) taking ticket + retrieved snippets + policy, returning a validated schema: `status`, `request_type`, `product_area`, `response`, `justification`. Enforce escalation/out-of-scope response conventions (e.g. literal escalate string, blank `product_area` on escalation).  
  _Why:_ The scoring core; structured output guarantees a valid CSV every row.  
  _Files:_ `code/src/agent.ts`, `code/src/schema.ts`.

- [x] 🟩 **Step 8: Calibrate against the sample CSV** _(7/7 on status, request_type, product_area)_  
  _What:_ Run the agent over the 7 labeled `sample_support_tickets.csv` rows; compare each field to expected; tune prompt/policy until outputs align (especially status, request_type, product_area).  
  _Why:_ The sample is our only ground truth; calibration here is what moves the graded `output.csv` accuracy.  
  _Files:_ `code/scripts/calibrate.ts`.

- [x] 🟩 **Step 9: Batch runner → `output.csv`** _(16 rows; escalations {1,3,6,13}, 12 replied)_  
  _What:_ Run the agent over all 16 rows of `support_tickets.csv`, write `support_tickets/output.csv` in the exact schema/column order.  
  _Why:_ This is the graded output artifact; securing it early gives a submittable floor before UI work.  
  _Files:_ `code/scripts/run.ts`, `support_tickets/output.csv` (generated).

- [x] 🟩 **Step 10: Boilerplate live UI** _(builds clean; live demo needs the index)_  
  _What:_ A clean Next.js page showing the queue, the current ticket, its retrieved sources, and the streaming decision + response — driven by the real pipeline (not a mock).  
  _Why:_ Satisfies the hard "must visibly process tickets" requirement; serves as the base for the later polish session.  
  _Files:_ `code/app/page.tsx`, `code/app/api/process/route.ts`, `code/app/components/*`.

- [x] 🟩 **Step 11: Determinism + safety hardening** _(deps pinned exact; temp 0 + seed + fixed top-k; discrete fields identical across 2 full runs; adversarial #1/#15 not obeyed)_  
  _What:_ Pin deps, temp 0 / fixed top-k, prompt-injection resistance check on adversarial rows (e.g. "delete all files", "increase my score"), verify reruns are stable.  
  _Why:_ Determinism + no hallucinated policy are explicitly graded; adversarial rows are likely traps.  
  _Files:_ `code/src/agent.ts`, `code/package.json`.

- [x] 🟩 **Step 12: README + submission prep** _(`code/README.md` written; `submission/log.txt` copied; tooling artifacts gitignored. Final `git commit`/`push` left to the user.)_  
  _What:_ Write `code/README.md` (install + run agent + run UI), then copy the prompt log to `submission/log.txt` and stage for commit/push.  
  _Why:_ Reproducibility is scored and the README/log are required submission pieces.  
  _Files:_ `code/README.md`, `submission/log.txt`.

---

## Baseline UI Wireframe (boilerplate — to be polished later)

A three-zone layout: the **queue** (left), the **focused ticket + decision** (center), and the **retrieved corpus sources** (right). This is the minimal structure that satisfies "visibly processes tickets"; the deep visual pass happens in a separate session.

```
+------------------------------------------------------------------------------+
|  HackerRank Support Triage Agent          [ Run all ]  Progress: 7/16  ●●●○○  |
+----------------+--------------------------------------+----------------------+
|  QUEUE         |  CURRENT TICKET                      |  RETRIEVED SOURCES   |
|                |                                      |                      |
|  #1  done  ✓   |  #8  Reschedule assessment           |  > screen/managing-  |
|  #2  done  ✓   |  Subject: (none)   Company: HackerR.  |    tests/...  0.81   |
|  #3  ESCAL !   |  ----------------------------------   |  > interviews/...    |
|  #4  done  ✓   |  "I would like to request a          |    resched... 0.77   |
|  #5  done  ✓   |   rescheduling of my company         |  > general-help/...  |
|  #6  ESCAL !   |   assessment due to unforeseen..."   |    contact... 0.63   |
|  #7  done  ✓   |                                      |                      |
| [#8] proc… ▮   |  DECISION                            |  (top-k chunks the   |
|  #9  queued    |   status:        replied             |   answer is grounded |
|  #10 queued    |   request_type:  product_issue       |   in — click to      |
|  #11 queued    |   product_area:  screen              |   expand)            |
|  ...           |                                      |                      |
|                |  RESPONSE  (streaming…)              |                      |
|                |   Hi, you can reschedule by…  ▮       |                      |
|                |                                      |                      |
|                |  JUSTIFICATION                       |                      |
|                |   Replied because the corpus         |                      |
|                |   documents the reschedule flow…     |                      |
+----------------+--------------------------------------+----------------------+
```

Wireframe notes:
- **Queue (left):** every ticket with a live status chip — `queued` / `processing ▮` / `done ✓` / `ESCALATED !`. Click to focus a row.
- **Center:** the focused ticket's raw input up top, then the four decided fields, then the `response` streaming in token-by-token, then the `justification`.
- **Right:** the retrieved corpus chunks with similarity scores — visible proof the answer is grounded, not hallucinated.
- **Header:** a `Run all` trigger + overall progress, so a viewer immediately understands the batch is being processed live.

---

## Risks & Watchouts
- **Workspace currently has no repo** — Step 1 is a hard prerequisite; everything else blocks on it.
- **`product_area` label set is inferred** from only 3 sample values (`screen`, `community`, `conversation_management`); confirm/normalize the full mapping during calibration to avoid label mismatches.
- **Hallucinated policy risk** on borderline replies (refunds #2, infosec #4) — only state what the corpus supports; route to humans where it doesn't, without inventing process.
- **Adversarial/injection rows** (#15 "delete all files", #1 "increase my score") must not derail the agent — treat ticket text as data, not instructions.
- **Large-file chunking** (225 KB pricing table, 30–70 KB release notes) must be split or embeddings/relevance degrade.
- **Time pressure** — keep UI at boilerplate until `output.csv` is correct; deep polish is a separate session.

## Done Criteria
- `support_tickets/output.csv` has 16 rows, exact column schema, valid allowed-values for `status` and `request_type`.
- Escalations (tickets 1, 3, 6) and out-of-scope declines behave per the policy; replies are grounded in retrieved corpus snippets.
- Agent output on the 7 sample rows closely matches expected labels after calibration.
- The UI runs and visibly processes tickets (queue → current → sources → decision/response) from the real pipeline.
- Reruns are deterministic; `code/README.md` lets a fresh machine install + run both agent and UI.
- Prompt log copied to `submission/log.txt`.
