"use client";

import { useEffect, useState } from "react";
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
  "Going through your support tickets…",
  "Searching the HackerRank help corpus…",
  "Matching each ticket to the right articles…",
  "Deciding whether to reply or escalate…",
];

export function Loading({
  items,
  currentIndex,
  mode,
}: {
  items: TicketState[];
  currentIndex: number;
  mode: Mode;
}) {
  const [phrase, setPhrase] = useState(0);

  // Cycle the status copy on a gentle cadence.
  useEffect(() => {
    const id = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 2200);
    return () => clearInterval(id);
  }, []);

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
  // v2 only: the measured signals as they land for the current ticket.
  const telemetry = mode === "v2" ? current?.telemetry : undefined;
  const coverage = telemetry?.coverage?.score;
  const risk = telemetry?.risk_class;

  return (
    <div className="scene loading">
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

        <div className="loading-status" key={phrase}>
          {PHRASES[phrase]}
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
        <div className="consulting" key={`src-${currentIndex}`}>
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
                  style={{ animationDelay: `${i * 120}ms` }}
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

        {/* v2 signals for the in-flight ticket (coverage + risk), as they land. */}
        {(coverage !== undefined || risk) && (
          <div className="loading-signals">
            {coverage !== undefined && (
              <span className="loading-signal">
                coverage <b>{coverage.toFixed(2)}</b>
              </span>
            )}
            {risk && (
              <span className="loading-signal">
                risk <b>{risk}</b>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
