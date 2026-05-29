"use client";

import { useRef, useState } from "react";
import type { Mode } from "../theme-routes";

// The single front door. One inviting composer that (a) accepts a typed
// question — a deliberate PREVIEW, Send does nothing — and (b) doubles as a
// drag-and-drop target for a ticket CSV. Beneath it, one quiet, explicit way to
// triage a batch. There is no two-button fork: the composer is the path, the
// batch is an option within it. For the demo, any CSV gesture (drop, pick, or
// "Run the sample set") runs the bundled HackerRank ticket batch.

export function Welcome({
  mode,
  onRunBatch,
}: {
  mode: Mode;
  onRunBatch: () => void;
}) {
  const [value, setValue] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        onRunBatch();
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

        {mode === "v2" && (
          <span className="mode-badge welcome-mode">Evidence × Risk · v2</span>
        )}

        <h1 className="welcome-title">
          Ask Hank anything about HackerRank support.
        </h1>
        <p className="welcome-sub">
          Ask a question, or drop in a batch of tickets and watch Hank triage
          every one.
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
            >
              <span className="composer-attach-icon">＋</span>
              Attach a ticket CSV
            </button>
            {/* Inert by design: single answers are a preview in this demo. */}
            <button
              type="button"
              className="btn composer-send"
              aria-disabled="true"
              title="Single answers are a preview — drop a CSV to run the live batch"
            >
              Ask Hank
            </button>
          </div>
        </div>

        {/* Hidden picker — selecting any file runs the scripted bundled set. */}
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          hidden
          onChange={onRunBatch}
        />
      </div>
    </div>
  );
}
