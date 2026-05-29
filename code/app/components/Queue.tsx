"use client";

import type { TicketState, TicketStatus } from "./types";

const CHIP_LABEL: Record<TicketStatus, string> = {
  queued: "queued",
  processing: "proc…",
  done: "done ✓",
  escalated: "escal !",
  error: "error",
};

export function Queue({
  items,
  selected,
  onSelect,
}: {
  items: TicketState[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="col">
      <div className="col-title">Queue · {items.length} tickets</div>
      <div className="col-body">
        {items.map((it) => (
          <div
            key={it.ticket.index}
            className={`queue-item${it.ticket.index === selected ? " selected" : ""}`}
            onClick={() => onSelect(it.ticket.index)}
          >
            <span className="queue-num">#{it.ticket.index + 1}</span>
            <span className="queue-text">
              {it.ticket.subject?.trim() ||
                it.ticket.issue.replace(/\s+/g, " ").slice(0, 40)}
            </span>
            <span className={`chip ${it.status}`}>{CHIP_LABEL[it.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
