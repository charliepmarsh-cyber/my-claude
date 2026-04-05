/**
 * Job Posting Signal Connector
 *
 * Discovers companies hiring for roles that signal automation needs.
 * Uses public job search APIs and RSS feeds — no auth required.
 *
 * Sources:
 *   - Google Jobs via SerpAPI-style public search (HTML scraping avoided)
 *   - Indeed RSS feeds (public, no auth)
 *   - Remotive API (public, no auth)
 *
 * Signals: hiring for ops/fulfillment/CX/automation roles = operational complexity
 *
 * Rate limit: 10 req/min (polite crawling of public endpoints)
 */

import type { LeadSourceConnector, DiscoveryParams, RawLead } from "./discovery-types.js";
import { ConnectorHttpClient } from "./http-client.js";
import { log } from "../lib/logger.js";
import type { LeadSegment } from "../types/index.js";

const http = new ConnectorHttpClient("jobsignals", 10);

// Role keywords by segment that signal automation opportunity
const JOB_QUERIES: Record<LeadSegment, string[]> = {
  shopify: [
    "shopify operations manager",
    "ecommerce fulfillment coordinator",
    "shopify customer support lead",
  ],
  ecommerce: [
    "ecommerce operations manager",
    "head of ecommerce operations",
    "fulfillment operations manager",
    "ecommerce growth manager",
  ],
  enterprise: [
    "head of automation",
    "director digital transformation",
    "VP operations automation",
    "enterprise process automation",
  ],
};

/**
 * Remotive.com public API for remote job listings.
 * No auth required. Good source for tech-adjacent roles.
 */
interface RemotiveJob {
  id?: number;
  title?: string;
  company_name?: string;
  company_logo_url?: string;
  category?: string;
  tags?: string[];
  url?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

export const jobSignalConnector: LeadSourceConnector = {
  name: "Job Posting Signals",
  sourceKey: "job_board",

  async validate(): Promise<boolean> {
    // No API key required — just check connectivity
    try {
      await http.get<RemotiveResponse>("https://remotive.com/api/remote-jobs?limit=1");
      log.success("[JobSignals] Public API connectivity verified");
      return true;
    } catch (err) {
      log.error(`[JobSignals] Connectivity check failed: ${(err as Error).message}`);
      return false;
    }
  },

  async discover(params: DiscoveryParams): Promise<RawLead[]> {
    const queries = JOB_QUERIES[params.segment];
    const leads: RawLead[] = [];
    const seenCompanies = new Set<string>();

    // Source 1: Remotive API (free, no auth, reliable)
    for (const query of queries) {
      if (leads.length >= params.maxLeads) break;

      try {
        const searchTerm = encodeURIComponent(query);
        log.info(`[JobSignals] Searching Remotive for "${query}"...`);

        const res = await http.get<RemotiveResponse>(
          `https://remotive.com/api/remote-jobs?search=${searchTerm}&limit=25`
        );

        for (const job of res.jobs || []) {
          if (leads.length >= params.maxLeads) break;
          if (!job.company_name) continue;

          // Deduplicate by company name within this search
          const key = job.company_name.toLowerCase();
          if (seenCompanies.has(key)) continue;
          seenCompanies.add(key);

          // Check if the job title actually matches our intent signals
          const titleLower = (job.title || "").toLowerCase();
          const isRelevant = isOpsRelatedTitle(titleLower);
          if (!isRelevant) continue;

          leads.push({
            companyName: job.company_name,
            website: extractDomainFromLogoUrl(job.company_logo_url),
            segment: params.segment,
            source: "job_board",
            contactRole: job.title || undefined,
            notes: `Hiring for: ${job.title}. ${job.candidate_required_location ? `Location: ${job.candidate_required_location}.` : ""} Category: ${job.category || "unknown"}.`,
            intentSignal: "hiring",
            tags: [...(job.tags || []).slice(0, 5), "hiring-signal"],
          });
        }
      } catch (err) {
        log.warn(`[JobSignals] Search failed for "${query}": ${(err as Error).message}`);
      }
    }

    log.info(`[JobSignals] Discovered ${leads.length} leads from job postings`);
    return leads;
  },
};

function isOpsRelatedTitle(title: string): boolean {
  const signals = [
    "operations", "ops", "fulfillment", "logistics", "supply chain",
    "customer support", "customer experience", "cx", "ecommerce",
    "automation", "process", "digital transformation", "growth",
    "head of", "director of", "manager", "coordinator", "lead",
  ];
  return signals.some((s) => title.includes(s));
}

function extractDomainFromLogoUrl(url?: string): string | undefined {
  // Remotive logo URLs sometimes contain the company domain
  // This is a best-effort extraction
  if (!url) return undefined;
  try {
    const u = new URL(url);
    // If it's a CDN URL, we can't extract the domain
    if (u.hostname.includes("remotive") || u.hostname.includes("cdn")) return undefined;
    return u.hostname;
  } catch {
    return undefined;
  }
}
