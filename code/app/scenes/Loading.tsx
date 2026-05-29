"use client";

import { useEffect, useState, type CSSProperties, type TransitionEvent } from "react";
import type { Mode } from "../theme-routes";
import type { TicketState } from "../components/types";

// Full-page processing animation. Instead of a static spinner, we show the work
// itself: a deck of ticket cards where the front card is the one Hank is reading
// right now, a progress trail of every ticket in the batch, rotating status
// copy, and a Perplexity-style reveal of the support sources being consulted.
//
// It is driven entirely by the live pipeline state passed from page.tsx — the
// front card and the sources change as each ticket actually streams in.

// Rotating status lines. They cycle on a timer to keep the wait feeling alive;
// the literal per-ticket detail is shown separately below the deck.
const PHRASES = [
  "Reading each support ticket…",
  "Searching the HackerRank support corpus…",
  "Matching tickets to the right articles…",
  "Deciding: reply or escalate…",
];

export function Loading({
  items,
  currentIndex,
  variant = "full",
}: {
  items: TicketState[];
  currentIndex: number;
  mode: Mode;
  // "full" centers the loader on the whole screen; "rail" compacts it into the
  // left ~30% column while the results board builds alongside it.
  variant?: "full" | "rail";
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [statusVisible, setStatusVisible] = useState(true);

  // Cycle status copy with a crossfade instead of remounting the node.
  useEffect(() => {
    const id = setInterval(() => setStatusVisible(false), 2200);
    return () => clearInterval(id);
  }, []);

  const handleStatusTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "opacity" || statusVisible) return;
    setPhraseIndex((p) => (p + 1) % PHRASES.length);
    setStatusVisible(true);
  };

  const total = items.length;
  const processed = items.filter(
    (it) => it.status === "done" || it.status === "escalated",
  ).length;
  const pct = total ? Math.round((processed / total) * 100) : 0;

  const current = items.find((it) => it.ticket.index === currentIndex);
  const subject =
    current?.ticket.subject?.trim() ||
    current?.ticket.issue.replace(/\s+/g, " ").slice(0, 64) ||
    "";
  // Top sources for the in-flight ticket — revealed one-by-one below.
  const sources = current?.sources?.slice(0, 4) ?? [];
  return (
    <div className={`scene scene--static loading loading--${variant}`}>
      <div className="loading-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="loading-avatar" src="/agent-avatar.png" alt="Hank" />

        {/* The deck: faint stacked cards behind, the active ticket in front.
            Keying the front card on the index re-triggers its entrance each
            time a new ticket comes forward, so the deck visibly advances. */}
        <div className="deck" aria-hidden="true">
          <div className="deck-card deck-card--back2" />
          <div className="deck-card deck-card--back1" />
          <div key={currentIndex} className="deck-card deck-card--front">
            <span className="deck-num">
              Ticket #{(current?.ticket.index ?? 0) + 1}
            </span>
            <span className="deck-subject">{subject}</span>
            {/* Shimmering lines stand in for the body being scanned. */}
            <span className="deck-line" />
            <span className="deck-line deck-line--short" />
          </div>
        </div>

        <div
          className={`loading-status${statusVisible ? "" : " loading-status--out"}`}
          onTransitionEnd={handleStatusTransitionEnd}
        >
          {PHRASES[phraseIndex]}
        </div>

        {/* Progress trail: one tick per ticket, filling as the batch completes. */}
        <div className="loading-progress">
          <span className="loading-count">
            {processed} of {total} triaged
          </span>
          <div className="loading-trail">
            {items.map((it) => (
              <span
                key={it.ticket.index}
                className={`trail-tick trail-tick--${
                  it.status === "done" || it.status === "escalated"
                    ? "done"
                    : it.status === "processing"
                      ? "active"
                      : "queued"
                }`}
              />
            ))}
          </div>
        </div>

        {/* "Consulting sources" reveal for the current ticket — a left-aligned
            list (Cursor "Searched the web" style) so long titles truncate
            cleanly instead of being center-clipped out of view. */}
        <div className="consulting">
          <div className="consulting-label">Consulting sources</div>
          <div className="consulting-list">
            {sources.length === 0 ? (
              <div className="consulting-row consulting-row--ghost">
                <span className="consulting-icon" />
                <span className="consulting-title">Searching the corpus…</span>
              </div>
            ) : (
              sources.map((s, i) => (
                <div
                  key={s.id}
                  className="consulting-row"
                  style={
                    {
                      "--row-enter-delay": `${i * 50}ms`,
                    } as CSSProperties
                  }
                >
                  <span className="consulting-icon" />
                  <span className="consulting-title">
                    {s.title || s.sourcePath}
                  </span>
                  {s.folder ? (
                    <span className="consulting-source">{s.folder}</span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
