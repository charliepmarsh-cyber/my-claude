import "server-only";
import type { ApolloPerson } from "./apollo-mapping";

/**
 * Apollo.io client — server-side only, key never reaches the browser.
 *
 * Uses the same endpoint the proven outreach-agent connector used:
 * POST /v1/people/match with X-Api-Key auth. Each successful match consumes
 * one Apollo credit, so calls only ever happen from an explicit user action.
 *
 * Data minimisation: personal emails and phone numbers are never requested
 * (reveal_personal_emails / reveal_phone_number stay false).
 */

const APOLLO_BASE = "https://api.apollo.io";
const TIMEOUT_MS = 20_000;

export function apolloConfigured(): boolean {
  return !!process.env.APOLLO_API_KEY?.trim();
}

export type ApolloMatchInput = {
  fullName: string;
  companyName?: string | null;
  companyDomain?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
};

export type ApolloResult =
  | { ok: true; person: ApolloPerson | null }
  | { ok: false; error: string };

export async function apolloMatchPerson(input: ApolloMatchInput): Promise<ApolloResult> {
  const key = process.env.APOLLO_API_KEY?.trim();
  if (!key) return { ok: false, error: "APOLLO_API_KEY is not configured." };

  const [firstName, ...rest] = input.fullName.trim().split(/\s+/);
  const body: Record<string, unknown> = {
    first_name: firstName,
    last_name: rest.join(" ") || undefined,
    organization_name: input.companyName || undefined,
    domain: input.companyDomain || undefined,
    linkedin_url: input.linkedinUrl ? normaliseUrl(input.linkedinUrl) : undefined,
    email: input.email || undefined,
    reveal_personal_emails: false,
    reveal_phone_number: false,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${APOLLO_BASE}/v1/people/match`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Api-Key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Apollo rejected the API key (401/403). Check APOLLO_API_KEY in .env.local." };
    }
    if (res.status === 402) {
      return { ok: false, error: "Apollo says you're out of credits (402)." };
    }
    if (res.status === 429) {
      return { ok: false, error: "Apollo rate limit hit (429) — wait a minute and try again." };
    }
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Apollo error ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as { person?: ApolloPerson };
    return { ok: true, person: json.person ?? null };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Apollo request timed out after 20s." };
    }
    return { ok: false, error: `Apollo request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function normaliseUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

export function domainFromWebsite(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const u = new URL(website.startsWith("http") ? website : `https://${website}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
