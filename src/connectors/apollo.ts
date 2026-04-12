/**
 * Apollo.io Connector
 *
 * Two-step flow:
 *   1. Search: /v1/mixed_people/api_search — finds people matching ICP
 *      (returns obfuscated data: first name, title, org, but no email/linkedin)
 *   2. Reveal: /v1/people/match — enriches each person with email + LinkedIn
 *      (costs 1 email credit per reveal on Basic plan)
 *
 * Rate limit: 50 req/min (Apollo allows ~100, we stay conservative)
 * Credits: each reveal costs 1 credit. Basic plan = 10,000/mo.
 *
 * Requires: APOLLO_API_KEY env var
 */

import type { LeadSourceConnector, DiscoveryParams, RawLead } from "./discovery-types.js";
import { ConnectorHttpClient } from "./http-client.js";
import { log } from "../lib/logger.js";
import type { LeadSegment } from "../types/index.js";

const APOLLO_BASE = "https://api.apollo.io";
const http = new ConnectorHttpClient("apollo", 50);

// Title keywords by segment
const TITLE_KEYWORDS: Record<LeadSegment, string[]> = {
  shopify: ["founder", "ceo", "ecommerce manager", "head of ecommerce", "director of ecommerce"],
  ecommerce: ["head of operations", "operations manager", "ecommerce director", "vp operations", "coo", "head of growth"],
  enterprise: ["cto", "vp engineering", "head of automation", "chief operating officer", "vp operations", "director of digital transformation"],
};

// Multiple keyword sets per segment — we rotate through them to get varied results
const SEARCH_KEYWORD_POOL: Record<LeadSegment, string[]> = {
  shopify: ["DTC brand", "ecommerce founder", "shopify brand", "online brand founder", "direct to consumer"],
  ecommerce: ["ecommerce brand", "ecommerce director", "online retail", "ecommerce manager", "DTC ecommerce"],
  enterprise: ["operations automation", "digital transformation", "enterprise operations", "process automation"],
};

// Negative title filters to exclude agencies/consultants
const EXCLUDE_TITLES = ["developer", "designer", "consultant", "freelance", "agency", "recruiter"];

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

// ── Apollo response types ───────────────────────────────────────

interface ApolloSearchResponse {
  people?: ApolloPersonResult[];
  pagination?: { total_entries?: number; total_pages?: number };
}

interface ApolloPersonResult {
  id?: string;
  first_name?: string;
  last_name?: string;
  last_name_obfuscated?: string;
  name?: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
  twitter_url?: string;
  has_email?: boolean;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    primary_domain?: string;
    industry?: string;
    estimated_num_employees?: number;
    keywords?: string[];
    short_description?: string;
  };
}

interface ApolloMatchResponse {
  person?: ApolloPersonResult;
  status?: string;
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
      await http.post<ApolloSearchResponse>(
        `${APOLLO_BASE}/v1/mixed_people/api_search`,
        { page: 1, per_page: 1, person_titles: ["ceo"] },
        { "X-Api-Key": key },
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
    const perPage = Math.min(params.maxLeads, 100);
    const pages = Math.ceil(params.maxLeads / perPage);

    // Step 1: Search across multiple keyword sets for variety
    const keywordPool = [...SEARCH_KEYWORD_POOL[params.segment]];
    // Shuffle the keyword pool so each run uses a different order
    for (let i = keywordPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keywordPool[i], keywordPool[j]] = [keywordPool[j], keywordPool[i]];
    }

    const candidates: ApolloPersonResult[] = [];
    const seenOrgNames = new Set<string>();

    for (const keyword of keywordPool) {
      if (candidates.length >= params.maxLeads) break;

      for (let page = 1; page <= 3 && candidates.length < params.maxLeads; page++) {
        log.info(`[Apollo] Searching "${keyword}" page ${page}...`);

        const body: Record<string, unknown> = {
          page,
          per_page: Math.min(perPage, params.maxLeads - candidates.length),
          person_titles: titles,
          person_not_titles: EXCLUDE_TITLES,
          q_keywords: keyword,
          organization_num_employees_ranges: [`${minSize},${maxSize}`],
          ...(params.filters || {}),
        };

        try {
          const res = await http.post<ApolloSearchResponse>(
            `${APOLLO_BASE}/v1/mixed_people/api_search`,
            body,
            { "X-Api-Key": key },
          );

          const people = res.people || [];
          log.info(`[Apollo] "${keyword}" page ${page}: ${people.length} results`);

          for (const person of people) {
            if (candidates.length >= params.maxLeads) break;
            const orgName = person.organization?.name?.toLowerCase();
            if (!orgName) continue;
            // Deduplicate across keyword searches
            if (seenOrgNames.has(orgName)) continue;
            seenOrgNames.add(orgName);
            candidates.push(person);
          }

          if (people.length === 0) break; // no more results for this keyword
        } catch (err) {
          log.error(`[Apollo] Search error: ${(err as Error).message}`);
          break;
        }
      }
    }

