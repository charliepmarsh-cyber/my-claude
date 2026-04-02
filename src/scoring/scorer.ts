import type { Lead, ScoreBreakdown, PublicSignals, CompanyProfile } from "../types/index.js";
import { getIcpProfile, type IcpSignal } from "./icp.js";

// ── Weights for final score composition ─────────────────────────
const WEIGHTS = {
  fit: 0.30,
  opportunity: 0.35,
  urgency: 0.20,
  personalization: 0.15,
};

/**
 * Score a lead deterministically based on its profile and signals.
 * No LLM needed — pure function.
 */
export function scoreLead(lead: Lead): ScoreBreakdown {
  const icp = getIcpProfile(lead.segment);

  // Check exclusion first
  const exclusionReason = checkExclusion(lead, icp.exclusionCriteria);
  if (exclusionReason) {
    return {
      fitScore: 0,
      fitFactors: [],
      opportunityScore: 0,
      opportunityFactors: [],
      urgencyScore: 0,
      urgencyFactors: [],
      personalizationDepth: 0,
      personalizationFactors: [],
      finalScore: 0,
      tier: "D",
      explanation: `Excluded: ${exclusionReason}`,
      redFlags: [exclusionReason],
      excluded: true,
      exclusionReason,
    };
  }

  // Score each dimension
  const { score: fitScore, factors: fitFactors } = scoreDimension(lead, icp.positiveSignals.filter(s => s.category === "fit"), icp.negativeSignals.filter(s => s.category === "fit"));
  const { score: oppScore, factors: oppFactors } = scoreDimension(lead, icp.positiveSignals.filter(s => s.category === "opportunity"), icp.negativeSignals.filter(s => s.category === "opportunity"));
  const { score: urgScore, factors: urgFactors } = scoreDimension(lead, icp.positiveSignals.filter(s => s.category === "urgency"), icp.negativeSignals.filter(s => s.category === "urgency"));
  const { score: persScore, factors: persFactors } = scorePersonalizationDepth(lead);

  const redFlags = collectRedFlags(lead);

  // Composite score
  const rawFinal =
    fitScore * WEIGHTS.fit +
    oppScore * WEIGHTS.opportunity +
    urgScore * WEIGHTS.urgency +
    persScore * WEIGHTS.personalization;

  // Apply red flag penalty
  const penalty = Math.min(redFlags.length * 5, 25);
  const finalScore = Math.max(0, Math.round(rawFinal - penalty));

  const tier = finalScore >= 75 ? "A" : finalScore >= 50 ? "B" : finalScore >= 30 ? "C" : "D";

  return {
    fitScore: Math.round(fitScore),
    fitFactors,
    opportunityScore: Math.round(oppScore),
    opportunityFactors: oppFactors,
    urgencyScore: Math.round(urgScore),
    urgencyFactors: urgFactors,
    personalizationDepth: Math.round(persScore),
    personalizationFactors: persFactors,
    finalScore,
    tier,
    explanation: buildExplanation(tier, fitFactors, oppFactors, urgFactors, redFlags),
    redFlags,
    excluded: false,
  };
}

// ── Dimension scoring ───────────────────────────────────────────

function scoreDimension(
  lead: Lead,
  positiveSignals: IcpSignal[],
  negativeSignals: IcpSignal[]
): { score: number; factors: string[] } {
  const factors: string[] = [];
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const sig of positiveSignals) {
    totalWeight += sig.weight;
    if (matchesSignal(lead, sig.signal)) {
      matchedWeight += sig.weight;
      factors.push(`+${sig.description}`);
    }
  }

  for (const sig of negativeSignals) {
    if (matchesSignal(lead, sig.signal)) {
      matchedWeight += sig.weight; // weight is negative
      factors.push(`-${sig.description}`);
    }
  }

  const score = totalWeight > 0 ? Math.max(0, Math.min(100, (matchedWeight / totalWeight) * 100)) : 50;
  return { score, factors };
}

/**
 * Check if a lead matches a named signal.
 * This maps ICP signal names to concrete checks on lead data.
 */
