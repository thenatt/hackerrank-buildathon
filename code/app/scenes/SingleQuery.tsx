"use client";

import { useState } from "react";

// Decorative single-question scene. The composer renders and accepts typing,
// but Send is intentionally inert (no request, no error) — the live path is the
// batch pipeline. We keep it visibly a preview so it reads as deliberate, not
// broken.

export function SingleQuery({
  onBack,
  onUseBatch,
}: {
  onBack: () => void;
  onUseBatch: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="scene stage">
      <div className="stage-back">
        <button className="link-btn" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="composer-wrap">
        <div className="greeting">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hank hank-md" src="/agent-avatar.png" alt="Hank" />
          <div className="greeting-text">
            <strong>Hi, I’m Hank.</strong>
            <span>Ask me about a HackerRank support issue.</span>
          </div>
        </div>

        <div className="composer">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. How long does a test stay active after I send invites?"
          />
          <div className="composer-row">
            <span className="composer-hint">Preview</span>
            {/* Inert by design: Send performs no action. */}
            <button className="btn" type="button" aria-disabled="true">
              Send
            </button>
          </div>
        </div>

        <p className="preview-note">
          Single questions are a preview. The live engine runs the full ticket
          batch.
          <button className="link-btn" onClick={onUseBatch}>
            Triage a batch instead →
          </button>
        </p>
      </div>
    </div>
  );
}
