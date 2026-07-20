/**
 * Explainable lead-scoring engine.
 *
 * Every dimension is computed by deterministic rules. Each factor emits a
 * breakdown line (points, evidence, or what's missing), so the UI can show
 * exactly why a score is what it is and what would raise it.
 *
 * AI never sets scores. Manual overrides are stored separately with a reason.
 */

import { differenceInDays } from "date-fns";
import type {
  BuyingSignal,
  Company,
  Discovery,
  Lead,
  PainHypothesis,
  ResearchItem,
  ScoreBreakdownLine,
} from "@/db/schema";
import {
  PEER_CATEGORIES,
  SCORE_DIMENSIONS,
  type IcpCategory,
  type PainCategory,
  type PriorityLabel,
  type ScoreDimension,
  type SettingsShape,
} from "@/lib/constants";

export type ScoringInput = {
  lead: Lead;
  company: Company | null;
  research: ResearchItem[];
  signals: BuyingSignal[];
  pains: PainHypothesis[];
  discovery: Discovery | null;
  now?: Date;
};

export type DimensionResult = { value: number; breakdown: ScoreBreakdownLine[] };
export type ScoreSet = Record<ScoreDimension, DimensionResult> & {
  overall: { value: number; breakdown: ScoreBreakdownLine[] };
};

const PRIMARY_ICP: IcpCategory[] = [
  "ecommerce_founder",
  "shopify_expert",
  "shopify_agency",
  "dtc_growth",
  "head_of_ecommerce",
  "performance_marketer",
  "meta_ads_specialist",
  "cro_specialist",
  "email_marketer",
  "ecommerce_bookkeeper",
  "fulfilment_founder",
];

const SECONDARY_ICP: IcpCategory[] = [
  "creator_marketer",
  "operations_director",
  "website_agency",
  "recruitment_founder",
  "local_trade",
  "restaurant_owner",
  "cleaning_business",
  "general_owner",
];

/** Pain categories CPM can deliver against today with n8n/Claude/Sheets/HubSpot. */
const DELIVERABLE_PAINS: PainCategory[] = [
  "campaign_reporting",
  "lead_qualification",
  "crm_hygiene",
  "client_onboarding",
  "content_collection",
  "email_segmentation",
  "lifecycle_reporting",
  "product_data",
  "marketplace_sync",
  "inventory",
  "document_chasing",
  "finance_reconciliation",
  "recruitment_admin",
  "quote_scheduling",
  "creative_analysis",
  "asset_management",
  "project_handovers",
];

const INTEGRABLE_TOOLS =
  /shopify|klaviyo|hubspot|mailchimp|google sheets|sheets|airtable|notion|slack|meta|facebook|ga4|google analytics|xero|quickbooks|stripe|zapier|make\.com|n8n|amazon|ebay|etsy|woocommerce|bigcommerce|pipedrive|monday|asana|trello|gmail|outlook/i;

const HOT_SIGNALS = new Set(["manual_process_mention", "public_complaint"]);
const TRIGGER_SIGNALS = new Set([
  "hiring",
  "funding",
  "product_launch",
  "expansion",
  "rapid_growth",
  "new_leadership",
  "tech_change",
  "new_platform",
  "agency_expansion",
]);

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

class Builder {
  lines: ScoreBreakdownLine[] = [];
  total = 0;

  add(factor: string, points: number, max: number, evidence?: string): this {
    this.total += points;
    this.lines.push({ factor, points, max, evidence });
    return this;
  }

  miss(factor: string, max: number, missing: string): this {
    this.lines.push({ factor, points: 0, max, missing });
    return this;
  }

  result(): DimensionResult {
    return { value: clamp(this.total), breakdown: this.lines };
  }
}

/* ------------------------------------------------------------------ */
/* Dimensions                                                          */
/* ------------------------------------------------------------------ */

