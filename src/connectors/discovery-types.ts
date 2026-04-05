import type { Lead, LeadSegment, LeadSource as LeadSourceType } from "../types/index.js";

/**
 * Shared interface for all lead discovery connectors.
 */
export interface LeadSourceConnector {
  /** Human-readable connector name */
  name: string;
  /** Machine key matching the LeadSource enum */
  sourceKey: LeadSourceType;
  /** Discover leads matching the given parameters */
  discover(params: DiscoveryParams): Promise<RawLead[]>;
  /** Check API key presence + basic connectivity. Returns true if ready. */
  validate(): Promise<boolean>;
}

export interface DiscoveryParams {
  segment: LeadSegment;
  maxLeads: number;
  filters?: Record<string, unknown>;
}

/**
 * Intermediate lead shape returned by connectors before
 * being mapped to the full Lead type.
 */
export interface RawLead {
  companyName: string;
  website?: string;
  platform?: string;
  industry?: string;
  niche?: string;
  sizeEstimate?: string;
  contactName?: string;
  contactRole?: string;
  contactEmail?: string;
  linkedinUrl?: string;
  xUrl?: string;
  segment: LeadSegment;
  source: LeadSourceType;
  notes?: string;
  intentSignal?: string;
  personalizationHints?: string;
  apolloId?: string;
  tags?: string[];
}

export interface DiscoveryStats {
  source: string;
  found: number;
  deduped: number;
  alreadyExists: number;
  passedToPipeline: number;
  errors: string[];
}
