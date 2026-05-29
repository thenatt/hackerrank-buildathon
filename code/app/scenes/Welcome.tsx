"use client";

import { useRef, useState } from "react";
import type { Ticket } from "../components/types";

// The single front door. One inviting composer that (a) accepts a typed
// question — a deliberate PREVIEW, Send does nothing — and (b) doubles as a
// drag-and-drop target for a ticket CSV. A dropped or picked CSV is parsed
// (server-side) into tickets and handed up via onUpload to run the live batch.
// onRunBatch is the quiet fallback that triages the bundled sample set.

export function Welcome({
  onRunBatch,
  onUpload,
}: {
  onRunBatch: () => void;
  onUpload: (tickets: Ticket[]) => void;
}) {
  const [value, setValue] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Parse an uploaded CSV on the server, then lift the tickets up to run them.
  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/tickets", { method: "POST", body: form });
      const data = (await res.json()) as { tickets?: Ticket[]; error?: string };
      if (!res.ok || !data.tickets) {
        setError(data.error ?? "Could not read that CSV.");
        return;
      }
      if (!data.tickets.length) {
        setError("That CSV has no ticket rows.");
        return;
      }
      onUpload(data.tickets);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={`scene welcome${dragging ? " welcome--drag" : ""}`}
      // The whole page is a drop target so a dropped CSV is never "missed".
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        // Only clear when the pointer actually leaves the window.
        if (e.relatedTarget === null) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      {/* Full-page hint that appears while a file is being dragged in. */}
      <div className="welcome-dropveil" aria-hidden={!dragging}>
        <div className="welcome-dropveil-inner">
          <span className="welcome-dropveil-icon">⤓</span>
          Drop your ticket CSV to start triaging
        </div>
      </div>

      <div className="welcome-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hank hank-md welcome-avatar"
          src="/agent-avatar.png"
          alt="Hank, the support triage agent"
        />

        <h1 className="welcome-title">Ask Hank anything</h1>
        <p className="welcome-sub">
          Ask a question, or drop a batch of tickets about HackerRank support.
        </p>

        {/* The composer: typed question (preview) + drop target. */}
        <div className="ask-composer">
          <textarea
            className="composer-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask anything… e.g. How long does a test stay active after I send invites?"
            rows={1}
          />
          <div className="composer-bar">
            <button
              type="button"
              className="composer-attach"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <span className="composer-attach-icon">＋</span>
              {uploading ? "Reading CSV…" : "Attach a ticket CSV"}
            </button>
            {/* Inert by design: single answers are a preview in this demo. */}
            <button
              type="button"
              className="btn composer-send"
              aria-disabled="true"
              title="Single answers are a preview. Drop a CSV to run the live batch."
            >
              Ask Hank
            </button>
          </div>
        </div>

        {error && <p className="welcome-error">{error}</p>}

        {/* Quiet fallback: triage the bundled sample set with one click. */}
        <p className="welcome-batch">
          Don&apos;t have a file handy?
          <button className="link-accent" onClick={onRunBatch} disabled={uploading}>
            Run the sample batch
          </button>
        </p>

        {/* Quiet trust line: every answer is grounded in the support corpus. */}
        <p className="welcome-foot">
          <span className="dot" aria-hidden />
          Grounded in the HackerRank support corpus
        </p>

        {/* Hidden picker — selecting a file parses + runs that CSV. */}
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          hidden
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            // Reset so picking the same file again re-triggers onChange.
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