function icpFit({ lead, company }: ScoringInput): DimensionResult {
  const b = new Builder();
  const cat = lead.icpCategory ?? "other";

  if (PRIMARY_ICP.includes(cat)) b.add("Primary ICP category", 40, 40, `${cat} is a core CPM niche`);
  else if (SECONDARY_ICP.includes(cat)) b.add("Secondary ICP category", 25, 40, `${cat} is a secondary niche`);
  else if (PEER_CATEGORIES.includes(cat)) b.add("Peer category", 10, 40, "AI specialists are peers, not prospects");
  else b.miss("ICP category", 40, "Set an ICP category to score fit properly");

  if (company?.shopifyStatus === "shopify_plus") b.add("Shopify Plus", 20, 20, "Shopify Plus store");
  else if (company?.shopifyStatus === "shopify") b.add("Shopify", 16, 20, "Shopify store");
  else if (company?.ecommercePlatform) b.add("Ecommerce platform", 10, 20, company.ecommercePlatform);
  else b.miss("Ecommerce platform", 20, "Platform unknown — check their site footer or tech stack");

  if (company?.businessModel === "dtc" || company?.businessModel === "b2c")
    b.add("Consumer/DTC model", 10, 10, company.businessModel.toUpperCase());
  else if (company?.businessModel === "b2b") b.add("B2B model", 6, 10, "B2B");
  else b.miss("Business model", 10, "Business model not recorded");

  const size = company?.employeeRange ?? "";
  if (/^(1|2|2-10|1-10|11-50|2-50|10-50)/.test(size)) b.add("Team size sweet spot", 15, 15, `${size} employees — fast decisions`);
  else if (/^(51|50-200|51-200|200)/.test(size)) b.add("Mid-size team", 8, 15, `${size} employees`);
  else if (size) b.add("Team size known", 4, 15, `${size} employees`);
  else b.miss("Team size", 15, "Employee range unknown");

  if (company?.industry && /commerce|retail|dtc|consumer|brand/i.test(company.industry))
    b.add("Ecommerce-adjacent industry", 10, 10, company.industry);
  else if (company?.industry) b.add("Industry recorded", 4, 10, company.industry);
  else b.miss("Industry", 10, "Industry not recorded");

  if (company?.description) b.add("Company understood", 5, 5, "Description on file");
  else b.miss("Company description", 5, "Add a one-line description of what they sell");

  return b.result();
}

function painProbability({ pains, signals, lead }: ScoringInput): DimensionResult {
  const b = new Builder();

  const confirmed = pains.filter((p) => p.status === "confirmed");
  const proposedWithEvidence = pains.filter((p) => p.status === "proposed" && (p.evidence || p.evidenceUrl));
  const proposedBare = pains.filter((p) => p.status === "proposed" && !p.evidence && !p.evidenceUrl);

  if (confirmed.length > 0)
    b.add("Confirmed pain hypotheses", Math.min(60, confirmed.length * 30), 60, confirmed.map((p) => p.hypothesis).join("; "));
  if (proposedWithEvidence.length > 0)
    b.add("Evidenced hypotheses", Math.min(30, proposedWithEvidence.length * 15), 30, `${proposedWithEvidence.length} with recorded evidence`);
  if (proposedBare.length > 0)
    b.add("Unevidenced hypotheses", Math.min(12, proposedBare.length * 6), 12, `${proposedBare.length} awaiting evidence`);
  if (pains.length === 0) b.miss("Pain hypotheses", 60, "No pain hypotheses recorded — research or ask");

  const hot = signals.filter((s) => HOT_SIGNALS.has(s.signalType));
  if (hot.length > 0)
    b.add("Direct pain signals", Math.min(30, hot.length * 15), 30, hot.map((s) => s.description).join("; "));

  const complexity = signals.filter((s) => ["large_catalogue", "multi_marketplace"].includes(s.signalType));
  if (complexity.length > 0)
    b.add("Operational complexity", Math.min(16, complexity.length * 8), 16, complexity.map((s) => s.description).join("; "));

  if (lead.replySentiment === "qualified_problem")
    b.add("Qualified problem in conversation", 25, 25, "They described a real problem in their own words");

  return b.result();
}

function urgency({ signals, research, lead, now = new Date() }: ScoringInput): DimensionResult {
  const b = new Builder();
  const triggers = signals.filter((s) => TRIGGER_SIGNALS.has(s.signalType));
  let recent = 0;
  let older = 0;
  for (const s of triggers) {
    const days = s.observedAt ? differenceInDays(now, s.observedAt) : null;
    if (days !== null && days <= 90) recent++;
    else older++;
  }
  if (recent > 0) b.add("Recent trigger events (≤90 days)", Math.min(54, recent * 18), 54, `${recent} recent trigger${recent === 1 ? "" : "s"}`);
  if (older > 0) b.add("Older trigger events", Math.min(16, older * 8), 16, `${older} older trigger${older === 1 ? "" : "s"}`);
  if (triggers.length === 0) b.miss("Trigger events", 54, "No trigger events recorded (hiring, launches, funding, growth…)");

  const triggerNotes = research.filter((r) => r.kind === "trigger_event" || r.kind === "news");
  if (triggerNotes.length > 0) b.add("News / trigger research", Math.min(16, triggerNotes.length * 8), 16, `${triggerNotes.length} item${triggerNotes.length === 1 ? "" : "s"} on file`);

  if (lead.replySentiment === "qualified_problem" || lead.replySentiment === "meeting_ready")
    b.add("Live conversation about the problem", 20, 20, "Problem is on their mind right now");

  if (b.total === 0) b.add("No urgency evidence", 5, 5, "Base score — nothing suggests time pressure");
  return b.result();
}

