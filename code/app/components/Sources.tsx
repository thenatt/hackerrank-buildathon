"use client";

import type { Source } from "./types";

export function Sources({ sources }: { sources?: Source[] }) {
  return (
    <div className="col">
      <div className="col-title">Retrieved Sources</div>
      <div className="col-body">
        {!sources ? (
          <div className="empty">
            Grounding snippets appear here once a ticket is processed.
          </div>
        ) : sources.length === 0 ? (
          <div className="empty">No relevant snippets retrieved.</div>
        ) : (
          sources.map((s, i) => (
            <details key={s.id} className="source" open={i === 0}>
              <summary>
                <span className="source-path">{s.sourcePath}</span>
                <span className="source-score">{s.score.toFixed(2)}</span>
              </summary>
              <div className="source-text">{s.text}</div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
