import { z } from "zod";
import { LeadSegment, LeadStatus } from "../types/index.js";

// ── Request schemas ─────────────────────────────────────────────

export const DiscoverRequest = z.object({
  segment: LeadSegment,
  maxLeads: z.number().int().min(1).max(200).default(25),
  sources: z.array(z.string()).optional(),
  filters: z.record(z.unknown()).optional(),
  runPipeline: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});
export type DiscoverRequest = z.infer<typeof DiscoverRequest>;

export const IngestLead = z.object({
  companyName: z.string(),
  website: z.string().optional(),
  platform: z.string().optional(),
  industry: z.string().optional(),
  niche: z.string().optional(),
  sizeEstimate: z.string().optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  contactEmail: z.string().optional(),
  linkedinUrl: z.string().optional(),
  xUrl: z.string().optional(),
  segment: LeadSegment.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const IngestRequest = z.object({
  leads: z.array(IngestLead).min(1).max(500),
  segment: LeadSegment.optional(),
  runPipeline: z.boolean().default(false),
});
export type IngestRequest = z.infer<typeof IngestRequest>;

export const RedraftRequest = z.object({
  statuses: z.array(LeadStatus).optional(),
  dryRun: z.boolean().default(false),
});
export type RedraftRequest = z.infer<typeof RedraftRequest>;

export const LeadsQuery = z.object({
  status: LeadStatus.optional(),
  segment: LeadSegment.optional(),
  minScore: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
export type LeadsQuery = z.infer<typeof LeadsQuery>;

// ── Response envelope ───────────────────────────────────────────

export interface WebhookResponse {
  ok: boolean;
  message?: string;
  data?: unknown;
  jobId?: string;
}
