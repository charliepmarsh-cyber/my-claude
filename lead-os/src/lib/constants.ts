/**
 * Domain vocabulary for CPM Lead Intelligence OS.
 * Single source of truth for stage/status/category enums and their display labels.
 */

export const LEAD_STAGES = [
  "imported",
  "needs_research",
  "researched",
  "ready_to_contact",
  "contacted",
  "follow_up_due",
  "replied",
  "nurture",
  "closed_unsuitable",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  imported: "Imported",
  needs_research: "Needs research",
  researched: "Researched",
  ready_to_contact: "Ready to contact",
  contacted: "Contacted",
  follow_up_due: "Follow-up due",
  replied: "Replied",
  nurture: "Nurture",
  closed_unsuitable: "Closed / unsuitable",
};

export const CONVERSATION_STAGES = [
  "discovery_started",
  "problem_identified",
  "problem_quantified",
  "solution_considered",
  "meeting_proposed",
  "meeting_booked",
  "awaiting_decision",
] as const;
export type ConversationStage = (typeof CONVERSATION_STAGES)[number];

export const CONVERSATION_STAGE_LABELS: Record<ConversationStage, string> = {
  discovery_started: "Discovery started",
  problem_identified: "Problem identified",
  problem_quantified: "Problem quantified",
  solution_considered: "Solution considered",
  meeting_proposed: "Meeting proposed",
  meeting_booked: "Meeting booked",
  awaiting_decision: "Awaiting decision",
};

export const OPPORTUNITY_STAGES = [
  "qualified",
  "case_study_candidate",
  "free_build_proposed",
  "paid_discovery",
  "proposal_drafted",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "on_hold",
] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  qualified: "Qualified",
  case_study_candidate: "Case-study candidate",
  free_build_proposed: "Free build proposed",
  paid_discovery: "Paid discovery",
  proposal_drafted: "Proposal drafted",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  on_hold: "On hold",
};

export const DELIVERY_STAGES = [
  "scoping",
  "access_pending",
  "building",
  "testing",
  "client_review",
  "live",
  "measuring",
  "case_study_complete",
  "retainer",
] as const;
export type DeliveryStage = (typeof DELIVERY_STAGES)[number];

export const DELIVERY_STAGE_LABELS: Record<DeliveryStage, string> = {
  scoping: "Scoping",
  access_pending: "Access pending",
  building: "Building",
  testing: "Testing",
  client_review: "Client review",
  live: "Live",
  measuring: "Measuring",
  case_study_complete: "Case study complete",
  retainer: "Retainer",
};

export const PRIORITY_LABELS = [
  "p1_contact_now",
  "p2_research_first",
  "p3_nurture",
  "p4_low",
  "peer_collaborator",
  "strategic_relationship",
  "not_suitable",
  "do_not_contact",
] as const;
export type PriorityLabel = (typeof PRIORITY_LABELS)[number];

export const PRIORITY_LABEL_TEXT: Record<PriorityLabel, string> = {
  p1_contact_now: "P1 — Contact now",
  p2_research_first: "P2 — Research first",
  p3_nurture: "P3 — Nurture",
  p4_low: "P4 — Low priority",
  peer_collaborator: "Peer / collaborator",
  strategic_relationship: "Strategic relationship",
  not_suitable: "Not suitable",
  do_not_contact: "Do not contact",
};

export const MESSAGE_TYPES = [
  "initial_warm",
  "initial_cold",
  "insight_seeking",
  "peer_collaboration",
  "local_business",
  "follow_up_1",
  "follow_up_2",
  "final_close",
  "reply_positive",
  "reply_vague",
  "reply_objection",
  "discovery_call_invite",
  "case_study_proposal",
  "paid_transition",
  "referral_request",
  "testimonial_request",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  initial_warm: "Initial warm message",
  initial_cold: "Initial cold message",
  insight_seeking: "Insight-seeking message",
  peer_collaboration: "Peer / collaboration message",
  local_business: "Local-business message",
  follow_up_1: "Follow-up one",
  follow_up_2: "Follow-up two",
  final_close: "Final polite close",
  reply_positive: "Reply to positive response",
  reply_vague: "Reply to vague response",
  reply_objection: "Reply to objection",
  discovery_call_invite: "Discovery-call invitation",
  case_study_proposal: "Free case-study proposal",
  paid_transition: "Paid-project transition",
  referral_request: "Referral request",
  testimonial_request: "Testimonial request",
};

export const REPLY_CLASSIFICATIONS = [
  "positive",
  "curious",
  "neutral",
  "vague",
  "not_now",
  "objection",
  "referral",
  "peer_discussion",
  "qualified_problem",
  "meeting_ready",
  "not_suitable",
] as const;
export type ReplyClassification = (typeof REPLY_CLASSIFICATIONS)[number];

