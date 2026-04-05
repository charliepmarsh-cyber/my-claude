import { RateLimiter } from "../lib/rate-limiter.js";
import { log } from "../lib/logger.js";

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 3000, 8000];

/**
 * A rate-limited HTTP client with retry logic for connector APIs.
 * Each connector should create its own instance with appropriate rate limits.
 */
export class ConnectorHttpClient {
  private rateLimiter: RateLimiter;
  private name: string;

  constructor(name: string, maxRequestsPerMinute: number) {
    this.name = name;
    this.rateLimiter = new RateLimiter(maxRequestsPerMinute);
  }

  async get<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    return this.request<T>("GET", url, headers);
  }

  async post<T>(url: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
    return this.request<T>("POST", url, {
      "Content-Type": "application/json",
      ...headers,
    }, JSON.stringify(body));
  }

  private async request<T>(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_BACKOFF_MS[attempt - 1] || 8000;
        log.warn(`[${this.name}] Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        await sleep(delay);
      }

      await this.rateLimiter.acquire();

      try {
        const res = await fetch(url, {
          method,
          headers,
          body: method !== "GET" ? body : undefined,
        });

        if (res.ok) {
          return (await res.json()) as T;
        }

        const errText = await res.text();

        // 401/403 = auth error — don't retry
        if (res.status === 401 || res.status === 403) {
          throw new ConnectorAuthError(
            `[${this.name}] API returned ${res.status}: ${errText.slice(0, 200)}. Check your API key.`
          );
        }

        // 429 or 5xx = retryable
        if (res.status === 429 || res.status >= 500) {
          lastError = new Error(`[${this.name}] API error ${res.status}: ${errText.slice(0, 200)}`);
          continue;
        }

        // Other 4xx = client error, don't retry
        throw new Error(`[${this.name}] API error ${res.status}: ${errText.slice(0, 200)}`);
      } catch (err) {
        if (err instanceof ConnectorAuthError) throw err;
        if ((err as Error).message?.includes("fetch failed") || (err as Error).cause) {
          lastError = err as Error;
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error(`[${this.name}] Request failed after all retries`);
  }
}

export class ConnectorAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectorAuthError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
