"use client";

import type { Source } from "./types";

// The corpus snippets are raw markdown and can carry image tags and long signed
// asset URLs. Those add visual noise without proving grounding, so we strip them
// for display (the underlying retrieval is untouched) and keep the readable text.
function cleanSnippet(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // markdown images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> just their label
    .replace(/https?:\/\/\S+/g, "") // bare URLs (e.g. signed asset links)
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
                <span className="source-path">{s.title || s.sourcePath}</span>
                <span className="source-score">{s.score.toFixed(2)}</span>
              </summary>
              <div className="source-text">{cleanSnippet(s.text)}</div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