function authority({ lead }: ScoringInput): DimensionResult {
  const b = new Builder();
  switch (lead.decisionAuthority) {
    case "decision_maker":
      b.add("Decision maker", 45, 45, "Can approve work directly");
      break;
    case "influencer":
      b.add("Influencer", 20, 45, "Influences the decision, likely needs sign-off");
      break;
    case "user":
      b.add("End user", 5, 45, "Uses the process but doesn't own budget");
      break;
    default:
      b.miss("Decision authority", 45, "Authority unknown — check their role scope");
  }
  if (lead.isFounder) b.add("Founder", 25, 25, "Owns the business");
  switch (lead.seniority) {
    case "founder":
    case "c_level":
      b.add("Senior title", 20, 20, lead.jobTitle ?? lead.seniority);
      break;
    case "director":
    case "head":
      b.add("Director / Head", 12, 20, lead.jobTitle ?? lead.seniority);
      break;
    case "manager":
      b.add("Manager", 6, 20, lead.jobTitle ?? "manager");
      break;
    default:
      if (!lead.isFounder) b.miss("Seniority", 20, "Seniority unknown");
  }
  if (lead.jobTitle) b.add("Role recorded", 10, 10, lead.jobTitle);
  else b.miss("Job title", 10, "No job title on record");
  return b.result();
}

function accessibility({ lead, now = new Date() }: ScoringInput): DimensionResult {
  const b = new Builder();
  if (lead.warmth === "warm") b.add("Warm relationship", 30, 30, lead.howKnown ?? "Existing relationship");
  else b.miss("Warmth", 30, "Cold contact — a warm intro would transform access");

  if (lead.connectionDegree === "1st") b.add("1st-degree connection", 25, 25, "Direct message possible");
  else if (lead.connectionDegree === "2nd") b.add("2nd-degree connection", 10, 25, "Mutual connections exist");
  else b.miss("Connection degree", 25, "Not connected on LinkedIn yet");

  if (lead.relationshipStrength) b.add("Relationship strength", Math.min(18, lead.relationshipStrength * 4), 18, `${lead.relationshipStrength}/5 self-rated`);

  const days = lead.lastInteractionAt ? differenceInDays(now, lead.lastInteractionAt) : null;
  if (days !== null && days <= 90) b.add("Recent interaction", 10, 10, `Last spoke ${days} day${days === 1 ? "" : "s"} ago`);
  else if (days !== null && days <= 365) b.add("Interaction this year", 5, 10, `Last spoke ${days} days ago`);
  else b.miss("Recency", 10, "No recorded interaction in the last year");

  if (lead.referrer) b.add("Referred", 10, 10, `Referred by ${lead.referrer}`);
  if (lead.sharedConnections) b.add("Shared connections", 5, 5, lead.sharedConnections);
  if (lead.linkedinUrl || lead.workEmail || lead.personalEmail) b.add("Reachable", 10, 10, "Contact route on file");
  else b.miss("Contact route", 10, "No LinkedIn URL or email — can't reach them");
  return b.result();
}

function automationFeasibility({ lead, pains, discovery }: ScoringInput): DimensionResult {
  const b = new Builder();
  const deliverable = pains.filter((p) => DELIVERABLE_PAINS.includes(p.category));
  if (deliverable.length > 0)
    b.add("Deliverable pain categories", Math.min(50, deliverable.length * 25), 50, deliverable.map((p) => p.category).join(", "));
  else if (pains.length > 0) b.add("Pains outside core stack", 8, 50, "Recorded pains are outside CPM's proven delivery areas");
  else b.miss("Pain categories", 50, "No pains recorded — feasibility unknown");

  const tools = (lead.currentTools ?? []).filter((t) => INTEGRABLE_TOOLS.test(t));
  if (tools.length > 0) b.add("Integrable tool stack", Math.min(24, tools.length * 8), 24, tools.join(", "));
  else b.miss("Tool stack", 24, "Record their tools — integrations decide feasibility");

  if (discovery?.accessRequired && discovery?.humanJudgement)
    b.add("Access & judgement mapped", 16, 16, "Discovery covers data access and human-review needs");
  else if (discovery) b.add("Discovery in progress", 8, 16, "Partial discovery on file");
  else b.miss("Discovery", 16, "No discovery record yet");

  if (discovery?.complianceRisk && /high|severe/i.test(discovery.complianceRisk))
    b.add("Compliance risk flagged", -10, 0, discovery.complianceRisk);

  if (b.total === 0 && PRIMARY_ICP.includes(lead.icpCategory ?? "other"))
    b.add("Typical niche processes", 15, 15, "Core-niche businesses usually run automatable workflows");
  return b.result();
}