export const REPLY_CLASSIFICATION_LABELS: Record<ReplyClassification, string> = {
  positive: "Positive",
  curious: "Curious",
  neutral: "Neutral",
  vague: "Vague",
  not_now: "Not now",
  objection: "Objection",
  referral: "Referral",
  peer_discussion: "Peer discussion",
  qualified_problem: "Qualified problem",
  meeting_ready: "Meeting-ready",
  not_suitable: "Not suitable",
};

export const ICP_CATEGORIES = [
  "ecommerce_founder",
  "shopify_expert",
  "shopify_agency",
  "dtc_growth",
  "head_of_ecommerce",
  "performance_marketer",
  "meta_ads_specialist",
  "cro_specialist",
  "email_marketer",
  "creator_marketer",
  "ecommerce_bookkeeper",
  "operations_director",
  "website_agency",
  "ai_automation_specialist",
  "recruitment_founder",
  "fulfilment_founder",
  "local_trade",
  "restaurant_owner",
  "cleaning_business",
  "general_owner",
  "other",
] as const;
export type IcpCategory = (typeof ICP_CATEGORIES)[number];

export const ICP_CATEGORY_LABELS: Record<IcpCategory, string> = {
  ecommerce_founder: "Ecommerce founder",
  shopify_expert: "Shopify expert",
  shopify_agency: "Shopify agency",
  dtc_growth: "DTC growth operator",
  head_of_ecommerce: "Head of ecommerce",
  performance_marketer: "Performance marketer",
  meta_ads_specialist: "Meta Ads specialist",
  cro_specialist: "CRO specialist",
  email_marketer: "Email marketer",
  creator_marketer: "Creator / influencer marketer",
  ecommerce_bookkeeper: "Ecommerce bookkeeper",
  operations_director: "Operations director",
  website_agency: "Website agency",
  ai_automation_specialist: "AI automation specialist",
  recruitment_founder: "Recruitment founder",
  fulfilment_founder: "Fulfilment founder",
  local_trade: "Local trade",
  restaurant_owner: "Restaurant owner",
  cleaning_business: "Cleaning business",
  general_owner: "Company owner (general)",
  other: "Other",
};

/** Categories treated as prospects vs peers by default. */
export const PEER_CATEGORIES: IcpCategory[] = ["ai_automation_specialist"];

export const SCORE_DIMENSIONS = [
  "icp_fit",
  "pain_probability",
  "urgency",
  "authority",
  "accessibility",
  "automation_feasibility",
  "case_study_potential",
  "paid_opportunity",
  "strategic_relationship",
  "data_confidence",
] as const;
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export const SCORE_DIMENSION_LABELS: Record<ScoreDimension, string> = {
  icp_fit: "ICP fit",
  pain_probability: "Pain probability",
  urgency: "Urgency / trigger",
  authority: "Authority",
  accessibility: "Accessibility / warmth",
  automation_feasibility: "Automation feasibility",
  case_study_potential: "Case-study potential",
  paid_opportunity: "Paid opportunity",
  strategic_relationship: "Strategic relationship",
  data_confidence: "Data confidence",
};

export const SIGNAL_TYPES = [
  "hiring",
  "product_launch",
  "expansion",
  "funding",
  "rapid_growth",
  "new_platform",
  "active_ads",
  "large_catalogue",
  "multi_marketplace",
  "agency_expansion",
  "new_leadership",
  "public_complaint",
  "manual_process_mention",
  "tech_change",
  "other",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  hiring: "Hiring",
  product_launch: "Product launch",
  expansion: "Expansion",
  funding: "New funding",
  rapid_growth: "Rapid growth",
  new_platform: "New ecommerce platform",
  active_ads: "Active paid advertising",
  large_catalogue: "Large product catalogue",
  multi_marketplace: "Multiple marketplaces",
  agency_expansion: "Agency expansion",
  new_leadership: "New leadership",
  public_complaint: "Public complaint about systems",
  manual_process_mention: "Manual process mentioned publicly",
  tech_change: "Recent technology change",
  other: "Other",
};

export const PAIN_CATEGORIES = [
  "product_data",
  "campaign_reporting",
  "lead_qualification",
  "crm_hygiene",
  "client_onboarding",
  "content_collection",
  "asset_management",
  "creative_analysis",
  "email_segmentation",
  "lifecycle_reporting",
  "marketplace_sync",
  "inventory",
  "finance_reconciliation",
  "document_chasing",
  "project_handovers",
  "recruitment_admin",
  "quote_scheduling",
  "other",
] as const;
export type PainCategory = (typeof PAIN_CATEGORIES)[number];

export const PAIN_CATEGORY_LABELS: Record<PainCategory, string> = {
  product_data: "Product-data inconsistency",
  campaign_reporting: "Campaign reporting",
  lead_qualification: "Lead qualification",
  crm_hygiene: "CRM hygiene",
  client_onboarding: "Client onboarding",
  content_collection: "Content collection",
  asset_management: "Asset management",
  creative_analysis: "Creative analysis",
  email_segmentation: "Email segmentation",
  lifecycle_reporting: "Customer lifecycle reporting",
  marketplace_sync: "Marketplace synchronisation",
  inventory: "Inventory updates",
  finance_reconciliation: "Finance reconciliation",
  document_chasing: "Document chasing",
  project_handovers: "Project handovers",
  recruitment_admin: "Recruitment admin",
  quote_scheduling: "Quote & scheduling workflows",
  other: "Other",
};

