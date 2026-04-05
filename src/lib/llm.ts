import { RateLimiter } from "./rate-limiter.js";
import { log } from "./logger.js";
import { generateMockResponse } from "./mock-llm.js";

const rateLimiter = new RateLimiter(
  parseInt(process.env.LLM_RATE_LIMIT || "20", 10)
);

let mockWarningShown = false;

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 3000, 8000]; // exponential-ish

interface LlmRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

interface LlmResponse {
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
}

/**
 * Authentication error — non-retryable, thrown immediately.
 */
export class LlmAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmAuthError";
  }
}

/**
 * Validate that the API key is present and looks plausible.
 * Call this at startup before running the pipeline.
 * Throws LlmAuthError if the key is missing or malformed.
 */
export function validateApiKey(): { mode: "live" | "mock" } {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "sk-ant-...") {
    return { mode: "mock" };
  }

  // Basic format check — Anthropic keys start with "sk-ant-"
  if (!apiKey.startsWith("sk-ant-")) {
    throw new LlmAuthError(
      `ANTHROPIC_API_KEY has invalid format (expected "sk-ant-..." prefix). Check your .env file.`
    );
  }

  if (apiKey.length < 40) {
    throw new LlmAuthError(
      `ANTHROPIC_API_KEY looks truncated (${apiKey.length} chars). Check your .env file.`
    );
  }

  return { mode: "live" };
}

/**
 * Call Claude API with rate limiting and retry logic.
 * Falls back to a structured mock when ANTHROPIC_API_KEY is not set.
 * Throws LlmAuthError on 401 (non-retryable).
 */
export async function callLlm(req: LlmRequest): Promise<LlmResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Mock mode: skip rate limiting entirely for instant responses
  if (!apiKey || apiKey.trim() === "" || apiKey === "sk-ant-...") {
    if (!mockWarningShown) {
      log.warn("No ANTHROPIC_API_KEY set — using smart mock LLM (set key for real responses)");
      mockWarningShown = true;
    }
    return {
      text: generateMockResponse(req.system, req.prompt),
    };
  }

  // Real API: retry loop with backoff
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BACKOFF_MS[attempt - 1] || 8000;
      log.warn(`LLM call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
      await sleep(delay);
    }

    await rateLimiter.acquire();

    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: req.maxTokens || 2048,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
    };

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        return {
          text,
          usage: {
            inputTokens: data.usage?.input_tokens || 0,
            outputTokens: data.usage?.output_tokens || 0,
          },
        };
      }

      const errText = await res.text();

      // 401 = auth error — do NOT retry, fail immediately with clear message
      if (res.status === 401) {
        throw new LlmAuthError(
          `Anthropic API returned 401 Unauthorized. Your API key is invalid or expired. ` +
          `Rotate it at https://console.anthropic.com/settings/keys and update your .env file.`
        );
      }

      // 429 = rate limited, 500/502/503 = transient server errors — retry
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`LLM API error ${res.status}: ${errText.slice(0, 200)}`);
        continue; // retry
      }

      // Other 4xx = client error — do not retry
      throw new Error(`LLM API error ${res.status}: ${errText.slice(0, 200)}`);

    } catch (err) {
      // Re-throw auth errors immediately (non-retryable)
      if (err instanceof LlmAuthError) throw err;

      // Network errors are retryable
      if ((err as Error).message?.includes("fetch")) {
        lastError = err as Error;
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error("LLM call failed after all retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Claude and parse the response as JSON.
 * Strips markdown code fences if present.
 */
export async function callLlmJson<T>(req: LlmRequest): Promise<T> {
  const res = await callLlm({
    ...req,
    system: req.system + "\n\nRespond with valid JSON only. No markdown fences, no explanation.",
  });

  let text = res.text.trim();
  // Strip markdown code fences
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    log.error("Failed to parse LLM JSON response:", text.slice(0, 200));
    throw new Error(`LLM returned invalid JSON: ${(e as Error).message}`);
  }
}

