// v2 calibration: run the Evidence x Risk pipeline over the 7 labeled sample
// rows and compare the discrete fields to the expected labels. The sample CSV
// is our only ground truth, so this is how we justify the coverage threshold
// (COVERAGE_TAU) and the risk taxonomy wording.
import { triageTicketV2 } from "../src/v2/pipeline";
import { readSampleTickets } from "../src/tickets";
import { PATHS } from "../src/config";

function mark(ok: boolean): string {
  return ok ? "✓" : "✗";
}

async function main() {
  const samples = readSampleTickets(PATHS.sampleTickets);
  console.log(`[v2] Calibrating against ${samples.length} labeled sample rows\n`);

  let statusOk = 0;
  let typeOk = 0;
  let areaOk = 0;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const r = await triageTicketV2(s);

    const sOk = r.status === s.expected.status;
    const tOk = r.request_type === s.expected.request_type;
    const aOk = r.product_area === s.expected.product_area;
    statusOk += sOk ? 1 : 0;
    typeOk += tOk ? 1 : 0;
    areaOk += aOk ? 1 : 0;

    const preview = s.issue.replace(/\s+/g, " ").slice(0, 45);
    console.log(`#${i + 1} "${preview}…"`);
    console.log(
      `   status       ${mark(sOk)}  pred=${r.status}  exp=${s.expected.status}`,
    );
    console.log(
      `   request_type ${mark(tOk)}  pred=${r.request_type}  exp=${s.expected.request_type}`,
    );
    console.log(
      `   product_area ${mark(aOk)}  pred="${r.product_area}"  exp="${s.expected.product_area}"`,
    );
    console.log(
      `   risk=${r.telemetry.risk_class}  coverage=${r.telemetry.coverage.score.toFixed(2)}  grounded=${r.telemetry.grounded}`,
    );
    console.log(
      `   response: ${r.response.replace(/\s+/g, " ").slice(0, 90)}…\n`,
    );
  }

  const n = samples.length;
  console.log("=== v2 accuracy on labeled fields ===");
  console.log(`status:       ${statusOk}/${n}`);
  console.log(`request_type: ${typeOk}/${n}`);
  console.log(`product_area: ${areaOk}/${n}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
