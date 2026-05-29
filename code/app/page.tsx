"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Welcome } from "./scenes/Welcome";
import { Loading } from "./scenes/Loading";
import { Results } from "./scenes/Results";
import { Confetti } from "./components/Confetti";
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
//   run      → the live triage scene that progresses through layout phases:
//                full  → the loader fills the screen (no card ready yet)
//                split → loader pinned left ~30%, results board builds right ~70%
//                done  → loader unmounts, the results board takes 100% width
type Scene = "welcome" | "run";

export default function Home() {
  const [scene, setScene] = useState<Scene>("welcome");
  const [items, setItems] = useState<TicketState[]>([]);
  // The ticket currently being worked (drives the loader's "now reading" focus)
  // and, on the results board, the ticket whose detail modal is open (or null).
  const [current, setCurrent] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  // Which logic model runs: v2 (default) or v1 (reachable only at /#v1).
  const [mode, setMode] = useState<Mode>("v2");
  // Kept in a ref so the streaming loop always reads the live mode without
  // needing to be re-created on every hash change.
  const modeRef = useRef<Mode>("v2");

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
    async (ticket: Ticket) => {
      const index = ticket.index;
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
        // Send the full ticket so any uploaded CSV row is triaged directly;
        // index is kept so the server can fall back to the bundled sample.
        body: JSON.stringify({ index, ticket }),
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

  /**
   * Run a batch one ticket at a time, then reveal the results board. The list
   * is passed explicitly (not read from state) so freshly uploaded tickets are
   * processed without waiting for a state flush.
   */
  const runBatch = useCallback(
    async (tickets: Ticket[]) => {
      setItems(tickets.map((ticket) => ({ ticket, status: "queued" as const })));
      setCurrent(tickets[0]?.index ?? 0);
      setOpenIndex(null);
      setScene("run");
      setRunning(true);
      for (const ticket of tickets) {
        setCurrent(ticket.index);
        await processOne(ticket);
      }
      // The layout phase (full → split → done) is derived from `running` plus
      // ticket readiness, so flipping `running` off reveals the full board.
      setRunning(false);
    },
    [processOne],
  );

  // Sample-batch fallback: triage the bundled tickets loaded on mount.
  const startRun = useCallback(() => {
    void runBatch(items.map((it) => it.ticket));
  }, [items, runBatch]);

  // Retry a single errored ticket without re-running the whole batch.
  const retryOne = useCallback(
    (index: number) => {
      const it = items.find((t) => t.ticket.index === index);
      if (it) void processOne(it.ticket);
    },
    [items, processOne],
  );

  // Upload path: triage the tickets parsed from the user's CSV.
  const startUpload = useCallback(
    (tickets: Ticket[]) => {
      void runBatch(tickets);
    },
    [runBatch],
  );

  /** Build the output rows from finished tickets and download them as CSV. */
  const exportResults = useCallback(async () => {
    const rows = items
      .filter((it) => it.decision)
      .map((it) => ({
        issue: it.ticket.issue,
        subject: it.ticket.subject ?? "",
        company: it.ticket.company ?? "",
        response: it.decision!.response,
        product_area: it.decision!.product_area,
        status: it.decision!.status,
        request_type: it.decision!.request_type,
        justification: it.decision!.justification,
      }));
    if (!rows.length) return;

    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [items]);

  if (scene === "welcome") {
    return <Welcome onRunBatch={startRun} onUpload={startUpload} />;
  }

  // ----- Run scene: loader + self-building board, sharing one layout -----
  // `anyReady` flips on with the first finished card (loader slides to the rail
  // and the board appears); `allDone` ends the run (loader unmounts, board fills
  // the screen). `running` distinguishes "still triaging" from "finished".
  const anyReady = items.some((it) => it.decision || it.error);
  const allDone =
    items.length > 0 && items.every((it) => it.decision || it.error);
  const phase: "full" | "split" | "done" = !anyReady
    ? "full"
    : running
      ? "split"
      : "done";

  return (
    <div className={`run run--${phase}`}>
      <Confetti active={phase === "done"} />
      {phase !== "done" && (
        <Loading
          items={items}
          currentIndex={current}
          mode={mode}
          variant={phase === "split" ? "rail" : "full"}
        />
      )}
      {anyReady && (
        <Results
          items={items}
          running={running}
          openIndex={openIndex}
          onOpen={setOpenIndex}
          onClose={() => setOpenIndex(null)}
      onExport={exportResults}
      canExport={allDone}
      onRetry={retryOne}
      onNewBatch={() => {
        setOpenIndex(null);
        setScene("welcome");
      }}
    />
      )}
    </div>
  );
}