function matchesSignal(lead: Lead, signal: string): boolean {
  const c = lead.company;
  const s = lead.signals;

  const checks: Record<string, () => boolean> = {
    // Platform signals
    shopify_platform: () => platformIs(c, "shopify"),
    ecommerce_platform: () => !!c.platform && c.platform !== "unknown",
    multi_platform: () => s.multiChannelPresence.length >= 2,

    // Product/catalog
    multiple_products: () => c.products.length >= 5 || hasClue(s, "large catalog"),
    single_product: () => c.products.length === 1,
    subscription_model: () => hasClue(s, "subscription") || hasClue(s, "recurring"),

    // Fulfillment
    custom_fulfillment: () => hasClue(s, "fulfillment") || hasClue(s, "warehouse") || hasClue(s, "3pl"),
    warehouse_complexity: () => hasClue(s, "warehouse") || hasClue(s, "fulfillment center"),

    // Team/size
    growing_team: () => s.hiringSignals.length > 0,
    team_size_11_plus: () => sizeAtLeast(c.sizeEstimate, 11),
    team_size_200_plus: () => sizeAtLeast(c.sizeEstimate, 200),

    // Operations
    app_stack_fragmented: () => s.fragmentedTooling.length >= 2 || c.techStack.length >= 5,
    manual_processes_visible: () => s.painPointClues.length > 0 || hasClue(s, "manual"),
    manual_workflows_at_scale: () => sizeAtLeast(c.sizeEstimate, 50) && hasClue(s, "manual"),
    complex_operations: () => s.operationalComplexityClues.length >= 2,
    erp_integration_need: () => hasClue(s, "erp") || hasClue(s, "integration"),
    data_reporting_gaps: () => hasClue(s, "reporting") || hasClue(s, "spreadsheet"),

    // Customer/support
    review_volume: () => hasClue(s, "reviews") || hasClue(s, "ratings"),
    customer_support_scale: () => hasClue(s, "support") || hasClue(s, "helpdesk") || hasClue(s, "tickets"),
    customer_base_large: () => sizeAtLeast(c.sizeEstimate, 200),

    // Growth/urgency
    recent_growth: () => s.growthIndicators.length > 0,
    recent_funding: () => hasClue(s, "funding") || hasClue(s, "raised") || hasClue(s, "series"),
    international_expansion: () => hasClue(s, "international") || hasClue(s, "global"),
    recent_acquisition: () => hasClue(s, "acquisition") || hasClue(s, "merged"),
    digital_transformation: () => hasClue(s, "digital transformation") || hasClue(s, "moderniz"),

    // Hiring
    hiring_ops_roles: () => s.hiringSignals.some(h => /ops|operations|cx|customer|growth|fulfillment/i.test(h)),
    hiring_tech_leadership: () => s.hiringSignals.some(h => /cto|vp eng|head of|director/i.test(h)),

    // Multi-channel
    multi_channel_selling: () => s.multiChannelPresence.length >= 2,
    marketing_automation_need: () => hasClue(s, "marketing") && !hasClue(s, "automated"),

    // Enterprise
    multiple_business_units: () => hasClue(s, "business unit") || hasClue(s, "division"),
    legacy_systems: () => hasClue(s, "legacy") || hasClue(s, "outdated"),
    compliance_needs: () => hasClue(s, "compliance") || hasClue(s, "regulated"),

    // Negative
    brand_new_store: () => hasClue(s, "new store") || hasClue(s, "just launched"),
    dropship_only_low_volume: () => hasClue(s, "dropship") && !sizeAtLeast(c.sizeEstimate, 5),
    pre_revenue: () => hasClue(s, "pre-revenue") || hasClue(s, "pre-launch"),
    highly_automated_already: () => hasClue(s, "fully automated") || hasClue(s, "highly automated"),
    already_has_automation_team: () => hasClue(s, "automation team") || hasClue(s, "internal automation"),
    tech_company_building_own: () => c.industry === "technology" && sizeAtLeast(c.sizeEstimate, 100),
  };

  return checks[signal]?.() ?? false;
}

// ── Personalization Depth ───────────────────────────────────────

