import type { Lead, LeadSegment } from "../types/index.js";
import type {
  LeadSourceConnector,
  DiscoveryParams,
  RawLead,
  DiscoveryStats,
} from "../connectors/discovery-types.js";
import { DISCOVERY_CONNECTORS, rawLeadToLead, extractDomain } from "../connectors/index.js";
import { getAllLeads, logAudit, saveLeads } from "../storage/database.js";
import { runPipeline } from "./main-pipeline.js";
import type { PipelineResult } from "./main-pipeline.js";
import { log } from "../lib/logger.js";

export interface DiscoveryConfig {
  segment: LeadSegment;
  maxLeads: number;
  sources?: string[];         // connector keys to use; undefined = all enabled
  filters?: Record<string, unknown>;
  dryRun: boolean;
  runPipelineAfter: boolean;  // feed discovered leads into enrichment pipeline
}

export interface DiscoveryResult {
  stats: DiscoveryStats[];
  totalFound: number;
  totalDeduped: number;
  totalExisting: number;
  totalNew: number;
  newLeads: Lead[];
  pipelineResult?: PipelineResult;
}

/**
 * Run discovery across enabled connectors, deduplicate against
 * existing storage, and optionally feed into the main pipeline.
 */
export async function runDiscovery(config: DiscoveryConfig): Promise<DiscoveryResult> {
  const enabledSourceKeys = config.sources || getEnabledSources();
  const connectors = resolveConnectors(enabledSourceKeys);

  if (connectors.length === 0) {
    log.warn("No discovery connectors enabled or available");
    return emptyResult();
  }

  log.info(`Discovery: running ${connectors.length} connector(s) for segment "${config.segment}" (max ${config.maxLeads} per source)`);

  // Step 1: Run all connectors in parallel (one failure doesn't block others)
  const params: DiscoveryParams = {
    segment: config.segment,
    maxLeads: config.maxLeads,
    filters: config.filters,
  };

  const settled = await Promise.allSettled(
    connectors.map(async (conn): Promise<{ connector: LeadSourceConnector; rawLeads: RawLead[]; error?: string }> => {
      try {
        const rawLeads = await conn.discover(params);
        return { connector: conn, rawLeads };
      } catch (err) {
        return { connector: conn, rawLeads: [], error: (err as Error).message };
      }
    })
  );

  // Step 2: Collect results and build stats
  const allStats: DiscoveryStats[] = [];
  const allRawLeads: RawLead[] = [];

  for (const result of settled) {
    if (result.status === "rejected") {
      log.error(`Discovery connector failed: ${result.reason}`);
      continue;
    }
    const { connector, rawLeads, error } = result.value;
    const stat: DiscoveryStats = {
      source: connector.name,
      found: rawLeads.length,
      deduped: 0,
      alreadyExists: 0,
      passedToPipeline: 0,
      errors: error ? [error] : [],
    };

    if (error) {
      log.error(`[${connector.name}] Discovery error: ${error}`);
    }

    allStats.push(stat);
    allRawLeads.push(...rawLeads);
  }

  log.info(`Discovery: ${allRawLeads.length} total raw leads from ${connectors.length} connectors`);

  // Step 3: Deduplicate across all sources by domain + email
  const { unique, dupeCount } = deduplicateRawLeads(allRawLeads);
  log.info(`Discovery: ${dupeCount} cross-source duplicates removed`);

  // Step 4: Filter out leads already in storage (by domain, company name, or email)
  const existingIndex = getExistingLeadIndex();
  const newRawLeads: RawLead[] = [];
  let existingCount = 0;

  for (const raw of unique) {
    if (isExistingLead(raw, existingIndex)) {
      existingCount++;
      continue;
    }
    newRawLeads.push(raw);
  }

  log.info(`Discovery: ${existingCount} already in storage, ${newRawLeads.length} new leads`);

  // Step 5: Convert to Lead objects
  const newLeads = newRawLeads.map(rawLeadToLead);

  // Update stats with dedup/existing info (distributed proportionally)
  for (const stat of allStats) {
    stat.deduped = Math.round((dupeCount / Math.max(allRawLeads.length, 1)) * stat.found);
    stat.alreadyExists = Math.round((existingCount / Math.max(unique.length, 1)) * (stat.found - stat.deduped));
    stat.passedToPipeline = Math.max(0, stat.found - stat.deduped - stat.alreadyExists);
  }

  // Step 6: Log discovery audit
  for (const lead of newLeads) {
    try {
      logAudit(lead.id, "discovered", `Source: ${lead.source}, Segment: ${lead.segment}`);
    } catch {
      // Audit is non-critical
    }
  }

  const discoveryResult: DiscoveryResult = {
    stats: allStats,
    totalFound: allRawLeads.length,
    totalDeduped: dupeCount,
    totalExisting: existingCount,
    totalNew: newLeads.length,
    newLeads,
  };

  if (config.dryRun) {
    log.info("Discovery: dry run — no leads saved or sent to pipeline");
    return discoveryResult;
  }

  // Step 7: Save new leads and optionally run the main pipeline
  if (newLeads.length > 0) {
    saveLeads(newLeads);
    log.success(`Discovery: saved ${newLeads.length} new leads to storage`);

    if (config.runPipelineAfter) {
      log.info("Discovery: feeding new leads into enrichment pipeline...");
      const pipelineResult = await runPipeline(newLeads);
      discoveryResult.pipelineResult = pipelineResult;
    }
  }

  return discoveryResult;
}

