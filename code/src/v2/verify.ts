// Step 2 of the v2 brain: VERIFY (the grounding gate).
//
// Takes the draft answer + the snippets it was supposed to be based on, and
// checks that every concrete claim is actually supported. If not, it returns
// the unsupported claims and, where possible, a trimmed grounded rewrite. This
// is what turns "avoid hallucinated policy" from a hope into a mechanism.
import { CHAT_MODEL, TEMPERATURE, SEED } from "../config";
import type { RetrievedChunk } from "../retriever";
import { getClient } from "./llm";
import { VERIFY_JSON_SCHEMA } from "./schema-v2";
import type { VerifyResult } from "./types";

const SYSTEM_PROMPT = `You are a strict grounding checker for HackerRank support answers.

Given a DRAFT answer and the SNIPPETS it must be based on, decide whether every concrete claim, step, price, or policy in the draft is supported by at least one snippet.

Rules:
- "grounded" is true ONLY if there are no unsupported concrete claims. Generic, content-free politeness ("Hi", "Happy to help", "please contact support") does not need a snippet.
- List every unsupported concrete claim in "unsupported_claims".
- If the draft is not fully grounded, produce "revised_response": a rewrite that keeps ONLY the supported parts (it may be shorter or point the user to contact support). If nothing can be salvaged, set it to "".
- Never add new facts that are not in the snippets.
- Output must conform exactly to the provided JSON schema.`;

/** Render snippets compactly for the checker. */
function renderSources(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "(no snippets were retrieved)";
  return chunks
    .map((c, i) => `[Source ${i + 1}] ${c.text}`)
    .join("\n\n---\n\n");
}

/** Verify a draft response against its retrieved snippets. */
export async function verifyGrounding(
  draftResponse: string,
  chunks: RetrievedChunk[],
): Promise<VerifyResult> {
  const userContent = `SNIPPETS (the only allowed source of truth):
${renderSources(chunks)}

DRAFT ANSWER TO CHECK:
${draftResponse}

Check the draft against the snippets. Return only the JSON object.`;

  const completion = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    temperature: TEMPERATURE,
    seed: SEED,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_schema", json_schema: VERIFY_JSON_SCHEMA },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as VerifyResult;
  // Normalize the "no rewrite" case to undefined for cleaner downstream checks.
  if (!parsed.revised_response || !parsed.revised_response.trim()) {
    parsed.revised_response = undefined;
  }
  return parsed;
}
