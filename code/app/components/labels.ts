// Presentation-layer label + style helpers.
//
// The pipeline emits machine enums (`product_issue`, `bug`, `library`, …) and
// snake_case field keys. Those are correct for the CSV/data layer but read like
// an internal tool in the UI. These helpers humanize them and assign each
// request type a semantic color + icon so the board is glanceable and polished.
// Nothing here touches the underlying data — it only maps values for display.

import {
  AlertCircle,
  Bug,
  Sparkles,
  Ban,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  product_issue: "Product issue",
  feature_request: "Feature request",
  bug: "Bug",
  invalid: "Invalid",
};

export function humanizeRequestType(value: string | undefined): string {
  if (!value) return "—";
  return REQUEST_TYPE_LABELS[value] ?? titleCase(value);
}

const PRODUCT_AREA_LABELS: Record<string, string> = {
  conversation_management: "Conversation",
  general: "General",
};

export function humanizeProductArea(value: string | undefined): string {
  if (!value) return "—";
  return PRODUCT_AREA_LABELS[value] ?? titleCase(value);
}

const FIELD_KEY_LABELS: Record<string, string> = {
  request_type: "Request type",
  product_area: "Product area",
  status: "Status",
};

export function humanizeFieldKey(key: string): string {
  return FIELD_KEY_LABELS[key] ?? titleCase(key);
}

/** snake_case / kebab-case -> "Title Case". */
function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface RequestTypeStyle {
  label: string;
  icon: LucideIcon;
  /** CSS class that carries the tag's semantic color (defined in globals.css). */
  tone: string;
}

/** Map a request type to its label, lucide icon, and color tone. */
export function requestTypeStyle(value: string | undefined): RequestTypeStyle {
  switch (value) {
    case "bug":
      return { label: "Bug", icon: Bug, tone: "tag--bug" };
    case "product_issue":
      return { label: "Product issue", icon: AlertCircle, tone: "tag--issue" };
    case "feature_request":
      return { label: "Feature request", icon: Sparkles, tone: "tag--feature" };
    case "invalid":
      return { label: "Invalid", icon: Ban, tone: "tag--invalid" };
    default:
      return {
        label: humanizeRequestType(value),
        icon: HelpCircle,
        tone: "tag--neutral",
      };
  }
}