/**
 * Validate all connectors and report status.
 */
export async function validateAllConnectors(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  for (const [key, connector] of Object.entries(DISCOVERY_CONNECTORS)) {
    log.info(`Validating ${connector.name}...`);
    results[key] = await connector.validate();
  }
  return results;
}

// ── Helpers ─────────────────────────────────────────────────────

function getEnabledSources(): string[] {
  const envSources = process.env.DISCOVERY_ENABLED_SOURCES;
  if (envSources) {
    return envSources.split(",").map((s) => s.trim()).filter(Boolean);
  }
  // Default: all connectors
  return Object.keys(DISCOVERY_CONNECTORS);
}

function resolveConnectors(keys: string[]): LeadSourceConnector[] {
  const connectors: LeadSourceConnector[] = [];
  for (const key of keys) {
    const conn = DISCOVERY_CONNECTORS[key];
    if (conn) {
      connectors.push(conn);
    } else {
      log.warn(`Unknown connector: "${key}" — skipping`);
    }
  }
  return connectors;
}

function deduplicateRawLeads(leads: RawLead[]): { unique: RawLead[]; dupeCount: number } {
  const seen = new Set<string>();
  const unique: RawLead[] = [];
  let dupeCount = 0;

  for (const lead of leads) {
    const key = buildDedupKey(lead);
    if (key && seen.has(key)) {
      dupeCount++;
      continue;
    }
    if (key) seen.add(key);
    unique.push(lead);
  }

  return { unique, dupeCount };
}

function buildDedupKey(lead: RawLead): string {
  const domain = extractDomain(lead.website);
  const email = (lead.contactEmail || "").toLowerCase().trim();
  // Use domain as primary key, email as secondary
  const parts = [domain, email].filter(Boolean);
  return parts.length > 0 ? parts.join("|") : lead.companyName.toLowerCase().trim();
}

interface ExistingLeadIndex {
  domains: Set<string>;
  companyNames: Set<string>;
  emails: Set<string>;
}

function getExistingLeadIndex(): ExistingLeadIndex {
  try {
    const existing = getAllLeads();
    const index: ExistingLeadIndex = {
      domains: new Set(),
      companyNames: new Set(),
      emails: new Set(),
    };
    for (const lead of existing) {
      const domain = extractDomain(lead.company.website);
      if (domain) index.domains.add(domain);
      if (lead.company.name) index.companyNames.add(lead.company.name.toLowerCase().trim());
      if (lead.contact.email) index.emails.add(lead.contact.email.toLowerCase().trim());
    }
    return index;
  } catch {
    return { domains: new Set(), companyNames: new Set(), emails: new Set() };
  }
}

function isExistingLead(raw: RawLead, index: ExistingLeadIndex): boolean {
  const domain = extractDomain(raw.website);
  if (domain && index.domains.has(domain)) return true;
  const name = raw.companyName.toLowerCase().trim();
  if (name && index.companyNames.has(name)) return true;
  const email = (raw.contactEmail || "").toLowerCase().trim();
  if (email && index.emails.has(email)) return true;
  return false;
}

function emptyResult(): DiscoveryResult {
  return {
    stats: [],
    totalFound: 0,
    totalDeduped: 0,
    totalExisting: 0,
    totalNew: 0,
    newLeads: [],
  };
}
