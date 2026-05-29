# UI Overhaul — Welcome, Loader & Results — Implementation Plan

**Overall Progress:** `56%`
**Status:** In Progress
**Task Ref:** feedback edits to the Hank demo UI (welcome screen, loading state, results presentation)
**Created:** 2026-05-29

---

## TL;DR
Rework the Hank demo's three demo touchpoints without touching the graded core. Replace the two-button landing fork with **one ChatGPT-style welcome composer** (single prompt input that is also a drag-and-drop target, with an explicit "upload a CSV / run the sample batch" affordance; free-text Send stays a deliberate, preview-only no-op). Replace the live three-pane "Queue / Deciding / Sources" dashboard with **two distinct full-page scenes**: (1) a **stylized-card loader** that animates ~16 tickets being read one-by-one with smart status copy and a Perplexity-style "consulting sources" reveal, then (2) an **Option C results board** that builds itself — a responsive masonry of outcome-colored cards popping in one-by-one as each ticket resolves, a sticky live tally + filters, and a click-to-expand **centered modal** (scaling from the clicked card) carrying the full ticket, streamed answer, fields, justification, and expandable sources. All existing streaming and backend contracts are reused unchanged.

## Critical Decisions
- **Single welcome path, no fork** — collapse `landing` + `single` + `upload` into one entry scene: a centered prompt composer that doubles as a CSV drop target, with a quiet explicit batch affordance. Removes the "Triage a batch" vs "Ask a single question" two-button decision.
- **Single-question stays decorative** — typing renders, Send is a deliberate no-op marked as a preview. No new inference path, no `api/ask`. Keeps the graded core untouched.
- **CSV stays scripted** — any file gesture (drop/pick) reveals & runs the bundled 16-ticket sample via existing `/api/tickets` + `/api/process`. No arbitrary-CSV parsing.
- **Loader and results are separate full-page scenes** — `scene = welcome | loading | results` (the old `landing|single|upload|run` and three-pane layout are removed). Loader transitions to results when the batch is underway/complete.
- **Loader = stylized ticket cards** — abstract-but-literal cards representing tickets, processed one-by-one, with status copy ("Going through your support tickets…") and a rotating "consulting sources" reveal driven by the real `sources` stream events.
- **Results = Option C board** — self-building masonry; cards pop in one-by-one as decisions land; sticky summary (`n replied · m escalated`) + progress + `New batch` + filter chips (All/Replied/Escalated); centered modal scales from the clicked card for full detail (typewriter answer preserved).
- **Reuse, don't rewrite the pipeline** — keep `page.tsx`'s `processOne`/`runAll` NDJSON streaming loop (`sources`→`decision`) and the OKLCH token system; honor `prefers-reduced-motion`.

## Out of Scope
- Any change to `src/*`, `app/api/process`, `app/api/tickets`, the corpus, or `support_tickets/output.csv`.
- Real single-question inference (decorative only; no `api/ask`).
- Arbitrary uploaded-CSV parsing (scripted reveal of the bundled set only).
- Backend/agent logic, retrieval, escalation policy, calibration.
- Persistence, auth, deployment, routing changes (stays a single-page scene state machine).

---

## Mid-execution change (approved 2026-05-29)
A **parallel, uncommitted "v2 Evidence × Risk" workstream** was found in the tree mid-build (theme toggle, `src/v2/*`, `api/process-v2`, `/#v2` view, telemetry types). My `page.tsx` rewrite overwrote v2's (uncommitted, now-unrecoverable) `page.tsx` wiring and I deleted `Queue`/`Sources`/`TicketDetail` that the old v2 view reused. With the user's approval the chosen path is **reconcile + fold v2 into the new UI**:
- Keep the new welcome/loading/results journey as the default (v1, `/api/process`).
- Re-add a global **theme toggle** (light/dark via `theme-routes.ts`) and **mode routing**: `/#v2` runs the same new UI against `/api/process-v2`.
- **Surface v2 telemetry** (coverage score, risk class, grounded badge, intents) inside the new `ResultCard` / `TicketModal` / loader instead of the retired three-panel `TicketDetailV2`.
- `Queue`/`Sources`/`TicketDetail`/`TicketDetailV2` stay removed (the new UI replaces them). v1 graded core (`src/agent`, `/api/process`, `output.csv`) and the v2 pipeline (`src/v2/*`, `/api/process-v2`, `output.v2.csv`) are untouched.

## Tasks

- [x] 🟩 **Step 1: Reshape the scene state machine in `page.tsx`**
  _What:_ Replace `scene = "landing" | "single" | "upload" | "run"` with `scene = "welcome" | "loading" | "results"`. Keep `items`, `processOne`, `runAll`, `patch`, and the `/api/tickets` load intact. `startRun` sets `scene = "loading"` and kicks `runAll`; when processing is underway/complete it transitions to `results`. Remove imports/usage of `Landing`, `SingleQuery`, `Upload`, `Queue`, `TicketDetail`, `Sources` from the run path.
  _Why:_ Core wiring change; turns the journey into welcome → loading → results while preserving the streaming pipeline.
  _Files:_ `code/app/page.tsx`.

