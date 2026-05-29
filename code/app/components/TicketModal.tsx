"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronDown,
  MessageSquare,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Tag,
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
function useTypewriter(text: string | undefined, play: boolean) {
  const [shown, setShown] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!text) {
      setShown("");
      return;
    }
    if (!play) {
      setShown(text);
      return;
    }
    let i = 0;
    setShown("");
    timer.current = setInterval(() => {
      i += Math.max(1, Math.round(text.length / 90));
      setShown(text.slice(0, i));
      if (i >= text.length && timer.current) clearInterval(timer.current);
    }, 16);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [text, play]);

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
}: {
  state: TicketState | null;
  origin: DOMRect | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const decision = state?.decision;
  // Replay the typewriter each time a card is opened.
  const { shown, done } = useTypewriter(decision?.response, !!state && !closing);

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

  // Escape to close + lock background scroll while open.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") beginClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
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
  const outcome: Outcome =
    decision?.status ?? (state.status === "error" ? "error" : "replied");
  const om = OUTCOME_META[outcome];
  const OutcomeIcon = om.icon;
  const sources = state.sources ?? [];

  const tag = decision?.request_type
    ? requestTypeStyle(decision.request_type)
    : null;
  const TagIcon = tag?.icon;

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
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={(e) => {
          // Once the shrink-back finishes, unmount via the parent.
          if (closing && e.propertyName === "transform") onClose();
        }}
      >
        <div className="tmodal-head">
          <div className="tmodal-head-meta">
            <span className="tmodal-num">Ticket #{ticket.index + 1}</span>
            <span
              className={`tmodal-outcome tmodal-outcome--${outcome}`}
            >
              <OutcomeIcon size={14} strokeWidth={2.25} />
              {om.label}
            </span>
          </div>
          <button
            className="tmodal-close"
            onClick={beginClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="tmodal-body">
          {ticket.subject?.trim() && (
            <div className="tmodal-subject">{ticket.subject.trim()}</div>
          )}
          <div className="tmodal-ticket">{ticket.issue}</div>

          {state.error && <div className="banner">{state.error}</div>}

          <div className="tmodal-fields">
            <div className="tmodal-field">
              <div className="k">
                <Tag size={12} strokeWidth={2.25} />
                Request type
              </div>
              <div className="v">
                {tag && TagIcon ? (
                  <span className={`tmodal-fieldtag ${tag.tone}`}>
                    <TagIcon size={13} strokeWidth={2.25} />
                    {tag.label}
                  </span>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="tmodal-field">
              <div className="k">
                <Layers size={12} strokeWidth={2.25} />
                Product area
              </div>
              <div className="v">
                {humanizeProductArea(decision?.product_area)}
              </div>
            </div>
            <div className="tmodal-field">
              <div className="k">
                <OutcomeIcon size={12} strokeWidth={2.25} />
                Status
              </div>
              <div className="v" style={{ color: om.color }}>
                {om.label}
              </div>
            </div>
          </div>

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

          {decision && (
            <>
              <div className="section-label">
                <MessageSquare size={13} strokeWidth={2.25} />
                Hank&apos;s response
              </div>
              <div className="tmodal-response">
                {shown}
                {!done && <span className="caret" />}
              </div>

              <div className="section-label">
                <Info size={13} strokeWidth={2.25} />
                Why
              </div>
              <div className="tmodal-justification">
                {decision.justification}
              </div>
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

            {sourcesOpen && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
