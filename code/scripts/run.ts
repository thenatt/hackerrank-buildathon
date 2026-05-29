// Batch runner: triage all 16 tickets and write support_tickets/output.csv.
//
// This produces the graded artifact. Tickets are processed sequentially for
// deterministic, rate-limit-friendly behavior.
import { triageTicket } from "../src/agent";
import { readTickets, writeOutput, type OutputRow } from "../src/tickets";
import { PATHS } from "../src/config";

async function main() {
  const tickets = readTickets(PATHS.tickets);
  console.log(`Triaging ${tickets.length} tickets from ${PATHS.tickets}\n`);

  const rows: OutputRow[] = [];
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    const r = await triageTicket(t);
    rows.push({ ...t, ...r });
    const preview = t.issue.replace(/\s+/g, " ").slice(0, 50);
    console.log(
      `#${String(i + 1).padStart(2)}  ${r.status.padEnd(9)} ${r.request_type.padEnd(15)} ${(r.product_area || "—").padEnd(20)} "${preview}…"`,
    );
  }

  writeOutput(PATHS.output, rows);
  const escalated = rows.filter((r) => r.status === "escalated").length;
  console.log(
    `\nWrote ${rows.length} rows to ${PATHS.output} (${escalated} escalated, ${rows.length - escalated} replied).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
