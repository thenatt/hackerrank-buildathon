"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Welcome } from "./scenes/Welcome";
import { Loading } from "./scenes/Loading";
import { Results } from "./scenes/Results";
import { modeFromHash, type Mode } from "./theme-routes";
import type {
  Decision,
  Source,
  Telemetry,
  Ticket,
  TicketState,
} from "./components/types";

// The whole demo is one client-side scene machine — we never change routes, so
// the live streaming below stays intact while the user moves between scenes.
//   welcome  → the single "ask anything / drop a CSV" entry
//   loading  → a full-page animation while the batch is triaged one ticket at a time
//   results  → the board that builds itself, one card per ticket
type Scene = "welcome" | "loading" | "results";

export default function Home() {
  const [scene, setScene] = useState<Scene>("welcome");
  const [items, setItems] = useState<TicketState[]>([]);
  // The ticket currently being worked (drives the loader's "now reading" focus)
  // and, on the results board, the ticket whose detail modal is open (or null).
  const [current, setCurrent] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  // Which logic model runs: v1 (default) or v2 (reachable only at /#v2).
  const [mode, setMode] = useState<Mode>("v1");
  // Kept in a ref so the streaming loop always reads the live mode without
  // needing to be re-created on every hash change.
  const modeRef = useRef<Mode>("v1");

  // Resolve the pipeline mode from the URL hash, and keep it in sync.
  useEffect(() => {
    const sync = () => {
      const m = modeFromHash(window.location.hash);
      modeRef.current = m;
      setMode(m);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Load the tickets once on mount (inputs only, read from the bundled CSV).
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

  /** Process one ticket: stream its sources, then its decision. */
  const processOne = useCallback(
    async (index: number) => {
      patch(index, {
        status: "processing",
        sources: undefined,
        decision: undefined,
        telemetry: undefined,
        error: undefined,
      });

      // v2 has its own endpoint + richer stream; v1 is untouched.
      const endpoint =
        modeRef.current === "v2" ? "/api/process-v2" : "/api/process";
      const res = await fetch(endpoint, {
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
      // v2 telemetry is built up across several stage events for this ticket.
      let telemetry: Telemetry | undefined;

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
            // v2 attaches a coverage signal to the sources stage.
            if (evt.coverage) {
              telemetry = { ...telemetry, coverage: evt.coverage };
              patch(index, { telemetry });
            }
          } else if (evt.type === "analysis") {
            // v2-only: risk class + intents surfaced before the decision.
            telemetry = {
              ...telemetry,
              risk_class: evt.risk_class,
              intents: evt.intents,
            };
            patch(index, { telemetry });
          } else if (evt.type === "verification") {
            // v2-only: grounding check result.
            telemetry = {
              ...telemetry,
              grounded: evt.grounded,
              unsupported_claims: evt.unsupported_claims,
            };
            patch(index, { telemetry });
          } else if (evt.type === "decision") {
            const decision: Decision = {
              status: evt.status,
              request_type: evt.request_type,
              product_area: evt.product_area,
              response: evt.response,
              justification: evt.justification,
            };
            finalStatus = evt.status === "escalated" ? "escalated" : "done";
            // v2 sends the consolidated telemetry on the decision stage.
            if (evt.telemetry) telemetry = evt.telemetry as Telemetry;
            patch(index, { decision, telemetry, status: "processing" });
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

  /** Run the whole batch one ticket at a time, then reveal the results board. */
  const runAll = useCallback(async () => {
    setRunning(true);
    for (const it of items) {
      setCurrent(it.ticket.index);
      await processOne(it.ticket.index);
    }
    setRunning(false);
    // A short beat on the finished loader, then assemble the results board.
    setTimeout(() => setScene("results"), 650);
  }, [items, processOne]);

  // Hand off from the welcome scene: show the loader, then start the batch.
  const startRun = useCallback(() => {
    // Reset any prior run so a "New batch" replays cleanly from queued.
    setItems((prev) =>
      prev.map((it) => ({
        ticket: it.ticket,
        status: "queued" as const,
      })),
    );
    setCurrent(0);
    setOpenIndex(null);
    setScene("loading");
    void runAll();
  }, [runAll]);

  if (scene === "welcome") {
    return <Welcome mode={mode} onRunBatch={startRun} />;
  }

  if (scene === "loading") {
    return <Loading items={items} currentIndex={current} mode={mode} />;
  }

  // ----- Results scene (the self-building board) -----
  return (
    <Results
      items={items}
      mode={mode}
      openIndex={openIndex}
      onOpen={setOpenIndex}
      onClose={() => setOpenIndex(null)}
      onNewBatch={() => {
        setOpenIndex(null);
        setScene("welcome");
      }}
    />
  );
}
