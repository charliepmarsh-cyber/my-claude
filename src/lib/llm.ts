import { RateLimiter } from "./rate-limiter.js";
import { log } from "./logger.js";

const rateLimiter = new RateLimiter(
  parseInt(process.env.LLM_RATE_LIMIT || "20", 10)
);

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
 * Call Claude API with rate limiting.
 * Falls back to a structured mock when ANTHROPIC_API_KEY is not set.
 */
export async function callLlm(req: LlmRequest): Promise<LlmResponse> {
  await rateLimiter.acquire();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.warn("No ANTHROPIC_API_KEY set — using mock LLM response");
    return mockLlmResponse(req);
  }

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: req.maxTokens || 2048,
    system: req.system,
    messages: [{ role: "user", content: req.prompt }],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

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

/**
 * Mock LLM for development/testing without API key.
 */
function mockLlmResponse(req: LlmRequest): LlmResponse {
  // If the prompt asks for JSON, return a plausible structure
  if (req.system.includes("JSON")) {
    return {
      text: JSON.stringify({
        _mock: true,
        _note: "Set ANTHROPIC_API_KEY for real LLM responses",
      }),
    };
  }
  return {
    text: "[Mock LLM response — set ANTHROPIC_API_KEY for real output]",
  };
}
