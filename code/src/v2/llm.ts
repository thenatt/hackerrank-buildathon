// A single lazily-created OpenAI client shared by the v2 calls, mirroring the
// v1 pattern (client created only when first used, key read from env).
import OpenAI from "openai";
import { requireOpenAIKey } from "../config";

let client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: requireOpenAIKey() });
  return client;
}