function scorePersonalizationDepth(lead: Lead): { score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0;

  if (lead.company.description) { score += 15; factors.push("Has company description"); }
  if (lead.company.website) { score += 10; factors.push("Has website"); }
  if (lead.contact.fullName || lead.contact.firstName) { score += 10; factors.push("Has contact name"); }
  if (lead.contact.role) { score += 10; factors.push("Has contact role"); }
  if (lead.contact.linkedinUrl) { score += 5; factors.push("Has LinkedIn URL"); }
  if (lead.signals.painPointClues.length > 0) { score += 15; factors.push("Has pain point clues"); }
  if (lead.signals.hiringSignals.length > 0) { score += 10; factors.push("Has hiring signals"); }
  if (lead.signals.recentAnnouncements.length > 0) { score += 10; factors.push("Has recent announcements"); }
  if (lead.signals.operationalComplexityClues.length > 0) { score += 10; factors.push("Has ops complexity clues"); }
  if (lead.company.products.length > 0) { score += 5; factors.push("Has product info"); }

  return { score: Math.min(100, score), factors };
}

// ── Red flags ───────────────────────────────────────────────────

function collectRedFlags(lead: Lead): string[] {
  const flags: string[] = [];
  if (!lead.contact.email && !lead.contact.linkedinUrl) flags.push("No contact method available");
  if (!lead.company.website) flags.push("No company website");
  if (!lead.contact.fullName && !lead.contact.firstName) flags.push("No contact name");
  if (lead.signals.painPointClues.length === 0 && lead.signals.operationalComplexityClues.length === 0) {
    flags.push("No operational signals found");
  }
  return flags;
}

// ── Helpers ─────────────────────────────────────────────────────

function platformIs(c: CompanyProfile, name: string): boolean {
  return c.platform?.toLowerCase().includes(name) || c.platformIndicators.some(p => p.toLowerCase().includes(name));
}

function hasClue(s: PublicSignals, keyword: string): boolean {
  const all = [
    ...s.painPointClues,
    ...s.operationalComplexityClues,
    ...s.hiringSignals,
    ...s.recentAnnouncements,
    ...s.customerExperienceClues,
    ...s.growthIndicators,
    ...s.teamStructureClues,
    ...s.fragmentedTooling,
    ...(s.rawNotes ? [s.rawNotes] : []),
  ];
  return all.some(c => c.toLowerCase().includes(keyword.toLowerCase()));
}

function sizeAtLeast(sizeEstimate: string | undefined, min: number): boolean {
  if (!sizeEstimate) return false;
  // Parse formats like "11-50", "51-200", "200+", "500"
  const match = sizeEstimate.match(/(\d+)/);
  if (!match) return false;
  // For ranges like "11-50", check the upper bound
  const parts = sizeEstimate.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (parts) {
    return parseInt(parts[2], 10) >= min;
  }
  return parseInt(match[1], 10) >= min;
}

function buildExplanation(
  tier: string,
  fitFactors: string[],
  oppFactors: string[],
  urgFactors: string[],
  redFlags: string[]
): string {
  const parts = [`Tier ${tier} lead.`];
  if (fitFactors.length > 0) parts.push(`Fit: ${fitFactors.slice(0, 2).join("; ")}.`);
  if (oppFactors.length > 0) parts.push(`Opportunity: ${oppFactors.slice(0, 2).join("; ")}.`);
  if (urgFactors.length > 0) parts.push(`Urgency: ${urgFactors.slice(0, 2).join("; ")}.`);
  if (redFlags.length > 0) parts.push(`Flags: ${redFlags.join("; ")}.`);
  return parts.join(" ");
}

// ── Exclusion check ─────────────────────────────────────────────

function checkExclusion(lead: Lead, criteria: string[]): string | undefined {
  // Programmatic exclusion checks
  if (!lead.company.name || lead.company.name.trim() === "") {
    return "No company name";
  }
  // Check for signals that match exclusion criteria text
  const allText = [
    lead.signals.rawNotes || "",
    ...lead.signals.painPointClues,
    ...lead.signals.recentAnnouncements,
  ].join(" ").toLowerCase();

  if (allText.includes("shutting down") || allText.includes("going out of business")) {
    return "Business appears to be shutting down";
  }
  if (allText.includes("inactive") || allText.includes("abandoned")) {
    return "Store/business appears inactive";
  }

  return undefined;
}
