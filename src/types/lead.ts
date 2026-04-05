import { z } from "zod";

// ── Enums ──────────────────────────────────────────────────────────

export const LeadSegment = z.enum(["shopify", "ecommerce", "enterprise"]);
export type LeadSegment = z.infer<typeof LeadSegment>;

export const LeadStatus = z.enum([
  "new",
  "enriching",
  "enriched",
  "scored",
  "drafting",
  "drafted",
  "review_pending",
  "approved",
  "edited",
  "rejected",
  "snoozed",
  "not_a_fit",
  "sent",
  "replied",
  "follow_up_due",
  "closed",
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const OutreachChannel = z.enum(["linkedin", "x", "email"]);
export type OutreachChannel = z.infer<typeof OutreachChannel>;

export const MessageType = z.enum([
  "linkedin_connection_note",
  "linkedin_first_message",
  "x_engagement_idea",
  "x_dm",
  "email_first_touch",
  "email_follow_up_1",
  "email_follow_up_2",
]);
export type MessageType = z.infer<typeof MessageType>;

export const LeadSource = z.enum([
  "csv_import",
  "json_import",
  "manual",
  "shopify_app_store",
  "linkedin_search",
  "job_board",
  "directory",
  "referral",
  "community",
  "web_search",
  "crm_import",
  "n8n_webhook",
  "apollo",
  "builtwith",
  "hunter",
]);
export type LeadSource = z.infer<typeof LeadSource>;

// ── Core Lead Schema ───────────────────────────────────────────────

export const CompanyProfile = z.object({
  name: z.string(),
  website: z.string().optional(),
  platform: z.string().optional(), // e.g., "Shopify", "WooCommerce", "BigCommerce"
  platformIndicators: z.array(z.string()).default([]),
  industry: z.string().optional(),
  niche: z.string().optional(),
  sizeEstimate: z.string().optional(), // e.g., "1-10", "11-50", "51-200"
  revenueEstimate: z.string().optional(),
  description: z.string().optional(),
  products: z.array(z.string()).default([]),
  foundedYear: z.number().optional(),
  headquarters: z.string().optional(),
  techStack: z.array(z.string()).default([]),
});
export type CompanyProfile = z.infer<typeof CompanyProfile>;

export const ContactInfo = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  role: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  linkedinUrl: z.string().optional(),
  xUrl: z.string().optional(),
  phone: z.string().optional(),
});
export type ContactInfo = z.infer<typeof ContactInfo>;

export const PublicSignals = z.object({
  hiringSignals: z.array(z.string()).default([]),
  recentAnnouncements: z.array(z.string()).default([]),
  customerExperienceClues: z.array(z.string()).default([]),
  operationalComplexityClues: z.array(z.string()).default([]),
  multiChannelPresence: z.array(z.string()).default([]),
  teamStructureClues: z.array(z.string()).default([]),
  storefrontMaturity: z.string().optional(),
  growthIndicators: z.array(z.string()).default([]),
  painPointClues: z.array(z.string()).default([]),
  fragmentedTooling: z.array(z.string()).default([]),
  rawNotes: z.string().optional(),
});
export type PublicSignals = z.infer<typeof PublicSignals>;

export const ScoreBreakdown = z.object({
  fitScore: z.number().min(0).max(100),
  fitFactors: z.array(z.string()).default([]),
  opportunityScore: z.number().min(0).max(100),
  opportunityFactors: z.array(z.string()).default([]),
  urgencyScore: z.number().min(0).max(100),
  urgencyFactors: z.array(z.string()).default([]),
  personalizationDepth: z.number().min(0).max(100),
  personalizationFactors: z.array(z.string()).default([]),
  finalScore: z.number().min(0).max(100),
  tier: z.enum(["A", "B", "C", "D"]),
  explanation: z.string(),
  redFlags: z.array(z.string()).default([]),
  excluded: z.boolean().default(false),
  exclusionReason: z.string().optional(),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdown>;

export const PainPointHypothesis = z.object({
  hypothesis: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  supportingSignals: z.array(z.string()),
  automationAngle: z.string(),
  roiAngle: z.string(),
  relevantUseCases: z.array(z.string()),
});
export type PainPointHypothesis = z.infer<typeof PainPointHypothesis>;

export const OutreachDraft = z.object({
  channel: OutreachChannel,
  messageType: MessageType,
  subject: z.string().optional(),
  body: z.string(),
  personalizationSnippet: z.string(),
  signalUsed: z.string(),
  qualityScore: z.number().min(0).max(100).optional(),
  qualityIssues: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type OutreachDraft = z.infer<typeof OutreachDraft>;

export const Lead = z.object({
  id: z.string(),
  source: LeadSource,
  segment: LeadSegment,
  status: LeadStatus,
  company: CompanyProfile,
  contact: ContactInfo,
  signals: PublicSignals,
  score: ScoreBreakdown.optional(),
  painPoints: z.array(PainPointHypothesis).default([]),
  outreachDrafts: z.array(OutreachDraft).default([]),
  personalizationNotes: z.string().optional(),
  nextAction: z.string().optional(),
  reviewNotes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  enrichedAt: z.string().optional(),
  scoredAt: z.string().optional(),
  draftedAt: z.string().optional(),
  reviewedAt: z.string().optional(),
  sentAt: z.string().optional(),
});
export type Lead = z.infer<typeof Lead>;

// ── CSV Import Schema (flexible) ───────────────────────────────────

export const CsvLeadRow = z.object({
  company_name: z.string(),
  website: z.string().optional(),
  platform: z.string().optional(),
  industry: z.string().optional(),
  niche: z.string().optional(),
  size_estimate: z.string().optional(),
  contact_name: z.string().optional(),
  contact_role: z.string().optional(),
  contact_email: z.string().optional(),
  linkedin_url: z.string().optional(),
  x_url: z.string().optional(),
  segment: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  // Enrichment hint columns (optional, pre-populate personalization)
  apollo_id: z.string().optional(),
  x_handle: z.string().optional(),
  manual_notes: z.string().optional(),
}).passthrough();
export type CsvLeadRow = z.infer<typeof CsvLeadRow>;

// ── Pipeline Config ────────────────────────────────────────────────

export const PipelineConfig = z.object({
  llmRateLimit: z.number().default(20),
  enrichmentEnabled: z.boolean().default(true),
  scoringEnabled: z.boolean().default(true),
  draftingEnabled: z.boolean().default(true),
  channels: z.array(OutreachChannel).default(["linkedin", "x", "email"]),
  minScoreForDrafting: z.number().default(30),
  excludeTierD: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});
export type PipelineConfig = z.infer<typeof PipelineConfig>;