- [x] 🟩 **Step 2: Build the Welcome scene (single composer + drop target)**
  _What:_ New `scenes/Welcome.tsx`: centered hero with Hank avatar, future-ready headline/subcopy ("ask us anything"), one prompt composer that (a) accepts typing with a deliberately inert, preview-labeled Send, and (b) is itself a drag-and-drop CSV target. Below/inside it, an explicit quiet affordance: "Upload a CSV" (file picker) and a "Run the sample batch" chip. Any file gesture or the sample chip calls `onRunBatch` → loading scene. Grounded-in-corpus footer retained.
  _Why:_ Implements the no-fork, ChatGPT-style single entry with bulk upload as an explicit option.
  _Files:_ `code/app/scenes/Welcome.tsx` (new), `code/app/page.tsx`, `code/app/globals.css`.

- [x] 🟩 **Step 3: Build the full-page Loader scene (stylized ticket cards)**
  _What:_ New `scenes/Loading.tsx`: full-page motion scene. Render a stylized stack/flow of ticket cards being read one-by-one (the "currently reading" card emphasized), smart rotating status copy ("Going through your support tickets…", "Consulting the support corpus…"), and a Perplexity-style source reveal that surfaces titles from the live `sources` stream of the in-flight ticket. Driven by props from `page.tsx` (current index, processed count, latest sources). Transitions out when results are ready.
  _Why:_ Replaces the three-pane "Deciding/Sources" window with the requested full-page, motion-grade loading state.
  _Files:_ `code/app/scenes/Loading.tsx` (new), `code/app/page.tsx`, `code/app/globals.css`.

- [x] 🟩 **Step 4: Build the Results board (Option C) + card component**
  _What:_ New `scenes/Results.tsx` + `components/ResultCard.tsx`: responsive masonry/auto-fit grid; each card pops in (fade+rise+scale, staggered) as its decision lands, shimmering while streaming. Card shows index, subject/issue snippet, outcome badge (replied/escalated), source-chip row ("consulted N sources"), and outcome accent stripe. Sticky summary bar: live tally (`n replied · m escalated`), progress meter, `New batch`, and filter chips (All/Replied/Escalated).
  _Why:_ The self-building, glanceable results presentation that replaces the old center+left panels.
  _Files:_ `code/app/scenes/Results.tsx` (new), `code/app/components/ResultCard.tsx` (new), `code/app/page.tsx`, `code/app/globals.css`.

- [x] 🟩 **Step 5: Build the detail modal (scales from card)**
  _What:_ New `components/TicketModal.tsx`: centered modal that animates scaling from the clicked card's position. Carries full ticket text + meta, the streamed answer (reuse the existing typewriter behavior from `TicketDetail`), request_type/product_area fields, justification, and an expandable source list (reuse `cleanSnippet` logic from `Sources`). Close on `Esc`/click-outside, animating back toward the card. Focus-trap + scroll-lock while open.
  _Why:_ Carries all the depth the removed panels held, on demand, with a physical card→modal connection.
  _Files:_ `code/app/components/TicketModal.tsx` (new), `code/app/scenes/Results.tsx`, `code/app/globals.css`.

- [x] 🟩 **Step R1: Fix `.composer` class collision**
  _What:_ Renamed the Welcome composer's base class from `.composer` to `.ask-composer` (in `Welcome.tsx` + `globals.css`) so it no longer collides with the dead single-query `.composer` rules still in the sheet.
  _Why:_ Two `.composer` definitions cascaded onto the new welcome input.
  _Files:_ `code/app/scenes/Welcome.tsx`, `code/app/globals.css`.

- [ ] 🟥 **Step R2: Reconcile `page.tsx` (theme toggle + v1/v2 mode + v2 streaming)**
  _What:_ Add theme state (light/dark via `theme-routes.ts`, synced to `<html data-theme>` + hash) and a global `ThemeToggle`. Detect `#v2` → `mode = v2`; pick endpoint (`/api/process` vs `/api/process-v2`) and parse the v2 stream's extra `analysis`/`verification`/`coverage`/`telemetry` events into `TicketState.telemetry`. A subtle "v2" mode badge when active.
  _Why:_ Rebuilds the v2 entry lost when `page.tsx` was overwritten, on top of the new UI.
  _Files:_ `code/app/page.tsx`, `code/app/components/ThemeToggle.tsx` (reuse), `code/app/theme-routes.ts` (reuse).

- [ ] 🟥 **Step R3: Surface v2 telemetry in the new UI**
  _What:_ When `state.telemetry` exists, render coverage/risk/grounded in `ResultCard` (compact) and a "Signals" strip + intents in `TicketModal`; show risk/coverage hints in the loader's consulting area. Reuse the existing `.telemetry`/`.tele`/`.intents` styles.
  _Why:_ Folds v2's "show its reasoning" payoff into the new presentation (replaces `TicketDetailV2`).
  _Files:_ `code/app/components/ResultCard.tsx`, `code/app/components/TicketModal.tsx`, `code/app/scenes/Loading.tsx`, `code/app/globals.css`.

