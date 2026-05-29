# Product

## Register

product

## Users

The primary audience is the **HackerRank Buildathon judge / AI Judge panel** watching a live demo, plus anyone evaluating the `code/` submission. Their context: scanning many submissions in a row, with limited time per entry, deciding whether this agent triages real HackerRank support tickets accurately and safely. The secondary (in-fiction) user is a **support operator** who would watch "Hank" work through a queue of tickets.

The job to be done: in seconds, let a viewer understand the agent's pipeline (read ticket → consult corpus → classify → decide reply vs escalate → answer) and trust that the decisions are grounded in the provided support corpus, not hallucinated.

## Product Purpose

A live triage console for an AI agent ("Hank") that processes HackerRank support tickets one at a time and shows its work on screen. For each ticket it surfaces the request type, product area, the corpus sources it consulted, a reply-or-escalate decision, the grounded response, and a justification. It exists because the buildathon explicitly requires a UI that *visibly* shows tickets being processed, and because aesthetics and clarity are part of the score.

Success = a viewer with no explanation can follow the queue, the current ticket, the decision, and the response at a glance, and comes away confident the agent is grounded and escalates sensitive cases instead of guessing.

## Brand Personality

Calm, focused, and quietly confident. A "console" feel: a deep near-black surface with a single HackerRank-green accent and semantic state colors (replied / escalated / processing / error). The agent has a light, friendly presence (the Hank mascot) without being cute or noisy. Voice is plain and specific, never marketing-speak. Three words: **focused, grounded, alive** (motion makes the work feel live without being a toy).

Demo priority: this is a judged showpiece, so motion and polish should make it stand out in a lineup, but never at the expense of legibility of the triage decision.

## Anti-references

- **Generic SaaS dashboard** — the card-grid-plus-hero-metric template, big-number stat tiles, identical icon+heading+text cards repeated endlessly.
- **Heavy enterprise helpdesk** (Zendesk / Jira density) — cramped tables, toolbar overload, gray-on-gray information walls.
- **Obvious AI-generated landing** — gradient text, glassmorphism by default, a tiny uppercase tracked eyebrow above every section, numbered `01 / 02 / 03` section scaffolding, marketing buzzwords.

## Design Principles

1. **Show the work, not just the verdict.** Every decision is traceable to the corpus sources and reasoning it came from; grounding and escalation logic are visible, not hidden.
2. **Glanceable first, deep on demand.** The board reads in one glance (queue, outcome tally, per-ticket decision); full ticket text, sources, and justification live one click away in the modal.
3. **Motion that means something.** Animation signals state and progress (scanning a ticket, a card resolving, a card→modal connection), never decoration for its own sake. Always degrade cleanly under reduced motion.
4. **Earned trust over confident guessing.** The interface makes "escalated" a first-class, respectable outcome, reinforcing that the agent defers on high-risk/sensitive/out-of-scope cases.
5. **One calm surface.** A single dark console with one accent and a disciplined token system; restraint over visual noise, so the content (tickets and decisions) is the loudest thing on screen.

## Accessibility & Inclusion

Target a sensible **WCAG 2.1 AA** baseline without over-engineering: body text holds ≥4.5:1 contrast against its surface, interactive targets are keyboard-reachable, and the modal traps focus / closes on `Esc`. `prefers-reduced-motion` is already honored across scenes and must stay that way (meaning preserved, movement dropped). State is never communicated by color alone (labels accompany the replied/escalated/processing/error colors).
