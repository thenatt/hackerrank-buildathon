---
name: Hank — Support Triage Console
description: A calm, dark triage console where an AI agent reads HackerRank support tickets and shows its work — one HackerRank-green accent over near-black, with semantic state color.
colors:
  bg: "oklch(0.16 0.012 245)"
  surface: "oklch(0.196 0.014 245)"
  surface-2: "oklch(0.232 0.016 245)"
  border: "oklch(0.30 0.016 245)"
  border-strong: "oklch(0.40 0.02 245)"
  text: "oklch(0.96 0.004 245)"
  muted: "oklch(0.74 0.012 245)"
  faint: "oklch(0.60 0.01 245)"
  accent: "oklch(0.80 0.16 152)"
  accent-strong: "oklch(0.74 0.17 152)"
  accent-ink: "oklch(0.22 0.05 152)"
  state-replied: "oklch(0.80 0.15 152)"
  state-escalated: "oklch(0.81 0.15 72)"
  state-processing: "oklch(0.78 0.12 226)"
  state-error: "oklch(0.72 0.19 28)"
  tag-issue: "oklch(0.78 0.12 226)"
  tag-bug: "oklch(0.72 0.19 28)"
  tag-feature: "oklch(0.76 0.14 300)"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.95rem, 1.2rem + 2.6vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Space Grotesk, Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.28
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.8px"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "15px 16px"
  composer-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "14px 14px 12px"
  tag-chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "3px 9px 3px 7px"
  modal-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "20px 22px 24px"
---

# Design System: Hank — Support Triage Console

## 1. Overview

**Creative North Star: "The Grounded Console"**

Hank is a calm, dimly-lit console where an AI agent works through HackerRank support tickets one at a time and shows its reasoning. The surface is a near-black cool gray; a single HackerRank-green accent carries every primary action, and a small set of semantic colors carry ticket outcomes (replied, escalated, processing, error). Nothing competes for attention except the content — the ticket, the sources it consulted, and the decision. The word in the original stylesheet is exact: this is a *console*, not a dashboard. There is one focal surface at a time (welcome → loading → results), not a wall of widgets.

The system is built to make trust legible. Every decision is traceable to the corpus sources and the reasoning behind it; "escalated" is rendered as a first-class, respectable outcome (a confident amber), not a failure state. Motion is doing a job — a ticket being scanned, sources revealing one row at a time, a card resolving into the board, a card growing into its detail modal. It is choreographed more than a typical product UI would allow, because here the live processing *is* the product: the brief requires the work to be visibly shown.

This system explicitly rejects three things. It is **not** a generic SaaS dashboard (no hero-metric stat tiles, no endlessly repeated icon+heading+text card grids). It is **not** a dense enterprise helpdesk (no cramped tables, no gray-on-gray information walls, no toolbar overload). And it is **not** an obviously AI-generated surface (no gradient text, no decorative glassmorphism, no tiny uppercase eyebrow above every section, no `01 / 02 / 03` scaffolding, no marketing buzzwords).

**Key Characteristics:**
- Light-only, cool off-white field (`oklch(0.977 0.005 250)`) with a subtle, slowly-drifting ambient aurora behind the content — soft green / cyan / violet glows that read as "futuristic" without ever competing with the work. One HackerRank-green accent, semantic state color only; cyan and violet live *only* in the background field, never on a component.
- Three type voices: **Space Grotesk** for display headings (the futuristic character), **Inter** for body / labels / buttons / data (the legible workhorse), **JetBrains Mono** for machine facts (ticket numbers, corpus paths, retrieval scores, telemetry).
- Calm at rest, alive in motion: strong custom easing curves, reduced-motion honored everywhere.
- Glanceable board, deep-on-demand modal; the accent stays rare so it always means "act here / this is live."

## 2. Colors

A near-black cool-gray field with a single luminous green accent and a tight, meaningful set of state hues.

