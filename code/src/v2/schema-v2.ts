// Strict JSON schemas for the two v2 LLM calls (analyze + verify).
//
// As in v1, we hand these to OpenAI as structured-output `response_format`s so
// every call returns a valid, parseable object — no fragile string parsing.
import {
  REQUEST_TYPE_VALUES,
  PRODUCT_AREA_VALUES,
} from "../schema";

export const RISK_CLASS_VALUES = [
  "authority",
  "private_data",
  "live_incident",
  "none",
] as const;

/** Schema for the analyze call: understand the ticket + draft a grounded answer. */
export const ANALYZE_JSON_SCHEMA = {
  name: "ticket_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "intents",
      "risk_class",
      "request_type",
      "product_area",
      "draft_response",
      "justification",
    ],
    properties: {
      intents: {
        type: "array",
        items: { type: "string" },
        description: "Each distinct ask in the ticket, as a short phrase.",
      },
      risk_class: { type: "string", enum: [...RISK_CLASS_VALUES] },
      request_type: { type: "string", enum: [...REQUEST_TYPE_VALUES] },
      product_area: { type: "string", enum: PRODUCT_AREA_VALUES },
      draft_response: {
        type: "string",
        description:
          "A draft user-facing answer grounded ONLY in the retrieved snippets.",
      },
      justification: {
        type: "string",
        description: "1-2 sentence rationale, traceable to the corpus.",
      },
    },
  },
} as const;

/** Schema for the verify call: is the draft actually backed by the snippets? */
export const VERIFY_JSON_SCHEMA = {
  name: "grounding_check",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["grounded", "unsupported_claims", "revised_response"],
    properties: {
      grounded: {
        type: "boolean",
        description:
          "True only if every concrete claim/step in the response is supported by a snippet.",
      },
      unsupported_claims: {
        type: "array",
        items: { type: "string" },
        description: "Claims not supported by any snippet (empty if grounded).",
      },
      revised_response: {
        type: "string",
        description:
          "A fully-grounded rewrite using only supported claims, or empty string if none is possible.",
      },
    },
  },
} as const;
