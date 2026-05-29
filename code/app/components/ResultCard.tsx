"use client";

import type { TicketState } from "./types";
import { requestTypeStyle } from "./labels";

// One ticket on the results board. It pops in as its decision lands, shows a
// snippet of the answer, a color-coded request-type tag, and how many corpus
// sources backed the call. The outcome (replied / escalated) is conveyed by the
// section it sits in plus a subtle accent, so there's no redundant status badge.
// Clicking it opens the full detail modal, animating out of this card's position.

export function ResultCard({
  state,
  order,
  view = "grid",
  onOpen,
}: {
  state: TicketState;
  /** Position in the visible list — used to stagger the entrance. */
  order: number;
  view?: "grid" | "list";
  onOpen: (index: number, rect: DOMRect) => void;
}) {
  const { ticket, decision } = state;
  const outcome =
    decision?.status ?? (state.status === "error" ? "error" : "replied");

  const subject =
    ticket.subject?.trim() || ticket.issue.replace(/\s+/g, " ").slice(0, 70);
  const preview = state.error
    ? state.error
    : decision?.response.replace(/\s+/g, " ").trim() ?? "";
  const sourceCount = state.sources?.length ?? 0;

  // v2-only signals (present only when the v2 pipeline ran this ticket).
  const tele = state.telemetry;
  const coverage = tele?.coverage?.score;
  const grounded = tele?.grounded;

  const tag = decision?.request_type
    ? requestTypeStyle(decision.request_type)
    : null;
  const TagIcon = tag?.icon;

  const tagEl =
    tag && TagIcon ? (
      <span className={`rcard-tag ${tag.tone}`}>
        <TagIcon size={13} strokeWidth={2.25} />
        {tag.label}
      </span>
    ) : null;

  const sourcesEl = (
    <span className="rcard-sources">
      {sourceCount} {sourceCount === 1 ? "source" : "sources"}
    </span>
  );

  return (
    <button
      type="button"
      className={`rcard rcard--${view} rcard--${outcome}`}
      style={{ animationDelay: `${Math.min(order, 16) * 55}ms` }}
      onClick={(e) =>
        onOpen(ticket.index, e.currentTarget.getBoundingClientRect())
      }
    >
      <span className={`rcard-accent rcard-accent--${outcome}`} aria-hidden />

      <div className="rcard-main">
        <div className="rcard-top">
          <span className="rcard-num">#{ticket.index + 1}</span>
          {view === "grid" && tagEl}
        </div>

        <div className="rcard-subject">{subject}</div>
        {preview && <p className="rcard-preview">{preview}</p>}

        {/* v2 signal row: only renders when the v2 pipeline produced telemetry. */}
        {tele && (
          <div className="rcard-signals">
            {coverage !== undefined && (
              <span className="rcard-signal">
                cov <b>{coverage.toFixed(2)}</b>
              </span>
            )}
            {grounded !== undefined && (
              <span
                className="rcard-signal"
                style={{
                  color: grounded
                    ? "var(--state-replied)"
                    : "var(--state-escalated)",
                }}
              >
                {grounded ? "grounded ✓" : "ungrounded ⚠"}
              </span>
            )}
          </div>
        )}

        <div className="rcard-foot">
          {view === "list" && tagEl}
          {sourcesEl}
        </div>
      </div>
    </button>
  );
}