### Primary
- **HackerRank Green** (`oklch(0.80 0.16 152)`): The one accent. Primary buttons, links, the active progress tick, the source-reveal markers, the "replied" outcome, focus glows, and the ambient top-center wash. Used sparingly so it always reads as "live / act here."
- **Green Strong** (`oklch(0.74 0.17 152)`): The pressed / hover-deep variant of the accent for stronger fills.
- **Green Ink** (`oklch(0.22 0.05 152)`): Dark text that sits *on* a green fill (primary button label), so the button reads as solid color, never washed out.

### Secondary (semantic states)
- **Escalation Amber** (`oklch(0.81 0.15 72)`): The "needs a human" outcome. Section headers, card rails, and outcome badges for escalated tickets. Deliberately warm and confident, never alarmist.
- **Working Blue** (`oklch(0.78 0.12 226)`): In-flight / processing. The active loader tick and the "product issue" tag.
- **Error Red** (`oklch(0.72 0.19 28)`): Failures only (a ticket that errored, the bug tag, banners). Never decorative.
- **Feature Violet** (`oklch(0.76 0.14 300)`): The "feature request" tag tone.

### Neutral
- **Console Black** (`oklch(0.16 0.012 245)`): The body field; the deepest layer.
- **Surface** (`oklch(0.196 0.014 245)`) and **Surface Raised** (`oklch(0.232 0.016 245)`): Cards, composer, chips, panels — two tonal steps up from the body for depth without shadows.
- **Border** (`oklch(0.30 0.016 245)`) and **Border Strong** (`oklch(0.40 0.02 245)`): Hairlines and emphasized edges (focused composer, front loader card).
- **Ink** (`oklch(0.96 0.004 245)`): Primary text.
- **Muted** (`oklch(0.74 0.012 245)`): Body-safe secondary text (previews, justifications, source bodies).
- **Faint** (`oklch(0.60 0.01 245)`): Labels and eyebrows only — never body copy.

### Named Rules
**The One Voice Rule.** Green is the only accent, used on a small fraction of any screen. State colors (amber/blue/red/violet) are reserved strictly for ticket meaning. If a green or a state color appears as decoration, it is wrong.

**The Faint-Floor Rule.** `faint` (`oklch(0.60 ...)`) is for labels and metadata only. Body and secondary prose use `muted` (`oklch(0.74 ...)`) or lighter so reading text always clears contrast on the dark surfaces.

**The Tonal-Depth Rule.** Depth comes from stepping `bg → surface → surface-2` with hairline borders, not from heavy shadows. Light tints are transparencies of a color's own hue (e.g. `accent-soft`), never gray.

## 3. Typography

**Display Font:** Space Grotesk (`var(--font-display)`) — headings only
**Body / Label / Button / Data Font:** Inter (`var(--font-sans)`)
**Mono Font:** JetBrains Mono (`var(--font-mono)`)

**Character:** Three voices, three jobs. **Space Grotesk** carries the display headings — the welcome headline, the modal subject, the run-header brand mark, the loader status — and is where the "futuristic" character lives; its geometric forms read as modern without shouting. **Inter** is the legible workhorse for everything in the task: body, labels, buttons, data — the tool disappears into the reading. **JetBrains Mono** is the "machine voice": ticket numbers, corpus file paths, retrieval scores, coverage figures, the `v2` badge. The contrast between display, prose, and data is itself information.

### Hierarchy
- **Display** (Space Grotesk 600, `clamp(1.95rem, 1.2rem + 2.6vw, 2.5rem)`, line-height 1.08, tracking -0.03em): The welcome headline. Balanced wrapping.
- **Title** (Space Grotesk 600, 19px, line-height 1.28, tracking -0.02em): The modal subject — the single largest in-app heading.
- **Body** (Inter 400, 14px, line-height 1.5): Default reading text and ticket bodies. Secondary prose uses `muted` at line-height ~1.6; keep prose blocks within ~65–75ch.
- **Label** (Inter 600, 11px, tracking 0.8px, UPPERCASE): Section eyebrows and field keys only — short, sparse, never sentences.
- **Mono** (JetBrains Mono 400, 12px, tabular-nums): Ticket numbers, source paths, scores, telemetry values; always tabular for alignment.

