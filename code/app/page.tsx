"use client";

import { useCallback, useEffect, useState } from "react";
import { Queue } from "./components/Queue";
import { TicketDetail } from "./components/TicketDetail";
import { Sources } from "./components/Sources";
import type { Decision, Source, Ticket, TicketState } from "./components/types";

export default function Home() {
  const [items, setItems] = useState<TicketState[]>([]);
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);

  // Load the tickets once on mount.
  useEffect(() => {
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((data: { tickets: Ticket[] }) => {
        setItems(
          data.tickets.map((ticket) => ({ ticket, status: "queued" as const })),
        );
      })
      .catch(() => setItems([]));
  }, []);

  const patch = useCallback((index: number, p: Partial<TicketState>) => {
    setItems((prev) =>
      prev.map((it) => (it.ticket.index === index ? { ...it, ...p } : it)),
    );
  }, []);

  /** Process one ticket: stream sources, then the decision. */
  const processOne = useCallback(
    async (index: number) => {
      patch(index, { status: "processing", sources: undefined, decision: undefined, error: undefined });
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      if (!res.body) {
        patch(index, { status: "error", error: "No response stream." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalStatus: TicketState["status"] = "done";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === "sources") {
            patch(index, { sources: evt.sources as Source[] });
          } else if (evt.type === "decision") {
            const decision: Decision = {
              status: evt.status,
              request_type: evt.request_type,
              product_area: evt.product_area,
              response: evt.response,
              justification: evt.justification,
            };
            finalStatus = evt.status === "escalated" ? "escalated" : "done";
            patch(index, { decision, status: "processing" });
          } else if (evt.type === "error") {
            finalStatus = "error";
            patch(index, { error: evt.message });
          }
        }
      }
      patch(index, { status: finalStatus });
    },
    [patch],
  );

  const runAll = useCallback(async () => {
    setRunning(true);
    for (const it of items) {
      setSelected(it.ticket.index);
      await processOne(it.ticket.index);
    }
    setRunning(false);
  }, [items, processOne]);

  const runOne = useCallback(
    async (index: number) => {
      setRunning(true);
      setSelected(index);
      await processOne(index);
      setRunning(false);
    },
    [processOne],
  );

  const processed = items.filter(
    (it) => it.status === "done" || it.status === "escalated",
  ).length;
  const pct = items.length ? Math.round((processed / items.length) * 100) : 0;
  const current = items.find((it) => it.ticket.index === selected);

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span className="accent">HackerRank</span> Support Triage Agent
        </h1>
        <div className="header-right">
          <div className="progress">
            <span>
              {processed}/{items.length}
            </span>
            <div className="progress-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button className="btn" onClick={runAll} disabled={running || !items.length}>
            {running ? "Running…" : "Run all"}
          </button>
        </div>
      </header>

      <div className="columns">
        <Queue
          items={items}
          selected={selected}
          onSelect={(i) => {
            setSelected(i);
            // Process on click only if it hasn't been run yet and nothing else
            // is running; otherwise just focus the row to view its result.
            const it = items.find((x) => x.ticket.index === i);
            if (!running && it && it.status === "queued") runOne(i);
          }}
        />
        <TicketDetail state={current} />
        <Sources sources={current?.sources} />
      </div>
    </div>
  );
}