    log.info(`[Apollo] Found ${candidates.length} unique candidates, revealing contacts...`);

    // Step 2: Reveal each person to get email + LinkedIn (costs 1 credit each)
    const leads: RawLead[] = [];

    for (const candidate of candidates) {
      try {
        const revealed = await revealPerson(key, candidate);
        if (revealed) leads.push(revealed);
      } catch (err) {
        // If reveal fails, still create lead with whatever we have from search
        log.debug(`[Apollo] Reveal failed for ${candidate.first_name}: ${(err as Error).message}`);
        const fallback = mapSearchResult(candidate, params.segment);
        if (fallback) leads.push(fallback);
      }
    }

    log.info(`[Apollo] Discovered ${leads.length} leads (${candidates.length} credits used)`);
    return leads;
  },
};

/**
 * Reveal a person's contact details using Apollo's people/match endpoint.
 * Costs 1 email credit per reveal.
 */
async function revealPerson(apiKey: string, candidate: ApolloPersonResult): Promise<RawLead | null> {
  const org = candidate.organization;
  if (!org?.name) return null;

  // Use people/match with the Apollo ID to reveal full details
  const matchBody: Record<string, unknown> = {
    id: candidate.id,
    reveal_personal_emails: false,
    reveal_phone_number: false,
  };

  const res = await http.post<ApolloMatchResponse>(
    `${APOLLO_BASE}/v1/people/match`,
    matchBody,
    { "X-Api-Key": apiKey },
  );

  const person = res.person;
  if (!person) return mapSearchResult(candidate, "shopify");

  const segment = inferSegmentFromSize(org.estimated_num_employees);

  // Extract website from email domain if Apollo doesn't provide it
  const website = org.website_url || org.primary_domain || domainFromEmail(person.email);

  return {
    companyName: org.name,
    website,
    industry: org.industry || undefined,
    sizeEstimate: org.estimated_num_employees ? estimateSize(org.estimated_num_employees) : undefined,
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

/**
 * Map a search result without reveal (fallback when reveal fails or is skipped).
 */
function mapSearchResult(person: ApolloPersonResult, fallbackSegment: LeadSegment): RawLead | null {
  const org = person.organization;
  if (!org?.name) return null;

  const segment = inferSegmentFromSize(org.estimated_num_employees) || fallbackSegment;

  return {
    companyName: org.name,
    website: org.website_url || org.primary_domain || undefined,
    industry: org.industry || undefined,
    sizeEstimate: org.estimated_num_employees ? estimateSize(org.estimated_num_employees) : undefined,
    contactName: person.first_name || undefined, // only first name from search
    contactRole: person.title || undefined,
    // No email or LinkedIn from search endpoint
    segment,
    source: "apollo",
    notes: org.short_description || undefined,
    apolloId: person.id,
    tags: org.keywords?.slice(0, 5) || [],
  };
}

function inferSegmentFromSize(employees?: number): LeadSegment {
  if (!employees) return "ecommerce";
  if (employees <= 50) return "shopify";
  if (employees <= 200) return "ecommerce";
  return "enterprise";
}

function estimateSize(count: number): string {
  if (count <= 10) return "1-10";
  if (count <= 50) return "11-50";
  if (count <= 200) return "51-200";
  if (count <= 500) return "201-500";
  if (count <= 1000) return "501-1000";
  return "1000+";
}

/** Extract domain from email address to use as website fallback */
function domainFromEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const domain = email.split("@")[1];
  if (!domain) return undefined;
  // Skip generic email providers
  const generic = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "mail.com"];
  if (generic.includes(domain.toLowerCase())) return undefined;
  return domain;
}