- [ ] 🟥 **Step 6: Retire dead v1 scene CSS + obsolete `TicketDetailV2`**
  _What:_ Already deleted `Queue/TicketDetail/Sources/Landing/SingleQuery/Upload`. Delete the now-orphaned `TicketDetailV2.tsx`, and remove the dead v1 dashboard/scene CSS blocks (`.app`/`.header`/`.columns`/`.col*`/`.queue*`/`.chip*` [keep `chipPulse`], `.detail`/`.ticket-*`/`.fields`/`.response-box`, `.stage*`/`.link-btn`/`.hank-lg`/landing-*/single-query `.composer*`/upload-*/`.summary*`/`.progress*`). Keep shared tokens, `.btn`, `.brand*`, `.section-label`, `.source*`, `.caret`, `.empty`/`.banner`, `.telemetry*`, `.theme-toggle*`, `.dot`, `.scene`, motion vars, light theme, reduced-motion.
  _Why:_ Avoid dead/conflicting CSS now that the new UI fully replaces the panels.
  _Files:_ `code/app/components/TicketDetailV2.tsx` (delete), `code/app/globals.css`.

- [ ] 🟥 **Step 7: Motion polish + reduced-motion pass**
  _What:_ Tune easings/timings across welcome (entrance), loader (card cycling, status crossfade, source reveal), results (staggered card pop-in, hover lift, modal scale-from-card), and the loader→results transition. Verify everything degrades cleanly under `prefers-reduced-motion` (no movement, instant reveals, meaning preserved).
  _Why:_ "Motion-designer-grade" is an explicit ask; reduced-motion is a non-negotiable baseline.
  _Files:_ `code/app/globals.css`, touched scene/component files.

- [ ] 🟥 **Step 8: Verify the full journey + lint clean**
  _What:_ `ReadLints` on all touched files and fix any introduced errors. Run the dev server and drive welcome → (drop/sample) → loader (cards + source reveal) → results board (cards popping in, tally/filters) → modal (answer/sources/justification, Esc close). Confirm decorative Send is inert (no hang/error). Confirm `src/*`, `app/api/*`, corpus, `output.csv` unchanged via `git status`.
  _Why:_ Product register demands every state ships and the live demo can't break.
  _Files:_ all touched UI files.

- [ ] 🟥 **Step 9: Log the turn (AGENTS.md §5.2)**
  _What:_ Append the per-turn entry to `~/hackerrank_buildathon/log.txt` (append-only, no secrets).
  _Why:_ Mandatory per AGENTS.md and read by the AI Judge.
  _Files:_ `~/hackerrank_buildathon/log.txt` (outside repo).

---

## Risks & Watchouts
- **Don't touch the graded core.** No edits to `src/*`, `app/api/*`, the corpus, or `output.csv` — UI-only.
- **Streaming regressions.** The scene refactor must preserve the NDJSON `sources`→`decision` loop and the typewriter; the loader and results both read from the same live state. Test a full live run after refactor.
- **Decorative Send reading as broken.** Keep it visibly a preview (label/aria-disabled, no hang, no silent error).
- **Loader→results timing.** Cards must keep popping in as decisions land; decide whether results mounts once processing starts (cards stream in) or after the loader's beat — pick the smoother of the two and keep the "one-by-one" feel either way.
- **Modal scale-from-card.** Connecting the modal to the clicked card's origin is the fiddly bit; if FLIP-style origin tracking gets heavy, fall back to a centered scale-in that still feels intentional.
- **CSS cleanup.** Removing old panel styles risks orphaning shared rules — delete only block-scoped dead CSS, keep tokens/`.btn`/motion/reduced-motion.
- **Accessibility.** Modal needs focus-trap + scroll-lock + `Esc`; contrast on new cards/badges must hold ≥4.5:1 for body text.
- **Scope/time.** The judge grades the agent + `output.csv` + interview, not the UI — keep the overhaul tight and avoid gold-plating.

## Done Criteria
- App opens on the **Welcome** scene: one composer that accepts typing (Send inert/preview) and also drag-and-drop; an explicit CSV upload + sample-batch affordance — **no two-button fork**.
- Triggering the batch shows the **full-page stylized-card loader** with smart status copy and a Perplexity-style source reveal — **no three-pane window**.
- Results render as the **Option C board**: cards pop in one-by-one, sticky live tally + progress + filters; **no left panel / three-pane layout**.
- Clicking a card opens a **centered modal scaling from the card** with full ticket, streamed answer (typewriter), fields, justification, and expandable sources; closes on `Esc`/click-outside.
- All states render (queued/processing/replied/escalated/error, empty); `prefers-reduced-motion` honored; no lint errors.
- Old `Queue`/`TicketDetail`/`Sources` and `Landing`/`SingleQuery`/`Upload` (and their dead CSS) are removed.
- `git status` shows `src/*`, `app/api/*`, corpus, and `output.csv` unchanged.
- Turn appended to the log.