export const OPPORTUNITY_CATEGORIES = [
  "campaign_reporting",
  "lead_qualification_routing",
  "crm_enrichment",
  "product_data_workflows",
  "shopify_operations",
  "multi_marketplace",
  "cro_analysis",
  "creative_performance",
  "email_segmentation_planning",
  "client_onboarding",
  "content_collection",
  "project_updates",
  "finance_document_chasing",
  "recruiting_workflow",
  "fulfilment_reporting",
  "local_service_enquiries",
  "quote_scheduling",
  "other",
] as const;
export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number];

export const OPPORTUNITY_CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  campaign_reporting: "Campaign reporting & commentary",
  lead_qualification_routing: "Lead qualification & routing",
  crm_enrichment: "CRM enrichment & hygiene",
  product_data_workflows: "Ecommerce product-data workflows",
  shopify_operations: "Shopify operations",
  multi_marketplace: "Multi-marketplace coordination",
  cro_analysis: "CRO analysis",
  creative_performance: "Creative-performance analysis",
  email_segmentation_planning: "Email segmentation & planning",
  client_onboarding: "Client onboarding",
  content_collection: "Content collection",
  project_updates: "Project updates",
  finance_document_chasing: "Finance document chasing",
  recruiting_workflow: "Recruiting workflow",
  fulfilment_reporting: "Fulfilment reporting",
  local_service_enquiries: "Local service enquiries",
  quote_scheduling: "Quote & scheduling workflows",
  other: "Other",
};

export const TASK_KINDS = ["follow_up", "research", "reply", "review", "prepare_discovery", "custom"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  follow_up: "Follow-up",
  research: "Research",
  reply: "Reply",
  review: "Review",
  prepare_discovery: "Prepare discovery",
  custom: "Task",
};

export const ENTRY_TYPES = ["message_sent", "reply_received", "note", "call", "meeting", "file"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const CHANNELS = ["linkedin", "email", "phone", "in_person", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin: "LinkedIn",
  email: "Email",
  phone: "Phone",
  in_person: "In person",
  other: "Other",
};

export const WARMTH = ["warm", "cold"] as const;
export type Warmth = (typeof WARMTH)[number];

export const SENIORITIES = ["founder", "c_level", "director", "head", "manager", "senior_ic", "ic", "unknown"] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const SENIORITY_LABELS: Record<Seniority, string> = {
  founder: "Founder",
  c_level: "C-level",
  director: "Director",
  head: "Head of",
  manager: "Manager",
  senior_ic: "Senior IC",
  ic: "IC",
  unknown: "Unknown",
};

export const DATA_SOURCES = ["demo", "import", "manual", "enrichment"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const NODE_KINDS = [
  "trigger",
  "deterministic",
  "ai",
  "human_review",
  "output",
  "failure",
  "retry",
  "fallback",
  "audit",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  trigger: "Trigger",
  deterministic: "Deterministic step",
  ai: "AI-assisted step",
  human_review: "Human review",
  output: "Output",
  failure: "Failure path",
  retry: "Retry",
  fallback: "Manual fallback",
  audit: "Audit log",
};

/** Default configurable settings (stored in the settings table; these are fallbacks). */
export const DEFAULT_SETTINGS = {
  followUp1Days: 4, // business days after first message (guidance 3–5)
  followUp2Days: 6, // business days after follow-up one (guidance 5–7)
  finalCloseDays: 8, // business days after follow-up two (guidance 7–10)
  maxFollowUps: 3,
  minDaysBetweenOutbound: 3,
  dailyOutreachTarget: 10,
  weeklyReplyGoal: 5,
  warmListTarget: 100,
  discoveryConversationTarget: 5,
  caseStudyTarget: 3,
  paidClientTarget: 2,
  dailyResearchTarget: 5,
  scoreWeights: {
    icp_fit: 15,
    pain_probability: 20,
    urgency: 10,
    authority: 12,
    accessibility: 13,
    automation_feasibility: 12,
    case_study_potential: 8,
    paid_opportunity: 5,
    strategic_relationship: 3,
    data_confidence: 2,
  } as Record<ScoreDimension, number>,
} as const;

export type SettingsShape = {
  followUp1Days: number;
  followUp2Days: number;
  finalCloseDays: number;
  maxFollowUps: number;
  minDaysBetweenOutbound: number;
  dailyOutreachTarget: number;
  weeklyReplyGoal: number;
  warmListTarget: number;
  discoveryConversationTarget: number;
  caseStudyTarget: number;
  paidClientTarget: number;
  dailyResearchTarget: number;
  scoreWeights: Record<ScoreDimension, number>;
};
