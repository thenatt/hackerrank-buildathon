# Multi-Screen Demo Journey — Implementation Plan

**Overall Progress:** `100%`
**Status:** In Progress
**Task Ref:** convert single-screen triage prototype into the full demo journey
**Created:** 2026-05-29

---

## TL;DR
Convert the current single-screen triage dashboard into a multi-scene demo journey: **landing → (single-query | CSV upload) → live processing → results**, all as one client-side scene state machine in `code/app/page.tsx` (no new routes, no full reloads, streaming preserved). We do a **full visual redesign** (new OKLCH token system, one HackerRank-green functional accent on a refined dark "console" surface, crisp type, intentional motion) and introduce a **named, illustrated agent character** used across scenes. The **batch CSV pipeline is the only thing that actually runs**; the upload is scripted (dropping a file reveals the provided 16 tickets and runs the real pipeline), and the single-query screen is **decorative** (Send is a no-op). Zero changes to `src/*`, `app/api/*`, the corpus, or `output.csv`.

## Critical Decisions
- **Architecture: single-page scene state machine** in `page.tsx` (`scene = landing | single | upload | run`), not Next.js routes — keeps the existing streaming intact, enables smooth scene transitions, touches no backend.
- **Upload is scripted/decorative** — the drop zone accepts a file gesture, then loads the provided 16 via the existing `/api/tickets`. No arbitrary-CSV processing; `/api/process` stays index-based and untouched.
- **Single-query screen is UI-only** — input + Send render, but Send does nothing (per user). Kept visually intentional (not broken-looking), no error, no wiring.
- **Full redesign, dark "console" register** — physical scene: a support operator triaging a live queue, wanting calm focus + fast scanning. Anchor: HackerRank green as the single functional accent; semantic state colors (replied/escalated/processing/error). Avoids the purple-glow AI-dashboard reflex.
- **Named illustrated agent** — one generated mascot/avatar asset reused across scenes for emotional continuity. Working name **"Hank"** (rename freely).
- **Typography** — one sans for UI (system/Inter stack) + a mono for data fields (paths, scores, the five output fields). Fixed rem scale (product register), not fluid clamp.
- **Motion** — scene transitions (crossfade + slight rise, custom ease-out, ~250–400ms), staggered queue entrance (30–80ms), button `:active` scale 0.97; full `prefers-reduced-motion` fallback.
- **Reuse, don't rewrite** — `Queue`, `TicketDetail`, `Sources` keep their logic; they get restyled via tokens. The real pipeline contract (`sources` then `decision` NDJSON stream) is unchanged.

## Out of Scope
- Any change to `src/*`, `app/api/process`, `app/api/tickets`, the corpus, or `support_tickets/output.csv`.
- Real single-query inference (decorative only).
- Arbitrary uploaded-CSV processing (scripted reveal of the provided 16 only).
- Backend/agent logic, retrieval, escalation policy, calibration.
- Persistence, auth, deployment.
- A full PRODUCT.md/DESIGN.md init pass (noted by the design skill; deferred).

---

## Tasks

- [x] 🟩 **Step 1: Generate the agent avatar asset**
  _What:_ Generated one illustrated mascot/avatar for the support agent ("Hank") — a headset-wearing bot with a green glow on a dark body, professional-friendly. Saved into `code/public/agent-avatar.png`.
  _Why:_ Personification was explicitly requested; one cohesive character anchors landing, single-query, and processing scenes.
  _Files:_ `code/public/agent-avatar.png` (generated).

- [x] 🟩 **Step 2: Establish the redesign token system + base styles**
  _What:_ Replaced `globals.css` with an OKLCH token set: surfaces, ink ramp (contrast-checked), one green accent, semantic states (replied/escalated/processing/error), radius/z-index scales, custom easing vars, shared `.btn` vocabulary, and a `prefers-reduced-motion` block. Sans + mono font stacks. Existing dashboard styles retuned onto tokens.
  _Why:_ A real redesign needs a single source of truth; everything downstream consumes these tokens.
  _Files:_ `code/app/globals.css`.

- [x] 🟩 **Step 3: Introduce the scene state machine in `page.tsx`**
  _What:_ Added `scene` state (`landing | single | upload | run`) + navigation; kept the ticket-load + `processOne`/`runAll` streaming intact. Each scene fades + rises in on mount (reduced-motion safe). `startRun` hands off from upload → run + kicks the batch.
  _Why:_ Core of the conversion; turns one screen into a navigable journey without touching the pipeline.
  _Files:_ `code/app/page.tsx`.

- [x] 🟩 **Step 4: Build the Landing scene**
  _What:_ Hero with avatar + "Hank" + role, headline, specific subcopy, two CTAs ("Triage a ticket batch" / "Ask a single question"), and a grounded-in-corpus footer. Verified rendering via screenshot.
  _Why:_ First impression + the journey's front door; teaches what the tool does in one read.
  _Files:_ `code/app/scenes/Landing.tsx` (new), `globals.css`.

