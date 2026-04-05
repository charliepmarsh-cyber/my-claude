import type { Lead } from "../types/index.js";
import type { RawLead } from "./discovery-types.js";
import { generateLeadId } from "../lib/ids.js";

/**
 * Convert a RawLead (from any connector) into the full Lead schema.
 */
export function rawLeadToLead(raw: RawLead): Lead {
  const now = new Date().toISOString();
  const nameParts = (raw.contactName || "").split(" ");

  const notes = [raw.notes, raw.personalizationHints]
    .filter(Boolean)
    .join("\n");

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
      techStack: [],
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
