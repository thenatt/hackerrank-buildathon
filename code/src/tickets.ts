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

/** Parse raw CSV text into header-keyed rows. */
function parseCsvText(text: string): Record<string, string>[] {
  return parse(text, { columns: true, skip_empty_lines: true, bom: true });
}

function readCsv(path: string): Record<string, string>[] {
  return parseCsvText(fs.readFileSync(path, "utf8"));
}

/** Map a parsed CSV row to a Ticket, tolerating missing optional columns. */
function rowToTicket(r: Record<string, string>): Ticket {
  return {
    issue: r.issue ?? "",
    subject: r.subject ?? "",
    company: r.company ?? "",
  };
}

/**
 * Thrown when an uploaded CSV doesn't match the expected ticket format, so the
 * API can surface a clear 400 instead of silently producing blank rows.
 */
export class TicketCsvFormatError extends Error {}

/**
 * Validate that parsed rows look like ticket inputs: there must be at least one
 * row and an "issue" column carrying actual content. Subject/company are
 * optional per the input schema.
 */
function validateTicketRows(rows: Record<string, string>[]): void {
  if (!rows.length) {
    throw new TicketCsvFormatError("The CSV has no data rows.");
  }
  const hasIssueColumn = Object.prototype.hasOwnProperty.call(rows[0], "issue");
  if (!hasIssueColumn) {
    throw new TicketCsvFormatError(
      'The CSV is missing the required "issue" column. Expected columns: issue, subject, company.',
    );
  }
  const anyIssueContent = rows.some((r) => (r.issue ?? "").trim().length > 0);
  if (!anyIssueContent) {
    throw new TicketCsvFormatError('Every "issue" value is empty.');
  }
}

/** Read the inputs-only tickets file (issue, subject, company). */
export function readTickets(path: string): Ticket[] {
  return readCsv(path).map(rowToTicket);
}

/**
 * Parse tickets from in-memory CSV text (used by the upload endpoint). Throws a
 * TicketCsvFormatError if the text isn't a same-format ticket CSV.
 */
export function parseTicketsFromText(text: string): Ticket[] {
  let rows: Record<string, string>[];
  try {
    rows = parseCsvText(text);
  } catch (err) {
    throw new TicketCsvFormatError(
      `Could not parse the file as CSV: ${(err as Error).message}`,
    );
  }
  validateTicketRows(rows);
  return rows.map(rowToTicket);
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

/** Serialize predictions to a CSV string in the exact required column order. */
export function ticketsToCsv(rows: OutputRow[]): string {
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
  return stringify(records, {
    header: true,
    columns: OUTPUT_COLUMNS as unknown as string[],
  });
}

/** Write predictions to output.csv in the exact required column order. */
export function writeOutput(path: string, rows: OutputRow[]): void {
  fs.writeFileSync(path, ticketsToCsv(rows));
}
