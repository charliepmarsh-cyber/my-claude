import type { Lead } from "../types/index.js";

/**
 * Generate a deduplication key from a lead's core identifiers.
 * Uses company name + domain + contact email as composite key.
 */
export function dedupKey(lead: Lead): string {
  const parts = [
    normalize(lead.company.name),
    normalize(extractDomain(lead.company.website)),
    normalize(lead.contact.email),
  ].filter(Boolean);
  return parts.join("|");
}

function normalize(s?: string): string {
  if (!s) return "";
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function extractDomain(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Deduplicate leads, keeping the first occurrence.
 * Returns [unique leads, duplicate count].
 */
export function deduplicateLeads(leads: Lead[]): [Lead[], number] {
  const seen = new Set<string>();
  const unique: Lead[] = [];
  let dupeCount = 0;

  for (const lead of leads) {
    const key = dedupKey(lead);
    if (key && seen.has(key)) {
      dupeCount++;
      continue;
    }
    if (key) seen.add(key);
    unique.push(lead);
  }

  return [unique, dupeCount];
}
