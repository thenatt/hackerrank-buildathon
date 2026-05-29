// CSV helpers for reading tickets and writing predictions.
//
// The CSVs contain quoted, multi-line fields, so we use a real CSV parser
// rather than splitting on commas.
import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { TriageFields } from "./schema";
import type { Ticket } from "./agent";

// Exact output column order, matching support_tickets/output.csv and the sample.
export const OUTPUT_COLUMNS = [
  "issue",
  "subject",
  "company",
  "response",
  "product_area",
  "status",
  "request_type",
  "justification",
] as const;

export interface OutputRow extends Ticket, TriageFields {}

/** A sample row carries the expected (labeled) outputs alongside the inputs. */
export interface SampleRow extends Ticket {
  expected: TriageFields;
}

function readCsv(path: string): Record<string, string>[] {
  const text = fs.readFileSync(path, "utf8");
  return parse(text, { columns: true, skip_empty_lines: true, bom: true });
}

/** Read the inputs-only tickets file (issue, subject, company). */
export function readTickets(path: string): Ticket[] {
  return readCsv(path).map((r) => ({
    issue: r.issue ?? "",
    subject: r.subject ?? "",
    company: r.company ?? "",
  }));
}

/** Read the sample file, which includes expected outputs for calibration. */
export function readSampleTickets(path: string): SampleRow[] {
  return readCsv(path).map((r) => ({
    issue: r.issue ?? "",
    subject: r.subject ?? "",
    company: r.company ?? "",
    expected: {
      status: r.status as TriageFields["status"],
      request_type: r.request_type as TriageFields["request_type"],
      product_area: r.product_area ?? "",
      response: r.response ?? "",
      justification: r.justification ?? "",
    },
  }));
}

/** Write predictions to output.csv in the exact required column order. */
export function writeOutput(path: string, rows: OutputRow[]): void {
  const records = rows.map((r) => ({
    issue: r.issue,
    subject: r.subject ?? "",
    company: r.company ?? "",
    response: r.response,
    product_area: r.product_area,
    status: r.status,
    request_type: r.request_type,
    justification: r.justification,
  }));
  const csv = stringify(records, {
    header: true,
    columns: OUTPUT_COLUMNS as unknown as string[],
  });
  fs.writeFileSync(path, csv);
}
