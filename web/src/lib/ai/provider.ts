import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

// AI provider abstraction. When ANTHROPIC_API_KEY is set we call Claude and
// validate the structured JSON output with the caller's Zod schema. Otherwise
// callers fall back to deterministic mock generators (see service.ts) — so the
// whole app works with zero credentials.

// Default to the latest, most capable model. Override via AI_MODEL if needed.
export const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class AINotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set; using mock AI mode.");
    this.name = "AINotConfiguredError";
  }
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!isAIConfigured()) throw new AINotConfiguredError();
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

interface GenerateOptions<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

/**
 * Ask Claude for a single JSON object and validate it against a Zod schema.
 * Throws AINotConfiguredError when no key is present so callers can fall back
 * to mock mode.
 */
export async function generateStructured<T>({
  system,
  prompt,
  schema,
  maxTokens = 2000,
}: GenerateOptions<T>): Promise<T> {
  const anthropic = getClient();

  // Cast keeps us forward-compatible with adaptive thinking even on SDK
  // versions whose static types predate it.
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system:
      system +
      "\n\nRespond with a SINGLE valid JSON object and nothing else — no prose, no markdown code fences. The JSON must satisfy the schema described above.",
    messages: [{ role: "user", content: prompt }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming;

  const response = await anthropic.messages.create(params);

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const json = extractJson(text);
  return schema.parse(json);
}

/** Pull the first JSON object out of a model response, tolerating stray fences. */
export function extractJson(text: string): unknown {
  let candidate = text.trim();
  // Strip ```json ... ``` fences if the model added them anyway.
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to the substring between the first { and last }.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON");
  }
}