### Named Rules
**The Three-Voice Rule.** Space Grotesk for display headings, Inter for human language and UI, JetBrains Mono for machine facts (paths, numbers, IDs, scores). Never set body prose in mono, never set a file path or score in a sans, and keep the display face to headings — never labels, buttons, or data.

**The Caps-for-Labels-Only Rule.** Uppercase is permitted only for ≤4-word labels/eyebrows and badges. Never uppercase a sentence or body copy.

## 4. Elevation

The system is **tonal-first, shadow-on-state**. At rest, depth reads from the `bg → surface → surface-2` lightness steps plus hairline borders; there are almost no shadows on static surfaces. Shadows appear as a *response* — to hover, to a floating layer, or as a soft accent glow that follows the green silhouette. The default look stays flat and calm; lift is earned by interaction.

### Shadow Vocabulary
- **Composer Rest** (`box-shadow: 0 18px 50px -30px oklch(0.45 0.03 245 / 0.22)`): A faint, large, low-opacity drop under the welcome composer and front loader card to lift the focal element a hair off the field.
- **Card Hover** (`box-shadow: 0 16px 40px -24px oklch(0.45 0.03 245 / 0.22)`): Appears only on result-card hover, paired with a -3px translate.
- **Modal** (`box-shadow: 0 40px 100px -34px oklch(0.4 0.03 245 / 0.3)`): The one genuinely-floating layer; a deep, soft shadow separates it from the dimmed backdrop.
- **Accent Glow** (`box-shadow: 0 0 0 1px var(--accent-glow), 0 6px 22px -10px var(--accent-glow)` / `drop-shadow(... accent-glow)`): A green halo on primary-button hover and around the Hank mascot — the only "colored" elevation, and it signals liveness, not depth.

### Named Rules
**The Flat-At-Rest Rule.** Static surfaces are flat (tonal step + 1px border). A drop shadow on a non-interactive, non-floating element is forbidden. If it isn't hovered, floating, or the mascot, it has no shadow.

## 5. Components

Components share one vocabulary across all three scenes: same radii, same border treatment, same accent, same easing. Familiarity is the point.

### Buttons
- **Shape:** Gently rounded (`8px`, `--r-sm`); pill (`999px`) for segmented controls and chips.
- **Primary** (`.btn`): Solid green fill (`accent`) with dark green-ink label, weight 650, 13.5px, padding `10px 18px`. The single loudest affordance on a screen.
- **Hover / Focus:** Green glow ring + soft drop (`accent-glow`); `:active` scales to 0.97 for instant "it heard me" feedback. Transitions only transform/opacity/box-shadow (`--dur-fast` 140ms, `--ease-out`).
- **Ghost** (`.btn-ghost`): Transparent with a `border-strong` hairline; hover fills to `surface-2`, no glow. The quiet secondary action.
- **Disabled:** 0.45 opacity, no shadow, `not-allowed`.

### Chips & Tags
- **Request-type tags** (`.rcard-tag`): Pill, soft tinted background of the type's own hue (`tag--issue` blue, `tag--bug` red, `tag--feature` violet, `tag--invalid`/`neutral` gray), matching colored text, a leading Lucide icon (AlertCircle / Bug / Sparkles / Ban / HelpCircle). 11.5px, weight 600.
- **Filter segments** (`.filter`): Pill group on a `surface` track; the active segment uses `accent-soft` fill with green text. Same pattern reused for the grid/list view toggle.
- **Telemetry pills** (`.tele`, v2): `surface` pill with a mono uppercase key (`faint`) and a value; numeric values render green + tabular mono.

