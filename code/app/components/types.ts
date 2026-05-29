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

export interface TicketState {
  ticket: Ticket;
  status: TicketStatus;
  sources?: Source[];
  decision?: Decision;
  error?: string;
}
