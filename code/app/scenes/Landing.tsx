"use client";

// The front door. Introduces the agent ("Hank") and offers the two ways in:
// the live batch triage, and the decorative single-question path.

export function Landing({
  onBatch,
  onSingle,
}: {
  onBatch: () => void;
  onSingle: () => void;
}) {
  return (
    <div className="scene stage">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hank hank-lg" src="/agent-avatar.png" alt="Hank, the support triage agent" />

      <div className="landing-name">Hank</div>
      <div className="landing-role">Support triage agent for HackerRank</div>

      <h1 className="landing-title">Every ticket read, routed, and answered.</h1>
      <p className="landing-sub">
        Hank reads each support ticket, pulls the matching pages from the
        HackerRank help corpus, and decides whether to answer or hand it to a
        human, with the reasoning shown for every call.
      </p>

      <div className="cta-row">
        <button className="btn btn-lg" onClick={onBatch}>
          Triage a ticket batch
        </button>
        <button className="btn btn-ghost btn-lg" onClick={onSingle}>
          Ask a single question
        </button>
      </div>

      <div className="landing-foot">
        <span className="dot" />
        Grounded only in the provided support corpus
      </div>
    </div>
  );
}
