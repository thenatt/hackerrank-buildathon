"use client";

import { useRef, useState } from "react";
import type { Ticket } from "../components/types";

// CSV upload scene (scripted for the demo). A real drop-zone gesture reveals the
// provided ticket set — we don't parse arbitrary files; the live pipeline runs
// the bundled support_tickets.csv. "Run all" hands off to the run scene.

export function Upload({
  tickets,
  onRunAll,
  onBack,
}: {
  tickets: Ticket[];
  onRunAll: () => void;
  onBack: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Any file gesture (drop, pick, or click) reveals the bundled tickets.
  const reveal = () => setRevealed(true);

  return (
    <div className="scene stage">
      <div className="stage-back">
        <button className="link-btn" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="upload-card">
        {!revealed ? (
          <>
            <h2 className="upload-title">Load a ticket batch</h2>
            <p className="upload-sub">
              Drop a support ticket CSV to triage. For this demo Hank runs the
              bundled HackerRank set.
            </p>

            <div
              className={`dropzone${dragging ? " drag" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                reveal();
              }}
            >
              <span className="dropzone-icon">⇪</span>
              <div>
                <strong>Drop a CSV here</strong> or click to browse
              </div>
              <span className="composer-hint">issue · subject · company</span>
            </div>

            {/* The picked file isn't read; selecting one just reveals the set. */}
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={reveal}
            />
          </>
        ) : (
          <>
            <div className="loaded-head">
              <span className="loaded-count">
                {tickets.length} tickets ready
              </span>
              <button className="link-btn" onClick={() => setRevealed(false)}>
                Choose another
              </button>
            </div>

            <div className="preview-list">
              {tickets.map((t, i) => (
                <div
                  key={t.index}
                  className="preview-row"
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <span className="pr-num">#{t.index + 1}</span>
                  <span className="pr-text">
                    {t.subject?.trim() ||
                      t.issue.replace(/\s+/g, " ").slice(0, 60)}
                  </span>
                </div>
              ))}
            </div>

            <div className="upload-actions">
              <button className="btn" onClick={onRunAll}>
                Run all {tickets.length} tickets
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