function caseStudyPotential({ lead, company, pains }: ScoringInput): DimensionResult {
  const b = new Builder();
  if (lead.caseStudySuitability) b.add("Manual suitability rating", Math.min(60, lead.caseStudySuitability * 12), 60, `${lead.caseStudySuitability}/5 rated`);
  else b.miss("Suitability rating", 60, "Rate case-study suitability (1–5) on the lead record");

  const highImpact = pains.filter((p) => p.impact === "high");
  if (highImpact.length > 0) b.add("Measurable high-impact pain", Math.min(20, highImpact.length * 10), 20, highImpact.map((p) => p.category).join(", "));

  const size = company?.employeeRange ?? "";
  if (/^(1|2|2-10|1-10|11-50|2-50|10-50)/.test(size)) b.add("Small team, fast build", 10, 10, "Small companies approve and measure quickly");
  if (lead.warmth === "warm") b.add("Warm — easier permission", 10, 10, "Existing trust makes publishing approval likelier");
  return b.result();
}

function paidOpportunity({ lead, company, signals }: ScoringInput): DimensionResult {
  const b = new Builder();
  if (lead.paidSuitability) b.add("Manual paid-suitability rating", Math.min(60, lead.paidSuitability * 12), 60, `${lead.paidSuitability}/5 rated`);
  else b.miss("Paid suitability", 60, "Rate paid-project suitability (1–5)");

  if (company?.revenueRange && /m|million|£1m|\d{6,}/i.test(company.revenueRange))
    b.add("Revenue scale", 15, 15, company.revenueRange);
  else if (company?.revenueRange) b.add("Revenue recorded", 6, 15, company.revenueRange);
  else b.miss("Revenue range", 15, "Revenue unknown — affects budget likelihood");

  if (signals.some((s) => s.signalType === "funding")) b.add("Recent funding", 10, 10, "Funding signal on file");
  if (lead.opportunityValue && lead.opportunityValue > 0) b.add("Value estimated", 10, 10, `~£${lead.opportunityValue}`);
  if ((lead.retainerSuitability ?? 0) >= 3) b.add("Retainer potential", 5, 5, `${lead.retainerSuitability}/5`);
  return b.result();
}

function strategicRelationship({ lead }: ScoringInput): DimensionResult {
  const b = new Builder();
  const cat = lead.icpCategory ?? "other";
  if (PEER_CATEGORIES.includes(cat)) b.add("Peer / collaborator", 30, 30, "Knowledge exchange and referral partner potential");
  if (["shopify_agency", "website_agency", "cro_specialist", "performance_marketer", "meta_ads_specialist"].includes(cat))
    b.add("Multiplier category", 15, 15, "Works with many brands — one relationship, many doors");
  if (lead.referralPotential) b.add("Referral potential", Math.min(40, lead.referralPotential * 8), 40, `${lead.referralPotential}/5 rated`);
  else b.miss("Referral potential", 40, "Rate referral potential (1–5)");
  if (lead.sharedGroups) b.add("Shared communities", 5, 5, lead.sharedGroups);
  if (lead.strategicValue) b.add("Strategic note", 15, 15, lead.strategicValue);
  return b.result();
}

