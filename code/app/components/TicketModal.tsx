"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronDown,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { TicketState } from "./types";
import { humanizeProductArea, requestTypeStyle } from "./labels";

// The full-ticket detail view. It opens as a centered modal that visually grows
// out of the card the user clicked (we measure that card's position and animate
// from it), and shrinks back into it on close. It is rendered through a portal
// on document.body so its fixed positioning always resolves against the viewport
// — never an ancestor whose transform/animation would re-anchor it and throw the
// centering off depending on scroll. Inside: the original ticket, the answer
// typed out for a conversational feel, the structured fields, the justification,
// and the corpus sources tucked behind a single accordion.

/** Reveal text character-by-character so opening a card feels like Hank replying. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useTypewriter(text: string | undefined, play: boolean) {
  const [shown, setShown] = useState("");
  const reducedMotion = usePrefersReducedMotion();
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (!text) {
      setShown("");
      return;
    }
    if (!play || reducedMotion) {
      setShown(text);
      return;
    }

    let i = 0;
    let last = 0;
    const step = Math.max(1, Math.round(text.length / 90));
    setShown("");

    const tick = (now: number) => {
      if (now - last >= 16) {
        last = now;
        i = Math.min(text.length, i + step);
        setShown(text.slice(0, i));
      }
      if (i < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [text, play, reducedMotion]);

  return { shown, done: shown === (text ?? "") };
}

// Corpus snippets are raw markdown with image tags and long signed URLs; strip
// those for display so the panel shows only the readable, citeable text.
function cleanSnippet(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Map the panel's final rect back onto the origin card's rect (a FLIP). */
function transformToOrigin(panel: HTMLElement, origin: DOMRect): string {
  const final = panel.getBoundingClientRect();
  const dx = origin.left + origin.width / 2 - (final.left + final.width / 2);
  const dy = origin.top + origin.height / 2 - (final.top + final.height / 2);
  const sx = origin.width / final.width;
  const sy = origin.height / final.height;
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

type Outcome = "replied" | "escalated" | "error";

const OUTCOME_META: Record<
  Outcome,
  { label: string; icon: LucideIcon; color: string }
> = {
  replied: {
    label: "Replied",
    icon: CheckCircle2,
    color: "var(--state-replied)",
  },
  escalated: {
    label: "Escalated",
    icon: AlertTriangle,
    color: "var(--state-escalated)",
  },
  error: { label: "Error", icon: AlertCircle, color: "var(--state-error)" },
};

export function TicketModal({
  state,
  origin,
  onClose,
  onRetry,
}: {
  state: TicketState | null;
  origin: DOMRect | null;
  onClose: () => void;
  onRetry?: (index: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The element focused before the modal opened, so we can restore it on close.
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const decision = state?.decision;
  // The outcome drives the whole panel: which color the decision block takes,
  // which icon leads it, and what Hank's main message is. For a reply that's the
  // answer; for an escalation it's the reasoning (the action is the headline).
  const outcome: Outcome =
    decision?.status ?? (state?.status === "error" ? "error" : "replied");
  const primaryText =
    outcome === "escalated" ? decision?.justification : decision?.response;
  // Replay the typewriter each time a card is opened.
  const { shown, done } = useTypewriter(primaryText, !!state && !closing);

  // Portals need the DOM; only render after mount to stay SSR-safe.
  useEffect(() => setMounted(true), []);

  // Reset transient UI whenever a fresh ticket is opened.
  useEffect(() => {
    if (state) {
      setClosing(false);
      setSourcesOpen(false);
    }
  }, [state]);

  // Open animation: start at the clicked card's position, then settle to center.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!state || !panel || !origin || prefersReducedMotion()) return;
    panel.style.transition = "none";
    panel.style.transform = transformToOrigin(panel, origin);
    panel.style.opacity = "0.4";
    void panel.offsetWidth; // force reflow so the start state is committed
    requestAnimationFrame(() => {
      panel.style.transition = "";
      panel.style.transform = "";
      panel.style.opacity = "";
    });
  }, [state, origin]);

  // Escape to close, Tab trapped inside the panel, and background scroll locked
  // while open. A dialog that lets focus escape behind it is broken for keyboard
  // and screen-reader users, so we keep Tab inside and restore focus on close.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        beginClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, summary, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Remember what had focus, then move focus into the dialog.
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      // Return focus to the card (or whatever) that opened the modal.
      restoreFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state || !mounted) return null;

  // Close: shrink back into the origin card, then tell the parent to unmount.
  function beginClose() {
    const panel = panelRef.current;
    setClosing(true);
    if (panel && origin && !prefersReducedMotion()) {
      panel.style.transform = transformToOrigin(panel, origin);
      panel.style.opacity = "0";
    } else {
      onClose();
    }
  }

  const { ticket } = state;
  const om = OUTCOME_META[outcome];
  const OutcomeIcon = om.icon;
  const sources = state.sources ?? [];

  const tag = decision?.request_type
    ? requestTypeStyle(decision.request_type)
    : null;
  const TagIcon = tag?.icon;

  const areaRaw = decision?.product_area?.trim();
  const productArea = areaRaw ? humanizeProductArea(areaRaw) : null;
  const decisionHeadline =
    outcome === "escalated" ? "Escalated to a human" : "Hank replied";
  // Replies show their answer above a tucked-away "why"; escalations lead with
  // the reasoning itself, so there's no separate "why" block to repeat it.
  const secondaryText =
    outcome === "escalated" ? undefined : decision?.justification;

  // v2-only signals behind the decision (absent on v1 tickets).
  const tele = state.telemetry;
  const coverage = tele?.coverage?.score;
  const risk = tele?.risk_class;
  const grounded = tele?.grounded;

  const modal = (
    <div
      className={`tmodal-backdrop${closing ? " tmodal-backdrop--closing" : ""}`}
      onClick={beginClose}
    >
      <div
        ref={panelRef}
        className="tmodal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tmodal-title-${ticket.index}`}
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={(e) => {
          // Once the shrink-back finishes, unmount via the parent.
          if (closing && e.propertyName === "transform") onClose();
        }}
      >
        <div className="tmodal-head">
          <div className="tmodal-head-meta">
            <span className="tmodal-num" id={`tmodal-title-${ticket.index}`}>
              Ticket #{ticket.index + 1}
            </span>
            <span
              className={`tmodal-outcome tmodal-outcome--${outcome}`}
            >
              <OutcomeIcon size={14} strokeWidth={2.25} />
              {om.label}
            </span>
          </div>
          <button
            ref={closeRef}
            className="tmodal-close"
            onClick={beginClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="tmodal-body">
          {ticket.subject?.trim() && (
            <h2 className="tmodal-subject">{ticket.subject.trim()}</h2>
          )}

          {(tag || productArea) && (
            <div className="tmodal-meta">
              {tag && TagIcon && (
                <span className={`tmodal-fieldtag ${tag.tone}`}>
                  <TagIcon size={13} strokeWidth={2.25} />
                  {tag.label}
                </span>
              )}
              {productArea && (
                <span className="tmodal-metaitem">
                  <Layers size={13} strokeWidth={2.25} />
                  {productArea}
                </span>
              )}
            </div>
          )}

          <div className="tmodal-ticket">{ticket.issue}</div>

          {state.error && (
            <div className="tmodal-error">
              <div className="tmodal-error-head">
                <AlertCircle size={15} strokeWidth={2.25} />
                Hank couldn&apos;t finish triaging this ticket.
              </div>
              <p className="tmodal-error-body">
                Something interrupted the run before a decision landed. You can
                try again.
              </p>
              {onRetry && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => onRetry(ticket.index)}
                  disabled={state.status === "processing"}
                >
                  {state.status === "processing" ? "Retrying…" : "Retry ticket"}
                </button>
              )}
              <details className="tmodal-error-detail">
                <summary>Technical detail</summary>
                <code>{state.error}</code>
              </details>
            </div>
          )}

          {/* The decision is the panel's anchor: one outcome-tinted block that
              states what Hank did, says it, and (for replies) tucks the why under
              a divider. Escalation gets the same first-class treatment, not a
              thin status line. */}
          {decision && (
            <div className={`tmodal-decision tmodal-decision--${outcome}`}>
              <div className="tmodal-decision-head">
                <OutcomeIcon size={15} strokeWidth={2.25} />
                {decisionHeadline}
              </div>
              <div className="tmodal-decision-body">
                {shown}
                {!done && <span className="caret" />}
              </div>
              {secondaryText && (
                <div className="tmodal-decision-why">
                  <span className="tmodal-why-label">Why</span>
                  <p>{secondaryText}</p>
                </div>
              )}
            </div>
          )}

          {/* v2 signals: the measured evidence/risk behind the decision. */}
          {tele && (
            <>
              <div className="section-label">
                <Info size={13} strokeWidth={2.25} />
                Signals
              </div>
              <div className="telemetry">
                {coverage !== undefined && (
                  <div
                    className="tele"
                    title="Evidence: how well the corpus covers this ticket"
                  >
                    <span className="tele-k">coverage</span>
                    <span className="tele-v mono">{coverage.toFixed(2)}</span>
                  </div>
                )}
                {risk && (
                  <div
                    className="tele"
                    title="Risk: does this genuinely need a human?"
                  >
                    <span className="tele-k">risk</span>
                    <span
                      className="tele-chip"
                      style={{
                        color:
                          risk === "none"
                            ? "var(--state-replied)"
                            : "var(--state-escalated)",
                      }}
                    >
                      {risk}
                    </span>
                  </div>
                )}
                {grounded !== undefined && (
                  <div
                    className="tele"
                    title="Grounding: every claim backed by a snippet?"
                  >
                    <span className="tele-k">grounded</span>
                    <span
                      className="tele-chip"
                      style={{
                        color: grounded
                          ? "var(--state-replied)"
                          : "var(--state-escalated)",
                      }}
                    >
                      {grounded ? "✓ yes" : "⚠ no"}
                    </span>
                  </div>
                )}
              </div>
              {tele.intents && tele.intents.length > 1 && (
                <div className="intents">
                  {tele.intents.length} intents: {tele.intents.join(" · ")}
                </div>
              )}
            </>
          )}

          {/* Sources are evidence, not the headline — tuck them behind a single
              accordion that stays closed until the user asks for it. */}
          <div className={`tmodal-sources${sourcesOpen ? " is-open" : ""}`}>
            <button
              type="button"
              className="tmodal-sources-head"
              aria-expanded={sourcesOpen}
              onClick={() => setSourcesOpen((o) => !o)}
            >
              <span className="tmodal-sources-title">
                <FileText size={14} strokeWidth={2.25} />
                Sources
                {sources.length ? (
                  <span className="tmodal-sources-count">{sources.length}</span>
                ) : null}
              </span>
              <ChevronDown
                size={16}
                strokeWidth={2.25}
                className="tmodal-sources-chevron"
              />
            </button>

            <div className="tmodal-sources-collapse">
              <div className="tmodal-sources-body">
                {sources.length === 0 ? (
                  <div className="empty" style={{ textAlign: "left", padding: 0 }}>
                    No corpus snippets were retrieved.
                  </div>
                ) : (
                  sources.map((s) => (
                    <div key={s.id} className="source-card">
                      <div className="source-card-head">
                        <span className="source-path">
                          {s.title || s.sourcePath}
                        </span>
                        <span className="source-score">
                          {s.score.toFixed(2)}
                        </span>
                      </div>
                      <div className="source-text">{cleanSnippet(s.text)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
