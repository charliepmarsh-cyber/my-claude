/**
 * Apollo.io Connector
 *
 * Uses Apollo.io REST API to discover people and organizations matching
 * ICP criteria. Searches by title keywords, industry, and company size.
 *
 * API: /v1/mixed_people/search (POST)
 * Rate limit: 60 req/min (we use 50 to stay safe)
 * Returns: contact name, title, company, domain, LinkedIn URL, email
 *
 * Requires: APOLLO_API_KEY env var
 */

import type { LeadSourceConnector, DiscoveryParams, RawLead } from "./discovery-types.js";
import { ConnectorHttpClient } from "./http-client.js";
import { log } from "../lib/logger.js";
import type { LeadSegment } from "../types/index.js";

const APOLLO_BASE = "https://api.apollo.io";
const http = new ConnectorHttpClient("apollo", 50); // 50 req/min

// Title keywords by segment
const TITLE_KEYWORDS: Record<LeadSegment, string[]> = {
  shopify: ["founder", "ceo", "ecommerce manager", "head of ecommerce", "director of ecommerce", "shopify"],
  ecommerce: ["head of operations", "operations manager", "ecommerce director", "vp operations", "coo", "head of growth"],
  enterprise: ["cto", "vp engineering", "head of automation", "chief operating officer", "vp operations", "director of digital transformation"],
};

// Industry tags by segment
const INDUSTRY_TAGS: Record<LeadSegment, string[]> = {
  shopify: ["retail", "e-commerce & internet businesses", "consumer goods"],
  ecommerce: ["retail", "e-commerce & internet businesses", "consumer goods", "food & beverage"],
  enterprise: ["logistics", "supply chain", "manufacturing", "financial services", "healthcare"],
};

// Employee count ranges
const SIZE_RANGES: Record<LeadSegment, [number, number]> = {
  shopify: [1, 50],
  ecommerce: [10, 500],
  enterprise: [200, 10000],
};

interface ApolloSearchResponse {
  people?: ApolloPersonResult[];
  pagination?: { total_entries?: number; total_pages?: number };
}

interface ApolloPersonResult {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
  twitter_url?: string;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
    keywords?: string[];
    short_description?: string;
  };
}

function getApiKey(): string | undefined {
  return process.env.APOLLO_API_KEY?.trim() || undefined;
}

export const apolloConnector: LeadSourceConnector = {
  name: "Apollo.io",
  sourceKey: "apollo",

  async validate(): Promise<boolean> {
    const key = getApiKey();
    if (!key) {
      log.warn("[Apollo] APOLLO_API_KEY not set");
      return false;
    }
    try {
      // Lightweight validation: search with limit 1
      await http.post<ApolloSearchResponse>(
        `${APOLLO_BASE}/v1/mixed_people/search`,
        { api_key: key, page: 1, per_page: 1, person_titles: ["ceo"] },
      );
      log.success("[Apollo] API key validated");
      return true;
    } catch (err) {
      log.error(`[Apollo] Validation failed: ${(err as Error).message}`);
      return false;
    }
  },

  async discover(params: DiscoveryParams): Promise<RawLead[]> {
    const key = getApiKey();
    if (!key) throw new Error("[Apollo] APOLLO_API_KEY not set");

    const titles = TITLE_KEYWORDS[params.segment];
    const industries = INDUSTRY_TAGS[params.segment];
    const [minSize, maxSize] = SIZE_RANGES[params.segment];
    const perPage = Math.min(params.maxLeads, 100); // Apollo max per page
    const pages = Math.ceil(params.maxLeads / perPage);

    const leads: RawLead[] = [];

    for (let page = 1; page <= pages && leads.length < params.maxLeads; page++) {
      log.info(`[Apollo] Searching page ${page} for ${params.segment} leads...`);

      const body: Record<string, unknown> = {
        api_key: key,
        page,
        per_page: perPage,
        person_titles: titles,
        organization_num_employees_ranges: [`${minSize},${maxSize}`],
        ...(params.filters || {}),
      };

      // Apollo accepts industry as q_organization_keyword_tags
      if (industries.length > 0) {
        body.q_organization_keyword_tags = industries;
      }

      try {
        const res = await http.post<ApolloSearchResponse>(
          `${APOLLO_BASE}/v1/mixed_people/search`,
          body,
        );

        const people = res.people || [];
        log.info(`[Apollo] Page ${page}: ${people.length} results`);

        for (const person of people) {
          if (leads.length >= params.maxLeads) break;
          const mapped = mapApolloResult(person, params.segment);
          if (mapped) leads.push(mapped);
        }

        // No more results
        if (people.length < perPage) break;
      } catch (err) {
        log.error(`[Apollo] Search error on page ${page}: ${(err as Error).message}`);
        break; // stop paging on error
      }
    }

    log.info(`[Apollo] Discovered ${leads.length} leads`);
    return leads;
  },
};

function mapApolloResult(person: ApolloPersonResult, segment: LeadSegment): RawLead | null {
  const org = person.organization;
  if (!org?.name) return null; // skip if no org

  const sizeEstimate = org.estimated_num_employees
    ? estimateSize(org.estimated_num_employees)
    : undefined;

  return {
    companyName: org.name,
    website: org.website_url || undefined,
    industry: org.industry || undefined,
    sizeEstimate,
    contactName: person.name || [person.first_name, person.last_name].filter(Boolean).join(" ") || undefined,
    contactRole: person.title || undefined,
    contactEmail: person.email || undefined,
    linkedinUrl: person.linkedin_url || undefined,
    xUrl: person.twitter_url || undefined,
    segment,
    source: "apollo",
    notes: org.short_description || undefined,
    apolloId: person.id,
    tags: org.keywords?.slice(0, 5) || [],
  };
}

function estimateSize(count: number): string {
  if (count <= 10) return "1-10";
  if (count <= 50) return "11-50";
  if (count <= 200) return "51-200";
  if (count <= 500) return "201-500";
  if (count <= 1000) return "501-1000";
  return "1000+";
}
