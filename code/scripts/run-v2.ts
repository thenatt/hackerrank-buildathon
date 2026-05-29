// v2 batch runner: triage all 16 tickets with the Evidence x Risk pipeline and
// write support_tickets/output.v2.csv. The graded v1 output.csv is never
// touched — this produces a sibling file for side-by-side comparison.
import { triageTicketV2 } from "../src/v2/pipeline";
import { OUTPUT_V2_PATH } from "../src/v2/config-v2";
import { readTickets, writeOutput, type OutputRow } from "../src/tickets";
import { PATHS } from "../src/config";

async function main() {
  const tickets = readTickets(PATHS.tickets);
  console.log(
    `[v2] Triaging ${tickets.length} tickets from ${PATHS.tickets}\n`,
  );

  const rows: OutputRow[] = [];
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    const r = await triageTicketV2(t);
    rows.push({ ...t, ...r });
    const preview = t.issue.replace(/\s+/g, " ").slice(0, 44);
    console.log(
      `#${String(i + 1).padStart(2)}  ${r.status.padEnd(9)} ${r.request_type.padEnd(15)} ${(r.product_area || "—").padEnd(18)} risk=${r.telemetry.risk_class.padEnd(13)} cov=${r.telemetry.coverage.score.toFixed(2)} grounded=${r.telemetry.grounded ? "Y" : "N"}  "${preview}…"`,
    );
  }

  writeOutput(OUTPUT_V2_PATH, rows);
  const escalated = rows.filter((r) => r.status === "escalated").length;
  console.log(
    `\n[v2] Wrote ${rows.length} rows to ${OUTPUT_V2_PATH} (${escalated} escalated, ${rows.length - escalated} replied).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
