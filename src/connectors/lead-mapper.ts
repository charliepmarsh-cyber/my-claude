import type { Lead } from "../types/index.js";
import type { RawLead } from "./discovery-types.js";
import { generateLeadId } from "../lib/ids.js";

/**
 * Known ecommerce tools worth detecting in free-text notes.
 * Detected names are seeded into techStack so the buying-signal
 * scorer (running_paid_ads, email_marketing_stack, analytics_gap…)
 * can see them without waiting for BuiltWith enrichment.
 */
const TECH_KEYWORDS: Array<[RegExp, string]> = [
  [/klaviyo/i, "Klaviyo"],
  [/omnisend/i, "Omnisend"],
  [/mailchimp/i, "Mailchimp"],
  [/recharge/i, "Recharge"],
  [/\bmeta (ads|pixel)|facebook (ads|pixel)/i, "Meta Ads"],
  [/google ads|adwords/i, "Google Ads"],
  [/tiktok (ads|pixel)/i, "TikTok Ads"],
  [/pinterest (ads|tag)/i, "Pinterest Ads"],
  [/\bga4\b|google analytics/i, "GA4"],
  [/gtm|google tag manager/i, "Google Tag Manager"],
  [/hotjar/i, "Hotjar"],
  [/\bclarity\b/i, "Microsoft Clarity"],
  [/yotpo/i, "Yotpo"],
  [/judge\.?me/i, "Judge.me"],
  [/gorgias/i, "Gorgias"],
  [/triple whale/i, "Triple Whale"],
  [/northbeam/i, "Northbeam"],
  [/lifetimely/i, "Lifetimely"],
];

export function extractTechFromText(text: string): string[] {
  const found: string[] = [];
  for (const [pattern, name] of TECH_KEYWORDS) {
    if (pattern.test(text)) found.push(name);
  }
  return found;
}

/**
 * Convert a RawLead (from any connector) into the full Lead schema.
 */
export function rawLeadToLead(raw: RawLead): Lead {
  const now = new Date().toISOString();
  const nameParts = (raw.contactName || "").split(" ");

  const notes = [raw.notes, raw.personalizationHints]
    .filter(Boolean)
    .join("\n");

  const techStack = [...new Set([...(raw.techStack || []), ...extractTechFromText(notes)])];

  const hiringSignals: string[] = [];
  if (raw.intentSignal === "hiring" && raw.notes) {
    hiringSignals.push(raw.notes);
  }

  return {
    id: generateLeadId(),
    source: raw.source,
    segment: raw.segment,
    status: "new",
    company: {
      name: raw.companyName,
      website: raw.website || undefined,
      platform: raw.platform || undefined,
      platformIndicators: raw.platform ? [raw.platform] : [],
      industry: raw.industry || undefined,
      niche: raw.niche || undefined,
      sizeEstimate: raw.sizeEstimate || undefined,
      products: [],
      techStack,
    },
    contact: {
      fullName: raw.contactName || undefined,
      firstName: nameParts[0] || undefined,
      lastName: nameParts.slice(1).join(" ") || undefined,
      role: raw.contactRole || undefined,
      email: raw.contactEmail || undefined,
      linkedinUrl: raw.linkedinUrl || undefined,
      xUrl: raw.xUrl || undefined,
    },
    signals: {
      hiringSignals,
      recentAnnouncements: [],
      customerExperienceClues: [],
      operationalComplexityClues: [],
      multiChannelPresence: [],
      teamStructureClues: [],
      fragmentedTooling: [],
      growthIndicators: [],
      painPointClues: [],
      rawNotes: notes || undefined,
    },
    personalizationNotes: raw.personalizationHints || undefined,
    painPoints: [],
    outreachDrafts: [],
    tags: raw.tags || [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Extract domain from a URL for dedup purposes.
 */
export function extractDomain(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, "");
  }
}
