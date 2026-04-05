/**
 * BuiltWith + Hunter.io Chained Connector
 *
 * 1. BuiltWith API: Detects Shopify stores by tech stack lookup.
 *    Given a list of seed domains, identifies which ones run Shopify.
 *    Can also search by technology (Shopify) to find new domains.
 *
 * 2. Hunter.io API: Finds verified contact emails for discovered domains.
 *    Used after BuiltWith identifies Shopify/ecommerce stores.
 *
 * BuiltWith API: api.builtwith.com/v21/api.json
 * Rate limit: ~15 req/min on standard plans (we use 12)
 *
 * Hunter.io API: api.hunter.io/v2/domain-search
 * Rate limit: 15 req/min free, 30 req/min paid (we use 12)
 *
 * Requires: BUILTWITH_API_KEY, HUNTER_API_KEY env vars
 */

import type { LeadSourceConnector, DiscoveryParams, RawLead } from "./discovery-types.js";
import { ConnectorHttpClient } from "./http-client.js";
import { log } from "../lib/logger.js";

const builtWithHttp = new ConnectorHttpClient("builtwith", 12);
const hunterHttp = new ConnectorHttpClient("hunter", 12);

const BUILTWITH_BASE = "https://api.builtwith.com";
const HUNTER_BASE = "https://api.hunter.io/v2";

// Tech names that indicate ecommerce platforms
const SHOPIFY_TECHS = ["Shopify", "Shopify Plus", "Shopify Pay"];
const ECOMMERCE_TECHS = [...SHOPIFY_TECHS, "WooCommerce", "BigCommerce", "Magento", "Squarespace Commerce"];

// Decision-maker titles to prefer from Hunter results
const PREFERRED_TITLES = /founder|ceo|coo|owner|director|head|manager|vp|chief/i;

interface BuiltWithResult {
  Results?: Array<{
    Result?: {
      Paths?: Array<{
        Technologies?: Array<{
          Name?: string;
          Tag?: string;
        }>;
      }>;
    };
    Meta?: {
      CompanyName?: string;
      Vertical?: string;
      City?: string;
    };
    Lookup?: string;
  }>;
  Errors?: Array<{ Message?: string }>;
}

interface HunterSearchResponse {
  data?: {
    domain?: string;
    organization?: string;
    emails?: Array<{
      value?: string;
      first_name?: string;
      last_name?: string;
      position?: string;
      department?: string;
      linkedin?: string;
      twitter?: string;
      confidence?: number;
    }>;
    pattern?: string;
  };
  errors?: Array<{ details?: string }>;
}

function getBuiltWithKey(): string | undefined {
  return process.env.BUILTWITH_API_KEY?.trim() || undefined;
}

function getHunterKey(): string | undefined {
  return process.env.HUNTER_API_KEY?.trim() || undefined;
}