### Cards / Containers
- **Corner Style:** `16px` (`--r-lg`) for result cards, `12px` (`--r-md`) for sources and loader cards.
- **Background:** `surface`, hairline `border`.
- **Outcome rail:** A 3px colored rail down the card's left edge carries the section's outcome color (replied green / escalated amber / error red). This is the *only* sanctioned vertical color stripe — it is a full-height structural rail integral to the card, not a `border-left` accent on a bordered card.
- **Shadow Strategy:** Flat at rest; `Card Hover` shadow + -3px lift on hover only (see Elevation).
- **Internal Padding:** `15px 16px` (grid), tighter `13px 18px` in list view.
- **Entrance:** Cards pop in one-by-one (fade + rise + scale, `cardPop`, staggered) as each decision lands.

### Inputs / Fields
- **Composer** (`.ask-composer`): `surface` panel, `border-strong` hairline, `16px` radius, a borderless auto-grow `textarea` (15.5px). The primary entry affordance.
- **Focus:** Border shifts to `accent` and a green glow ring + deepened drop appears (`focus-within`). No layout shift.
- **Placeholder:** `muted` (not faint) so it clears contrast.

### Navigation / Chrome
- **Results header** (`.results-head`): Sticky top bar, hairline bottom border, translucent blurred background; carries the brand mark, the live tally (`n replied · m escalated`, color-coded, tabular), filters, view toggle, and `New batch`.
- **Brand mark** (`.brand`): The Hank mascot (transparent cutout with a green drop-shadow glow) beside the title; a mono `v2` badge appears only in v2 mode.

### Signature Components
- **The Loader Deck** (`.deck`): A stack of stylized ticket cards; back cards are offset + faded to imply depth, the front card carries the ticket Hank is reading, with shimmering "scan line" bars (a green sheen sweeping across) and a Perplexity-style "consulting sources" list that reveals one row at a time from the live retrieval stream.
- **The Detail Modal** (`.tmodal-panel`): A centered panel that scales from the clicked card's origin over a dimmed, lightly-blurred backdrop. Carries the full ticket, the streamed (typewriter) answer, request_type / product_area / status fields, justification, and an on-demand expandable source accordion. Focus-trapped, scroll-locked, closes on `Esc` / click-outside.

## 6. Do's and Don'ts

### Do:
- **Do** keep green as the single accent on a small fraction of any screen (The One Voice Rule); let state colors mean only ticket outcomes.
- **Do** build depth from tonal steps (`bg → surface → surface-2`) and hairline borders; reserve shadows for hover, floating layers, and the mascot glow (The Flat-At-Rest Rule).
- **Do** set machine facts (paths, ticket numbers, scores, coverage) in tabular mono and human language in system sans (The Two-Voice Rule).
- **Do** render "escalated" as a confident, first-class outcome in amber — escalation is correct behavior, not an error.
- **Do** make every animation convey state (scanning, resolving, revealing) and ship a `prefers-reduced-motion` fallback that drops movement while keeping meaning.
- **Do** keep body/secondary prose at `muted` or lighter on dark surfaces, and reserve `faint` for short labels only.

### Don't:
- **Don't** build a **generic SaaS dashboard**: no hero-metric stat tiles, no big-number-plus-label template, no endlessly repeated identical icon+heading+text card grids.
- **Don't** make it a **dense enterprise helpdesk** (Zendesk / Jira): no cramped data tables, no toolbar overload, no gray-on-gray information walls.
- **Don't** let it read as an **obvious AI-generated surface**: no gradient text (`background-clip: text`), no decorative glassmorphism, no tiny uppercase tracked eyebrow above every section, no `01 / 02 / 03` numbered section scaffolding, no marketing buzzwords (streamline / empower / supercharge / seamless / next-generation).
- **Don't** add a `border-left`/`border-right` colored stripe on a card; the only vertical color is the full-height structural outcome rail.
- **Don't** set body copy in mono, in uppercase, or in `faint` gray.
- **Don't** use color alone to signal state — always pair the replied/escalated/processing/error hue with a label or icon.
- **Don't** add shadows to static, non-floating surfaces.
