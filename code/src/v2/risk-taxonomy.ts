// The risk taxonomy — the heart of the "Risk" axis.
//
// In v1 the model was asked to decide "escalate vs reply" directly. In v2 the
// model only CLASSIFIES the risk; the escalate/reply decision is made by code
// (see route.ts). This text is injected into the analyze prompt so the model
// has explicit, auditable definitions for each class.
import type { RiskClass } from "./types";

export const RISK_TAXONOMY = `RISK CLASSIFICATION — assign exactly one risk_class. Classify the risk only; do NOT decide whether to escalate (that is handled separately).

- "authority": resolving the ticket requires a human's authority to make or change a decision only HackerRank staff can make — e.g. altering a candidate's score, overturning a hiring/rejection decision, granting an exception, or acting on behalf of the company. The PERSON, not the documentation, is the blocker.
- "private_data": resolving it requires looking up a specific transaction, order, account, or candidate record that you cannot access — e.g. "what happened to my payment with order ID cs_live_...". A specific private record is required.
- "live_incident": a current, platform-wide outage of core functionality affecting many users that a human must investigate — e.g. "the whole site is down and no pages load", or "none of the submissions across ANY challenges are working". A single feature being down for one user, or one person's access problem, is NOT this.
- "none": no human is strictly required. This includes documented self-service or contact-your-company workflows (refunds, account deletion, rescheduling, permissions, billing), general how-to/best-practice questions, and out-of-scope/chit-chat/malicious requests. Even if YOU cannot personally perform the action, if a documented path or a "contact your company/recruiter" route exists, the risk is "none".

Do NOT raise the risk class just because a ticket mentions money, refunds, payments, account access, deletion, or rescheduling, or because the demand is unreasonable. Classify on the criteria above, not on keywords.`;

/**
 * Whether a risk class requires a human (i.e. forces escalation). Only the
 * three genuine-risk classes do; "none" lets the agent answer if grounded.
 */
export function riskRequiresHuman(risk: RiskClass): boolean {
  return risk !== "none";
}