- [x] 🟩 **Step 5: Build the decorative Single-Query scene**
  _What:_ Chat-style composer (avatar greeting + textarea + inert Send marked aria-disabled, no action), a "Preview" tag, an honest note that batch is the live path, and a link to the upload scene. Back link to landing.
  _Why:_ Shows the product vision without wiring logic; must read as intentional, not broken.
  _Files:_ `code/app/scenes/SingleQuery.tsx` (new), `globals.css`.

- [x] 🟩 **Step 6: Build the CSV Upload scene (scripted)**
  _What:_ Drop zone + file picker (drag highlight). Any file gesture reveals the bundled set: a staggered preview list ("16 tickets ready") + **"Run all 16 tickets"** that hands off to the run scene and kicks the pipeline. Verified reveal + run via screenshots.
  _Why:_ The real entry point for the demo; framed as upload, backed by the untouched pipeline.
  _Files:_ `code/app/scenes/Upload.tsx` (new), `code/app/page.tsx`.

- [x] 🟩 **Step 7: Restyle the run scene (Queue / TicketDetail / Sources) + summary**
  _What:_ Three-zone dashboard on the new tokens; refined chips with semantic state colors, fixed the old `--red/--green` refs, results summary strip (`n replied · m escalated`) + "New batch", and a `cleanSnippet` that strips image tags / signed URLs from sources (retrieval untouched). Typewriter response kept.
  _Why:_ This is the graded "visibly processes tickets" payoff and the biggest polish lever; sources cleanup removes the visual noise.
  _Files:_ `code/app/components/Queue.tsx`, `TicketDetail.tsx`, `Sources.tsx`, `globals.css`, `page.tsx`.

- [x] 🟩 **Step 8: Wire delight + motion polish across scenes**
  _What:_ Per-ticket stage cue in the detail header + placeholder (retrieving corpus → deciding → responding), pulsing processing chip, `.btn:active` scale feedback, scene fade-rise transitions, staggered upload preview rows, and the global reduced-motion pass. Crisp <300ms UI motion; scene transitions ~420ms.
  _Why:_ Functional + emotional delight that reveals the architecture rather than decorating over it.
  _Files:_ `code/app/components/*`, `code/app/scenes/*`, `globals.css`.

- [x] 🟩 **Step 9: Verify + harden the UI**
  _What:_ Lint clean on all touched files. Restarted the dev server (cleared a stale-SSR cache), then drove the full journey in a headless browser: landing → upload → reveal (16 tickets) → live run. Confirmed queue chips (escalated/done/processing/queued), stage cues, and the cleaned sources panel all render. No `src/*` / `app/api/*` / `output.csv` changes.
  _Why:_ Product register demands every state ship; the demo must not break live.
  _Files:_ all touched UI files.

- [x] 🟩 **Step 10: Log the turn (AGENTS.md)**
  _What:_ Appended the §5.2 turn entry to `~/hackerrank_buildathon/log.txt` (append-only, no secrets).
  _Why:_ Mandatory per AGENTS.md and read by the AI Judge.
  _Files:_ `~/hackerrank_buildathon/log.txt` (outside repo).

---

## Risks & Watchouts
- **Don't touch the graded core.** Any edit to `src/*`, `app/api/*`, or `output.csv` is out of scope; the redesign is UI-only.
- **Decorative single-query looking broken.** A dead Send is the main failure mode — design its inertness to read as deliberate (no hang, no silent error).
- **Streaming regressions.** The scene refactor must preserve the NDJSON `sources`→`decision` handling and the typewriter; test the live run after refactor.
- **AI-dashboard slop (second-order).** Dark + glow + purple is the reflex; commit to the green-accent calm-console direction and verify it doesn't drift generic.
- **Contrast.** New muted ink on tinted dark panels must hit ≥4.5:1 for body; verify, don't eyeball.
- **Avatar tone.** The mascot should read professional-friendly, not toy-like, to fit a support-ops tool.
- **Scope/time.** Build order favors the run scene (Step 7) value; entry scenes and single-query are lower-risk polish.

## Done Criteria
- App opens on the Landing scene; user can reach **single-query** (inert) and **upload** (scripted) scenes and return.
- Upload scene reveals the provided 16 tickets and **Run all** drives the real, streaming pipeline into the restyled run/results scene.
- Single-query Send does nothing and looks intentional (no error/hang).
- All component states render correctly (queued/processing/done/escalated/error, empty, no-key error).
- Redesign applied via tokens; contrast verified; `prefers-reduced-motion` honored; no lint errors.
- `src/*`, `app/api/*`, corpus, and `output.csv` are unchanged (verified).
- Turn appended to the log.
