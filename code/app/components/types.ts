// Shared client-side types for the live triage UI.

export type TicketStatus =
  | "queued"
  | "processing"
  | "done"
  | "escalated"
  | "error";

export interface Ticket {
  index: number;
  issue: string;
  subject?: string;
  company?: string;
}

export interface Source {
  id: string;
  text: string;
  sourcePath: string;
  folder: string;
  title: string;
  sourceUrl?: string;
  score: number;
}

export interface Decision {
  status: "replied" | "escalated";
  request_type: string;
  product_area: string;
  response: string;
  justification: string;
}

/**
 * v2-only signals behind the decision (Evidence x Risk). These are shown in the
 * UI but never written to the CSV — they explain *why* the agent decided.
 */
export interface Telemetry {
  coverage?: { score: number; top1: number; meanTopK: number };
  risk_class?: string;
  intents?: string[];
  grounded?: boolean;
  unsupported_claims?: string[];
}

export interface TicketState {
  ticket: Ticket;
  status: TicketStatus;
  sources?: Source[];
  decision?: Decision;
  telemetry?: Telemetry;
  error?: string;
}