export const builtWithConnector: LeadSourceConnector = {
  name: "BuiltWith + Hunter",
  sourceKey: "builtwith",

  async validate(): Promise<boolean> {
    const bwKey = getBuiltWithKey();
    const hunterKey = getHunterKey();

    if (!bwKey) {
      log.warn("[BuiltWith] BUILTWITH_API_KEY not set");
      return false;
    }
    if (!hunterKey) {
      log.warn("[Hunter] HUNTER_API_KEY not set — will discover domains but cannot find contacts");
      // Still partially valid — can discover tech stacks without Hunter
    }

    try {
      // Validate BuiltWith with a known domain
      await builtWithHttp.get<BuiltWithResult>(
        `${BUILTWITH_BASE}/v21/api.json?KEY=${bwKey}&LOOKUP=shopify.com&NOMETA=yes&NOLIVE=yes&NOATTR=yes`
      );
      log.success("[BuiltWith] API key validated");
      return true;
    } catch (err) {
      log.error(`[BuiltWith] Validation failed: ${(err as Error).message}`);
      return false;
    }
  },

  async discover(params: DiscoveryParams): Promise<RawLead[]> {
    const bwKey = getBuiltWithKey();
    if (!bwKey) throw new Error("[BuiltWith] BUILTWITH_API_KEY not set");
    const hunterKey = getHunterKey();

    // For this connector, we expect seed domains in params.filters.domains
    // If none provided, this connector cannot discover on its own (BuiltWith is a lookup API, not a search API)
    const seedDomains = (params.filters?.domains as string[]) || [];
    if (seedDomains.length === 0) {
      log.warn("[BuiltWith] No seed domains provided in filters.domains — skipping");
      log.info("[BuiltWith] Provide domains via: --filters '{\"domains\":[\"example.com\"]}'");
      return [];
    }

    const leads: RawLead[] = [];
    const domainsToCheck = seedDomains.slice(0, params.maxLeads);

    for (const domain of domainsToCheck) {
      try {
        // Step 1: Check tech stack with BuiltWith
        log.info(`[BuiltWith] Checking tech stack for ${domain}...`);
        const bwResult = await builtWithHttp.get<BuiltWithResult>(
          `${BUILTWITH_BASE}/v21/api.json?KEY=${bwKey}&LOOKUP=${encodeURIComponent(domain)}&NOMETA=no&NOLIVE=yes&NOATTR=yes`
        );

        if (bwResult.Errors && bwResult.Errors.length > 0) {
          log.warn(`[BuiltWith] Error for ${domain}: ${bwResult.Errors[0].Message}`);
          continue;
        }

        const result = bwResult.Results?.[0];
        if (!result) continue;

        // Extract technologies
        const techs: string[] = [];
        for (const path of result.Result?.Paths || []) {
          for (const tech of path.Technologies || []) {
            if (tech.Name) techs.push(tech.Name);
          }
        }

        // Check if it matches our target platforms
        const targetTechs = params.segment === "shopify" ? SHOPIFY_TECHS : ECOMMERCE_TECHS;
        const matchedPlatform = techs.find((t) => targetTechs.some((tt) => t.includes(tt)));
        if (!matchedPlatform && params.segment !== "enterprise") {
          log.debug(`[BuiltWith] ${domain}: no matching ecommerce platform found`);
          continue;
        }

        const companyName = result.Meta?.CompanyName || domain.split(".")[0];
        const vertical = result.Meta?.Vertical || undefined;

        // Step 2: Find contacts with Hunter (if key available)
        let contactName: string | undefined;
        let contactRole: string | undefined;
        let contactEmail: string | undefined;
        let linkedinUrl: string | undefined;

        if (hunterKey) {
          try {
            log.info(`[Hunter] Finding contacts for ${domain}...`);
            const hunterResult = await hunterHttp.get<HunterSearchResponse>(
              `${HUNTER_BASE}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=10`
            );

            const emails = hunterResult.data?.emails || [];

            // Prefer decision-makers with high confidence
            const bestContact = emails
              .filter((e) => (e.confidence || 0) >= 50)
              .sort((a, b) => {
                const aIsDM = PREFERRED_TITLES.test(a.position || "");
                const bIsDM = PREFERRED_TITLES.test(b.position || "");
                if (aIsDM && !bIsDM) return -1;
                if (!aIsDM && bIsDM) return 1;
                return (b.confidence || 0) - (a.confidence || 0);
              })[0];

            if (bestContact) {
              contactName = [bestContact.first_name, bestContact.last_name].filter(Boolean).join(" ") || undefined;
              contactRole = bestContact.position || undefined;
              contactEmail = bestContact.value || undefined;
              linkedinUrl = bestContact.linkedin || undefined;
            }
          } catch (err) {
            log.warn(`[Hunter] Failed for ${domain}: ${(err as Error).message}`);
          }
        }

        leads.push({
          companyName,
          website: domain,
          platform: matchedPlatform || undefined,
          industry: vertical,
          segment: params.segment,
          source: "builtwith",
          contactName,
          contactRole,
          contactEmail,
          linkedinUrl,
          notes: `Tech stack includes: ${techs.slice(0, 10).join(", ")}`,
          tags: ["builtwith-verified"],
        });
      } catch (err) {
        log.error(`[BuiltWith] Error processing ${domain}: ${(err as Error).message}`);
      }
    }

    log.info(`[BuiltWith+Hunter] Discovered ${leads.length} leads from ${domainsToCheck.length} domains`);
    return leads;
  },
};
