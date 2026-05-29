"use client";

import type { CSSProperties } from "react";
import type { TicketState } from "./types";
import { requestTypeStyle } from "./labels";

// One ticket on the results board. It pops in as its decision lands, shows a
// snippet of the answer, a color-coded request-type tag, and how many corpus
// sources backed the call. The outcome (replied / escalated) is conveyed by the
// section it sits in, so there's no redundant status badge.
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
  // Escalated cards lead with the reasoning (mirrors the modal); a bare
  // "Escalate to a human" preview says nothing the section color doesn't.
  const preview = state.error
    ? "Hank couldn't finish triaging this ticket. Open it to retry."
    : (
        (outcome === "escalated" ? decision?.justification : decision?.response) ??
        ""
      )
        .replace(/\s+/g, " ")
        .trim();
  const sourceCount = state.sources?.length ?? 0;

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

  const enterDelay = order < 8 ? order * 40 : 0;
  const noEnter = order >= 8;

  return (
    <button
      type="button"
      className={`rcard rcard--${view} rcard--${outcome}${noEnter ? " rcard--no-enter" : ""}`}
      style={
        noEnter
          ? undefined
          : ({ "--card-enter-delay": `${enterDelay}ms` } as CSSProperties)
      }
      onClick={(e) =>
        onOpen(ticket.index, e.currentTarget.getBoundingClientRect())
      }
    >
      <div className="rcard-main">
        <div className="rcard-top">
          <span className="rcard-num">#{ticket.index + 1}</span>
          {view === "grid" && tagEl}
        </div>

        <div className="rcard-subject">{subject}</div>
        {preview && <p className="rcard-preview">{preview}</p>}

        <div className="rcard-foot">
          {view === "list" && tagEl}
          {sourcesEl}
        </div>
      </div>
    </button>
  );
}