function dataConfidence({ lead, research }: ScoringInput): DimensionResult {
  const b = new Builder();
  b.add("Record completeness", Math.round(lead.completeness * 0.35), 35, `${lead.completeness}% of key fields filled`);

  const high = research.filter((r) => r.confidence === "high").length;
  const med = research.filter((r) => r.confidence === "medium").length;
  const low = research.filter((r) => r.confidence === "low").length;
  if (research.length > 0)
    b.add(
      "Research on file",
      Math.min(35, high * 10 + med * 6 + low * 3),
      35,
      `${research.length} item${research.length === 1 ? "" : "s"} (${high} high, ${med} medium, ${low} low confidence)`,
    );
  else b.miss("Research", 35, "No research items recorded");

  const sourced = research.filter((r) => r.sourceUrl).length;
  if (sourced > 0) b.add("Sources linked", Math.min(15, sourced * 5), 15, `${sourced} item${sourced === 1 ? "" : "s"} with source URLs`);
  else b.miss("Source links", 15, "Attach source URLs so facts can be re-verified");

  if (lead.lastInteractionAt) b.add("Interaction history", 5, 5, "Last interaction recorded");
  if (lead.icpCategory && lead.icpCategory !== "other") b.add("Categorised", 10, 10, "ICP category assigned");
  else b.miss("ICP category", 10, "Assign an ICP category");
  return b.result();
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function computeScores(input: ScoringInput): ScoreSet {
  const dims: Record<ScoreDimension, DimensionResult> = {
    icp_fit: icpFit(input),
    pain_probability: painProbability(input),
    urgency: urgency(input),
    authority: authority(input),
    accessibility: accessibility(input),
    automation_feasibility: automationFeasibility(input),
    case_study_potential: caseStudyPotential(input),
    paid_opportunity: paidOpportunity(input),
    strategic_relationship: strategicRelationship(input),
    data_confidence: dataConfidence(input),
  };
  return { ...dims, overall: { value: 0, breakdown: [] } };
}

export function computeOverall(
  dims: Record<ScoreDimension, { value: number }>,
  weights: SettingsShape["scoreWeights"],
): { value: number; breakdown: ScoreBreakdownLine[] } {
  const totalWeight = SCORE_DIMENSIONS.reduce((acc, d) => acc + (weights[d] ?? 0), 0) || 1;
  let sum = 0;
  const breakdown: ScoreBreakdownLine[] = [];
  for (const d of SCORE_DIMENSIONS) {
    const w = weights[d] ?? 0;
    const contribution = (dims[d].value * w) / totalWeight;
    sum += contribution;
    breakdown.push({
      factor: d,
      points: Math.round(contribution * 10) / 10,
      max: Math.round((100 * w * 10) / totalWeight) / 10,
      evidence: `${dims[d].value}/100 × weight ${w}`,
    });
  }
  return { value: clamp(sum), breakdown };
}

export function computeScoreSet(input: ScoringInput, weights: SettingsShape["scoreWeights"]): ScoreSet {
  const set = computeScores(input);
  set.overall = computeOverall(set, weights);
  return set;
}

/** Deterministic priority suggestion — always paired with a reason. */
export function suggestPriority(input: ScoringInput, set: ScoreSet): { label: PriorityLabel; reason: string } {
  const { lead } = input;
  if (lead.doNotContact) return { label: "do_not_contact", reason: "Do-not-contact flag is set." };
  if (PEER_CATEGORIES.includes(lead.icpCategory ?? "other"))
    return { label: "peer_collaborator", reason: "AI specialists are treated as peers unless direct buying evidence exists." };
  if (set.strategic_relationship.value >= 60 && set.pain_probability.value < 30)
    return {
      label: "strategic_relationship",
      reason: "High strategic value without direct pain evidence — nurture the relationship, don't pitch.",
    };
  const overall = set.overall.value;
  const contactable = set.accessibility.value >= 30;
  const enoughData = set.data_confidence.value >= 35;
  if (overall >= 60 && contactable && enoughData)
    return { label: "p1_contact_now", reason: `Overall ${overall} with reachable contact and sufficient data confidence.` };
  if (overall >= 60)
    return { label: "p2_research_first", reason: `Overall ${overall} but data confidence or access is thin — research first.` };
  if (overall >= 42) return { label: "p2_research_first", reason: `Overall ${overall} — promising, needs stronger evidence before contact.` };
  if (overall >= 28) return { label: "p3_nurture", reason: `Overall ${overall} — keep warm, revisit when signals appear.` };
  if (set.icp_fit.value < 15 && set.pain_probability.value === 0)
    return { label: "not_suitable", reason: "No ICP fit and no pain evidence." };
  return { label: "p4_low", reason: `Overall ${overall} — low priority for now.` };
}

/** Record completeness: % of the fields that matter for outreach quality. */
export function computeCompleteness(lead: Lead, company: Company | null): number {
  const checks: Array<boolean> = [
    !!lead.fullName,
    !!lead.jobTitle,
    !!(lead.linkedinUrl || lead.workEmail || lead.personalEmail),
    !!lead.icpCategory && lead.icpCategory !== "other",
    !!lead.source,
    !!lead.howKnown || lead.warmth === "cold",
    !!lead.location,
    lead.decisionAuthority !== "unknown",
    lead.seniority !== "unknown",
    !!company,
    !!company?.website,
    !!company?.industry,
    !!company?.employeeRange,
    !!(company && (company.ecommercePlatform || company.shopifyStatus !== "unknown")),
    !!lead.notes || !!lead.recommendedAngle,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
