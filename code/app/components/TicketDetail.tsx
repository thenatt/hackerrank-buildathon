"use client";

import { useEffect, useRef, useState } from "react";
import type { TicketState } from "./types";

/** Reveal text character-by-character for a live "streaming" feel. */
function useTypewriter(text: string | undefined, active: boolean) {
  const [shown, setShown] = useState("");
  const raf = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (raf.current) clearInterval(raf.current);
    if (!text) {
      setShown("");
      return;
    }
    if (!active) {
      setShown(text);
      return;
    }
    let i = 0;
    setShown("");
    raf.current = setInterval(() => {
      i += Math.max(1, Math.round(text.length / 120));
      setShown(text.slice(0, i));
      if (i >= text.length && raf.current) clearInterval(raf.current);
    }, 16);
    return () => {
      if (raf.current) clearInterval(raf.current);
    };
  }, [text, active]);

  const done = shown === (text ?? "");
  return { shown, done };
}

export function TicketDetail({ state }: { state?: TicketState }) {
  const decision = state?.decision;
  const isProcessing = state?.status === "processing";
  const { shown, done } = useTypewriter(decision?.response, isProcessing);

  if (!state) {
    return (
      <div className="col">
        <div className="col-title">Current Ticket</div>
        <div className="empty">Select a ticket, or hit “Run all”.</div>
      </div>
    );
  }

  const { ticket } = state;

  return (
    <div className="col">
      <div className="col-title">
        Ticket #{ticket.index + 1}
        {isProcessing ? " · processing…" : ""}
      </div>
      <div className="detail">
        <div className="ticket-meta">
          Subject: {ticket.subject?.trim() || "(none)"} · Company:{" "}
          {ticket.company || "None"}
        </div>
        <div className="ticket-body">{ticket.issue}</div>

        {state.error && (
          <div className="banner" style={{ margin: "16px 0 0" }}>
            {state.error}
          </div>
        )}

        <div className="section-label">Decision</div>
        {decision ? (
          <div className="fields">
            <div className="field">
              <div className="k">status</div>
              <div
                className="v"
                style={{
                  color:
                    decision.status === "escalated"
                      ? "var(--red)"
                      : "var(--green)",
                }}
              >
                {decision.status}
              </div>
            </div>
            <div className="field">
              <div className="k">request_type</div>
              <div className="v">{decision.request_type}</div>
            </div>
            <div className="field">
              <div className="k">product_area</div>
              <div className="v">{decision.product_area || "—"}</div>
            </div>
          </div>
        ) : (
          <div className="empty" style={{ textAlign: "left", padding: 0 }}>
            {isProcessing ? "Deciding…" : "Not processed yet."}
          </div>
        )}

        {decision && (
          <>
            <div className="section-label">
              Response{isProcessing && !done ? " (streaming…)" : ""}
            </div>
            <div className="response-box">
              {shown}
              {isProcessing && !done && <span className="caret" />}
            </div>

            <div className="section-label">Justification</div>
            <div className="justification-box">{decision.justification}</div>
          </>
        )}
      </div>
    </div>
  );
}
