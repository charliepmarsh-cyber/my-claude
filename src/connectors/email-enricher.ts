/**
 * Post-discovery enrichment: fill in missing emails via Hunter.io
 * and attempt to find X/Twitter handles via company domain.
 *
 * Runs after Apollo discovery to patch gaps in contact data.
 */

import { ConnectorHttpClient } from "./http-client.js";
import { log } from "../lib/logger.js";
import type { Lead } from "../types/index.js";
import { saveLead } from "../storage/database.js";

const hunterHttp = new ConnectorHttpClient("hunter-enrich", 12);

const HUNTER_BASE = "https://api.hunter.io/v2";

// Decision-maker titles to prefer
const PREFERRED_TITLES = /founder|ceo|coo|owner|director|head|manager|vp|chief/i;

interface HunterSearchResponse {
  data?: {
    emails?: Array<{
      value?: string;
      first_name?: string;
      last_name?: string;
      position?: string;
      confidence?: number;
      twitter?: string;
    }>;
  };
}

/**
 * Enrich leads that are missing email or X URL.
 * Uses Hunter.io domain-search to find contacts.
 * Modifies and saves leads in-place.
 */
export async function enrichMissingContacts(leads: Lead[]): Promise<{ enriched: number; skipped: number }> {
  const hunterKey = process.env.HUNTER_API_KEY?.trim();
  if (!hunterKey) {
    log.warn("[EmailEnricher] HUNTER_API_KEY not set — skipping email enrichment");
    return { enriched: 0, skipped: leads.length };
  }

  let enriched = 0;
  let skipped = 0;

  for (const lead of leads) {
    const needsEmail = !lead.contact.email;
    const needsX = !lead.contact.xUrl;

    // Skip if already has both, or no website to look up
    if (!needsEmail && !needsX) {
      skipped++;
      continue;
    }

    const domain = extractDomainFromLead(lead) || extractDomainFromEmail(lead.contact.email);
    if (!domain) {
      log.debug(`[EmailEnricher] No domain for ${lead.company.name} — skipping`);
      skipped++;
      continue;
    }

    try {
      log.info(`[EmailEnricher] Looking up contacts for ${domain}...`);
      const res = await hunterHttp.get<HunterSearchResponse>(
        `${HUNTER_BASE}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=5`
      );

      const emails = res.data?.emails || [];
      if (emails.length === 0) {
        skipped++;
        continue;
      }

      // Find the best match: prefer same first name, then decision-maker titles
      const contactFirst = (lead.contact.firstName || "").toLowerCase();
      const bestMatch = emails
        .filter((e) => (e.confidence || 0) >= 30)
        .sort((a, b) => {
          // Exact name match wins
          const aNameMatch = (a.first_name || "").toLowerCase() === contactFirst;
          const bNameMatch = (b.first_name || "").toLowerCase() === contactFirst;
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;
          // Then prefer decision-maker titles
          const aIsDM = PREFERRED_TITLES.test(a.position || "");
          const bIsDM = PREFERRED_TITLES.test(b.position || "");
          if (aIsDM && !bIsDM) return -1;
          if (!aIsDM && bIsDM) return 1;
          // Then confidence
          return (b.confidence || 0) - (a.confidence || 0);
        })[0];

      if (!bestMatch) {
        skipped++;
        continue;
      }

      let updated = false;

      if (needsEmail && bestMatch.value) {
        lead.contact.email = bestMatch.value;
        updated = true;
        log.debug(`[EmailEnricher] Found email for ${lead.company.name}: ${bestMatch.value}`);
      }

      if (needsX && bestMatch.twitter) {
        lead.contact.xUrl = bestMatch.twitter.startsWith("http")
          ? bestMatch.twitter
          : `https://x.com/${bestMatch.twitter}`;
        updated = true;
        log.debug(`[EmailEnricher] Found X for ${lead.company.name}: ${bestMatch.twitter}`);
      }

      if (updated) {
        lead.updatedAt = new Date().toISOString();
        saveLead(lead);
        enriched++;
      } else {
        skipped++;
      }
    } catch (err) {
      log.warn(`[EmailEnricher] Failed for ${domain}: ${(err as Error).message}`);
      skipped++;
    }
  }

  log.info(`[EmailEnricher] Done: ${enriched} enriched, ${skipped} skipped`);
  return { enriched, skipped };
}

function extractDomainFromLead(lead: Lead): string | undefined {
  const website = lead.company.website;
  if (!website) return undefined;
  try {
    const u = new URL(website.startsWith("http") ? website : `https://${website}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^www\./, "");
  }
}

function extractDomainFromEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const domain = email.split("@")[1];
  if (!domain) return undefined;
  const generic = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "mail.com"];
  if (generic.includes(domain.toLowerCase())) return undefined;
  return domain;
}
