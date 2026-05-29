"use client";

import { useState } from "react";
import {
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle2,
  Download,
  Inbox,
  FilterX,
} from "lucide-react";
import { ResultCard } from "../components/ResultCard";
import { TicketModal } from "../components/TicketModal";
import type { TicketState } from "../components/types";

type Filter = "all" | "replied" | "escalated";
type View = "grid" | "list";
type Outcome = "escalated" | "replied" | "error";

// The results board. No side panel, no three-pane layout: one self-building
// grid of ticket cards plus a sticky summary. Cards pop in one-by-one (staggered
// by their order). When showing everything, the board splits into clearly
// separated sections — what needs a human first, then what was answered — so the
// outcome reads from the layout itself rather than from a badge on every card.
// A grid/list toggle switches density. Clicking any card opens the detail modal,
// which scales out of that card's position.

function outcomeOf(it: TicketState): Outcome {
  return it.decision?.status ?? (it.status === "error" ? "error" : "replied");
}

const SECTION_META: Record<
  Outcome,
  { label: string; icon: typeof CheckCircle2; tone: string }
> = {
  escalated: { label: "Needs a human", icon: AlertTriangle, tone: "escalated" },
  error: { label: "Errors", icon: AlertTriangle, tone: "error" },
  replied: { label: "Replied", icon: CheckCircle2, tone: "replied" },
};

export function Results({
  items,
  running = false,
  openIndex,
  onOpen,
  onClose,
  onExport,
  canExport,
  onNewBatch,
  onRetry,
}: {
  items: TicketState[];
  // True while the batch is still triaging — the board shows only finished
  // cards and the header reflects live progress instead of a final tally.
  running?: boolean;
  openIndex: number | null;
  onOpen: (index: number) => void;
  onClose: () => void;
  onExport: () => void;
  canExport: boolean;
  onNewBatch: () => void;
  onRetry?: (index: number) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("grid");
  // Where the open modal should appear to grow from (the clicked card's rect).
  const [origin, setOrigin] = useState<DOMRect | null>(null);

  // Only render cards that have actually been decided (or errored). A queued or
  // in-flight ticket has no decision yet, and `outcomeOf` would default it to
  // "replied" — so during the live split we must work from finished tickets.
  const ready = items.filter((it) => it.decision || it.error);

  const repliedCount = ready.filter((it) => outcomeOf(it) === "replied").length;
  const escalatedCount = ready.filter(
    (it) => outcomeOf(it) === "escalated",
  ).length;

  const visible = ready.filter((it) => {
    if (filter === "all") return true;
    return outcomeOf(it) === filter;
  });

  // When showing all, split into sections (escalated → errors → replied). When a
  // single filter is active, render one flat group with no section header.
  const sectionOrder: Outcome[] = ["escalated", "error", "replied"];
  const sections =
    filter === "all"
      ? sectionOrder
          .map((outcome) => ({
            outcome,
            items: visible.filter((it) => outcomeOf(it) === outcome),
          }))
          .filter((s) => s.items.length > 0)
      : [{ outcome: filter as Outcome, items: visible }];

  const openState = items.find((it) => it.ticket.index === openIndex) ?? null;

  // Capture the clicked card's position, then ask the page to open the modal.
  const handleOpen = (index: number, rect: DOMRect) => {
    setOrigin(rect);
    onOpen(index);
  };

  // Continuous stagger index across sections so cards cascade in reading order.
  let staggerIndex = 0;

  return (
    <div className="scene results">
      <header className="results-head">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-avatar" src="/agent-avatar.png" alt="Hank" />
          <div className="results-head-title">
            <strong>
              {running ? (
                <>
                  <span className="accent">Hank</span> is triaging {ready.length}{" "}
                  of {items.length} tickets
                </>
              ) : (
                <>
                  <span className="accent">Hank</span> triaged {items.length}{" "}
                  tickets
                </>
              )}
            </strong>
            <span className="results-tally">
              <span className="tally tally--replied">{repliedCount} replied</span>
              <span className="tally tally--escalated">
                {escalatedCount} escalated
              </span>
            </span>
          </div>
        </div>

        <div className="results-head-right">
          <div className="filters" role="tablist" aria-label="Filter tickets">
            {(["all", "replied", "escalated"] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={`filter${filter === f ? " filter--on" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "replied" ? "Replied" : "Escalated"}
              </button>
            ))}
          </div>

          <div className="viewtoggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`viewtoggle-btn${view === "grid" ? " viewtoggle-btn--on" : ""}`}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              title="Grid view"
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`viewtoggle-btn${view === "list" ? " viewtoggle-btn--on" : ""}`}
              aria-pressed={view === "list"}
              aria-label="List view"
              title="List view"
              onClick={() => setView("list")}
            >
              <List size={16} strokeWidth={2} />
            </button>
          </div>

          <span className="results-head-sep" aria-hidden />

          <button
            className="btn"
            onClick={onExport}
            disabled={!canExport}
            title={
              canExport
                ? "Download the triaged results as a CSV"
                : "Available once every ticket is processed"
            }
          >
            <Download size={15} strokeWidth={2} />
            Download results CSV
          </button>

          <button className="btn btn-ghost" onClick={onNewBatch}>
            New batch
          </button>
        </div>
      </header>

      <div className="board-wrap">
        {visible.length === 0 ? (
          <div className="board-empty">
            <span className="board-empty-icon" aria-hidden>
              <Inbox size={26} strokeWidth={1.75} />
            </span>
            <p className="board-empty-text">
              {filter === "all"
                ? "No tickets to show yet."
                : `No ${filter} tickets in this batch.`}
            </p>
            {filter !== "all" && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setFilter("all")}
              >
                <FilterX size={15} strokeWidth={2} />
                Clear filter
              </button>
            )}
          </div>
        ) : (
          sections.map(({ outcome, items: groupItems }) => {
            const meta = SECTION_META[outcome];
            const Icon = meta.icon;
            return (
              <section key={outcome} className="board-section">
                <div className={`section-head section-head--${meta.tone}`}>
                  <span className="section-head-title">
                    <Icon size={15} strokeWidth={2.25} />
                    {meta.label}
                  </span>
                  <span className="section-head-count">{groupItems.length}</span>
                  <span className="section-head-rule" />
                </div>
                <div className={`board board--${view}`}>
                  {groupItems.map((it) => (
                    <ResultCard
                      key={it.ticket.index}
                      state={it}
                      order={staggerIndex++}
                      view={view}
                      onOpen={handleOpen}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      <TicketModal
        state={openState}
        origin={origin}
        onClose={onClose}
        onRetry={onRetry}
      />
    </div>
  );
}
