// The agent's structured output contract: the five graded fields.
//
// We hand this JSON schema to the OpenAI API as a strict response_format, so
// every call returns a valid, parseable object with allowed enum values —
// which in turn guarantees a valid CSV row.
import {
  FOLDER_PRODUCT_AREAS,
  SPECIAL_PRODUCT_AREAS,
} from "./product-area-map";

export const STATUS_VALUES = ["replied", "escalated"] as const;
export const REQUEST_TYPE_VALUES = [
  "product_issue",
  "feature_request",
  "bug",
  "invalid",
] as const;

// All allowed product_area labels: folder-derived + special + "" (escalations).
export const PRODUCT_AREA_VALUES = [
  ...FOLDER_PRODUCT_AREAS,
  ...SPECIAL_PRODUCT_AREAS,
  "",
];

export type Status = (typeof STATUS_VALUES)[number];
export type RequestType = (typeof REQUEST_TYPE_VALUES)[number];

export interface TriageFields {
  status: Status;
  request_type: RequestType;
  product_area: string;
  response: string;
  justification: string;
}

/** Strict JSON schema passed to the OpenAI structured-output API. */
export const TRIAGE_JSON_SCHEMA = {
  name: "support_triage_decision",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "status",
      "request_type",
      "product_area",
      "response",
      "justification",
    ],
    properties: {
      status: { type: "string", enum: [...STATUS_VALUES] },
      request_type: { type: "string", enum: [...REQUEST_TYPE_VALUES] },
      product_area: {
        type: "string",
        enum: PRODUCT_AREA_VALUES,
        description:
          'Normalized product area, or "" when escalated, or "conversation_management" for out-of-scope/chit-chat.',
      },
      response: {
        type: "string",
        description:
          'User-facing answer grounded in the corpus, or exactly "Escalate to a human" when escalated.',
      },
      justification: {
        type: "string",
        description: "1-2 sentence rationale, traceable to the corpus.",
      },
    },
  },
} as const;

/**
 * Defensive normalization: enforce the field conventions even if the model
 * drifts (blank product_area + fixed response on escalation). Structured output
 * already constrains enums; this guarantees the cross-field invariants.
 */
export function normalizeFields(f: TriageFields): TriageFields {
  const out = { ...f };
  if (out.status === "escalated") {
    out.product_area = "";
    out.response = "Escalate to a human";
  }
  return out;
}
