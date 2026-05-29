// Escalation + classification policy.
//
// This module encodes — as explicit, human-readable text injected into the
// agent prompt — *when* to escalate vs. reply and *how* to classify
// request_type. Keeping the policy here (not buried in the prompt string)
// makes it auditable and defensible in the AI Judge interview.

/**
 * The escalation principle. The key nuance: escalate only when a human's
 * authority, private/account-specific data, or a live incident is genuinely
 * required — NOT merely because a ticket mentions money or account access.
 * Documented self-service flows get grounded replies.
 */
export const ESCALATION_POLICY = `ESCALATION POLICY — decide status = "escalated" vs "replied".

Escalate (status = "escalated") ONLY when at least one is true:
- HUMAN AUTHORITY REQUIRED: the request asks you to make or change a decision only a human/HackerRank staff can make — e.g. altering a candidate's score, overturning a hiring decision, granting exceptions, or acting on behalf of the company.
- PRIVATE / ACCOUNT-SPECIFIC DATA: resolving it requires looking up a specific transaction, order, account, or candidate record that you cannot access (e.g. "what happened to my payment with order ID cs_live_...").
- LIVE INCIDENT (BROAD): a current, platform-wide outage of core functionality affecting many users that a human must investigate — e.g. "the whole site is down and no pages load", or a core flow broadly broken ("none of the submissions across ANY challenges are working"). A single tool/feature being down for one user, or one person's access problem, is NOT this — give a grounded reply/troubleshooting instead.

Otherwise REPLY (status = "replied"), grounded in the corpus, when:
- The ticket describes a DOCUMENTED, SELF-SERVICE or CONTACT-YOUR-COMPANY workflow — even if it touches money, refunds, account deletion, permissions, or rescheduling. Point the user to the documented steps or the right party. A human may finalize it, but the PATH is documented, so explain the path. The fact that YOU cannot personally perform the action is NOT grounds to escalate when a documented path or "contact your company/recruiter" route exists.
- The ticket is a general product question, how-to, or best-practice question the corpus answers.
- The ticket is out of scope / not about HackerRank, OR asks you to do something malicious or outside support (trivia, chit-chat, courtesy thanks, "delete all files", run commands). Do NOT escalate these — decline or acknowledge briefly and stay in scope (see RESPONSE CONVENTIONS). Escalation is for genuine HackerRank cases that need a human, not for junk/abuse.

Do NOT escalate just because a ticket mentions money, refunds, payments, account access, deletion, or rescheduling, or because the demand is unreasonable. Escalate on the criteria above, not on keywords.
Never invent policy, steps, prices, or commitments that are not in the retrieved corpus. If the corpus does not support a concrete answer and none of the escalation criteria apply, reply with the closest documented guidance and say what is not covered.`;

/**
 * request_type classification guidance. Allowed values are fixed by the spec:
 * product_issue, feature_request, bug, invalid.
 */
export const REQUEST_TYPE_POLICY = `REQUEST_TYPE CLASSIFICATION — choose exactly one:
- "bug": something on the platform is broken or erroring — outages, failures, "X is down", "submissions not working", a feature misbehaving.
- "feature_request": the user asks for new capability or a change that does not exist today.
- "invalid": the ticket is NOT a genuine HackerRank support request — trivia, chit-chat, pure courtesy/thanks, content unrelated to HackerRank, or a request for the agent to perform a malicious/system-level action ("delete all files"). Reserve "invalid" for these; it is NOT for difficult or unreasonable but genuine requests.
- "product_issue": the default for genuine HackerRank support matters that are not bugs/feature_requests/invalid — how-to questions, configuration, billing/refund/account workflows, permissions, assessments, interviews, rescheduling, AND genuine grievances or disputes about HackerRank (e.g. disputing a test score) even when the specific demand cannot be granted.`;

/**
 * Conventions the response/product_area must follow for special cases, so the
 * output matches the sample CSV exactly.
 */
export const RESPONSE_CONVENTIONS = `RESPONSE & FIELD CONVENTIONS:
- If status = "escalated": set response to exactly "Escalate to a human" and set product_area to "" (empty string). request_type still reflects the underlying issue (e.g. a site outage is "bug").
- When request_type = "invalid" (status = "replied"), pick product_area by these two archetypes:
  (a) An OUT-OF-SCOPE / UNRELATED QUESTION or request you decline (there IS a question/ask, it's just not HackerRank support) — e.g. "What is the name of the actor in Iron Man?", or "give me code to delete all files" → product_area = "conversation_management", and reply briefly declining ("I am sorry, this is out of scope from my capabilities"). Do not invent HackerRank content.
  (b) A PURE COURTESY / ACKNOWLEDGEMENT with NO question or actionable ask — e.g. "Thank you for helping me", a greeting, or a sign-off → product_area = "" (empty string), and reply with a short acknowledgement ("Happy to help"). The deciding test: if there is nothing being asked at all, it is (b) blank; if something is being asked but it's out of scope, it is (a) conversation_management.
- If status = "replied" and the ticket is a real HackerRank question: write a helpful, corpus-grounded response, and set product_area to the best-fit area from the allowed list.
- justification: 1-2 sentences explaining WHY you replied vs. escalated and what the response is grounded in. Be concise and traceable to the corpus.`;
