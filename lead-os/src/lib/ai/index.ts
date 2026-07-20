import "server-only";
import { z } from "zod";
import { getDb } from "@/db";
import { aiRuns } from "@/db/schema";
import { newId } from "@/lib/ids";

/**
 * AI abstraction layer.
 *
 * - Anthropic is the primary provider (server-side only; key never reaches the browser).
 * - Structured output via a forced tool call, validated with Zod, retried once.
 * - Every run (including failures and mock short-circuits) is logged to ai_runs
 *   with token counts and an estimated cost.
 * - With no API key (or AI_MODE=mock) every call returns `null` and callers
 *   fall back to the deterministic rules engine — the app is fully usable
 *   without a key.
 */

export type AiMode = "anthropic" | "mock";

export function aiMode(): AiMode {
  if (process.env.AI_MODE === "mock") return "mock";
  return process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock";
}

export function aiModel(): string {
  return process.env.AI_MODEL || "claude-sonnet-5";
}

/** USD per million tokens (input, output) — used for cost estimates in ai_runs. */
const COSTS: Record<string, [number, number]> = {
  "claude-sonnet-5": [3, 15],
  "claude-opus-4-8": [15, 75],
  "claude-haiku-4-5-20251001": [1, 5],
};

function estimateCost(model: string, inTok: number, outTok: number): number {
  const [inC, outC] = COSTS[model] ?? [3, 15];
  return (inTok / 1_000_000) * inC + (outTok / 1_000_000) * outC;
}

/** Strip emails and phone numbers before sending content to the API. */
export function redact(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email redacted]")
    .replace(/(\+?\d[\d\s().-]{8,}\d)/g, "[phone redacted]");
}

type RunArgs<T> = {
  purpose: string;
  promptVersion: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** JSON Schema for the forced tool input — keep in sync with `schema`. */
  jsonSchema: Record<string, unknown>;
  leadId?: string | null;
  maxTokens?: number;
};

function logRun(row: {
  purpose: string;
  promptVersion: string;
  leadId?: string | null;
  provider: string;
  model: string | null;
  status: "ok" | "error" | "mock";
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  inputSummary?: string;
}): void {
  try {
    const db = getDb();
    db.insert(aiRuns)
      .values({
        id: newId("ai"),
        purpose: row.purpose,
        provider: row.provider,
        model: row.model,
        promptVersion: row.promptVersion,
        leadId: row.leadId ?? null,
        inputSummary: row.inputSummary?.slice(0, 300) ?? null,
        inputTokens: row.inputTokens ?? null,
        outputTokens: row.outputTokens ?? null,
        costEstimateUsd:
          row.inputTokens !== undefined && row.outputTokens !== undefined && row.model
            ? estimateCost(row.model, row.inputTokens, row.outputTokens)
            : null,
        durationMs: row.durationMs ?? null,
        status: row.status,
        error: row.error?.slice(0, 500) ?? null,
      })
      .run();
  } catch {
    // Logging must never break the caller.
  }
}

/**
 * Run a structured AI task. Returns validated data or null (mock mode /
 * failure after retry) — callers must have a rules-based fallback.
 */
export async function runStructured<T>(args: RunArgs<T>): Promise<T | null> {
  const mode = aiMode();
  if (mode === "mock") {
    logRun({
      purpose: args.purpose,
      promptVersion: args.promptVersion,
      leadId: args.leadId,
      provider: "mock",
      model: null,
      status: "mock",
      inputSummary: "AI disabled (no key or AI_MODE=mock) — rules fallback used",
    });
    return null;
  }

  const model = aiModel();
  const started = Date.now();
  const body = {
    model,
    max_tokens: args.maxTokens ?? 1500,
    system: args.system,
    messages: [{ role: "user", content: redact(args.user) }],
    tools: [
      {
        name: "submit_result",
        description: "Submit the structured result. Always call this exactly once.",
        input_schema: args.jsonSchema,
      },
    ],
    tool_choice: { type: "tool", name: "submit_result" },
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 429 || res.status >= 500) throw new Error(`Retryable ${res.status}: ${text.slice(0, 200)}`);
        logRun({
          purpose: args.purpose,
          promptVersion: args.promptVersion,
          leadId: args.leadId,
          provider: "anthropic",
          model,
          status: "error",
          error: `${res.status}: ${text.slice(0, 300)}`,
          durationMs: Date.now() - started,
        });
        return null;
      }

      const json = (await res.json()) as {
        content: Array<{ type: string; input?: unknown }>;
        usage?: { input_tokens: number; output_tokens: number };
      };
      const toolUse = json.content.find((c) => c.type === "tool_use");
      const parsed = args.schema.safeParse(toolUse?.input);
      if (!parsed.success) throw new Error(`Schema validation failed: ${parsed.error.issues[0]?.message}`);

      logRun({
        purpose: args.purpose,
        promptVersion: args.promptVersion,
        leadId: args.leadId,
        provider: "anthropic",
        model,
        status: "ok",
        inputTokens: json.usage?.input_tokens,
        outputTokens: json.usage?.output_tokens,
        durationMs: Date.now() - started,
        inputSummary: args.user.slice(0, 200),
      });
      return parsed.data;
    } catch (err) {
      if (attempt === 1) {
        logRun({
          purpose: args.purpose,
          promptVersion: args.promptVersion,
          leadId: args.leadId,
          provider: "anthropic",
          model,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - started,
        });
        return null;
      }
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return null;
}
