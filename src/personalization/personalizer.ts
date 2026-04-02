import type { Lead, PainPointHypothesis } from "../types/index.js";

/**
 * Signal-to-pain-point mapping rules.
 * Maps observable signals to likely automation opportunities.
 */
const SIGNAL_PAIN_MAP: Array<{
  signalPattern: RegExp;
  painPoint: string;
  automationAngle: string;
  segments: string[];
}> = [
  {
    signalPattern: /hiring.*(ops|operations|fulfillment)/i,
    painPoint: "growing operations team suggests scaling pains",
    automationAngle: "automate repetitive ops tasks to reduce hiring pressure",
    segments: ["shopify", "ecommerce", "enterprise"],
  },
  {
    signalPattern: /hiring.*(customer|support|cx)/i,
    painPoint: "support hiring suggests growing ticket volume",
    automationAngle: "automate first-response and ticket routing to handle volume",
    segments: ["shopify", "ecommerce", "enterprise"],
  },
  {
    signalPattern: /multi.*(channel|platform)/i,
    painPoint: "multi-channel presence creates sync and inventory complexity",
    automationAngle: "connect channels with automated inventory and order sync",
    segments: ["shopify", "ecommerce"],
  },
  {
    signalPattern: /manual.*(process|reporting|spreadsheet)/i,
    painPoint: "manual processes consuming team time",
    automationAngle: "automate reporting and data flows between systems",
    segments: ["shopify", "ecommerce", "enterprise"],
  },
  {
    signalPattern: /fulfillment|warehouse|3pl|shipping/i,
    painPoint: "complex fulfillment operations with room for automation",
    automationAngle: "automate order routing, tracking updates, and fulfillment workflows",
    segments: ["shopify", "ecommerce"],
  },
  {
    signalPattern: /funding|raised|series/i,
    painPoint: "post-funding growth often outpaces operational infrastructure",
    automationAngle: "build scalable automated workflows before ops bottlenecks hit",
    segments: ["ecommerce", "enterprise"],
  },
  {
    signalPattern: /integration|fragmented|disconnected/i,
    painPoint: "fragmented tooling creating data silos and manual workarounds",
    automationAngle: "connect existing tools with automated data flows",
    segments: ["shopify", "ecommerce", "enterprise"],
  },
  {
    signalPattern: /subscription|recurring/i,
    painPoint: "subscription management adds recurring operational complexity",
    automationAngle: "automate subscription lifecycle: renewals, dunning, churn alerts",
    segments: ["shopify", "ecommerce"],
  },
  {
    signalPattern: /legacy|outdated/i,
    painPoint: "legacy systems creating friction and limiting agility",
    automationAngle: "bridge legacy systems with modern automation layers",
    segments: ["enterprise"],
  },
  {
    signalPattern: /digital transformation|moderniz/i,
    painPoint: "digital transformation initiatives need automation backbone",
    automationAngle: "implement workflow automation as part of modernization",
    segments: ["enterprise"],
  },
];

/**
 * Select the best personalization context for a lead.
 * Returns the top signal, pain point, and automation angle.
 */
export function selectPersonalization(lead: Lead): PersonalizationResult {
  // First, try LLM-generated pain points (highest quality)
  const topPainPoint = selectBestPainPoint(lead.painPoints);
  if (topPainPoint) {
    return {
      topSignal: topPainPoint.supportingSignals[0] || "business profile analysis",
      painPointHypothesis: topPainPoint.hypothesis,
      automationAngle: topPainPoint.automationAngle,
      roiAngle: topPainPoint.roiAngle,
      useCases: topPainPoint.relevantUseCases,
      personalizationSentence: buildPersonalizationSentence(lead, topPainPoint),
      source: "llm_enrichment",
    };
  }

  // Fallback: rule-based signal matching
  const allSignals = [
    ...lead.signals.hiringSignals,
    ...lead.signals.operationalComplexityClues,
    ...lead.signals.painPointClues,
    ...lead.signals.growthIndicators,
    ...lead.signals.fragmentedTooling,
    ...lead.signals.multiChannelPresence,
  ];

  for (const signal of allSignals) {
    for (const rule of SIGNAL_PAIN_MAP) {
      if (rule.signalPattern.test(signal) && rule.segments.includes(lead.segment)) {
        return {
          topSignal: signal,
          painPointHypothesis: rule.painPoint,
          automationAngle: rule.automationAngle,
          roiAngle: `Reduce time spent on ${rule.painPoint.split(" ")[0].toLowerCase()} tasks`,
          useCases: [rule.automationAngle],
          personalizationSentence: buildRuleBasedSentence(lead, signal, rule.painPoint),
          source: "rule_based",
        };
      }
    }
  }

  // Final fallback: segment-based generic (weakest)
  return segmentFallback(lead);
}

export interface PersonalizationResult {
  topSignal: string;
  painPointHypothesis: string;
  automationAngle: string;
  roiAngle: string;
  useCases: string[];
  personalizationSentence: string;
  source: "llm_enrichment" | "rule_based" | "segment_fallback";
}

function selectBestPainPoint(painPoints: PainPointHypothesis[]): PainPointHypothesis | undefined {
  if (painPoints.length === 0) return undefined;
  // Prefer high confidence, then medium
  const sorted = [...painPoints].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
  return sorted[0];
}

function buildPersonalizationSentence(lead: Lead, pp: PainPointHypothesis): string {
  const name = lead.company.name;
  if (pp.supportingSignals.length > 0) {
    return `I noticed ${name} ${pp.supportingSignals[0].toLowerCase()} — ${pp.hypothesis.toLowerCase()}.`;
  }
  return `Based on ${name}'s profile, ${pp.hypothesis.toLowerCase()}.`;
}

function buildRuleBasedSentence(lead: Lead, signal: string, painPoint: string): string {
  return `I noticed ${lead.company.name} ${signal.toLowerCase()} — that often means ${painPoint.toLowerCase()}.`;
}

function segmentFallback(lead: Lead): PersonalizationResult {
  const fallbacks: Record<string, { pain: string; angle: string }> = {
    shopify: {
      pain: "growing Shopify stores often hit operational bottlenecks as order volume scales",
      angle: "automate order management, fulfillment routing, and customer communication workflows",
    },
    ecommerce: {
      pain: "ecommerce operations involve many repetitive workflows across sales, fulfillment, and support",
      angle: "connect your existing tools and automate the repetitive workflows between them",
    },
    enterprise: {
      pain: "larger organizations often have manual processes embedded across departments",
      angle: "identify and automate high-impact workflows to reduce operational overhead",
    },
  };

  const fb = fallbacks[lead.segment] || fallbacks.ecommerce;
  return {
    topSignal: `${lead.segment} company profile`,
    painPointHypothesis: fb.pain,
    automationAngle: fb.angle,
    roiAngle: "Reduce operational overhead and free up team capacity",
    useCases: [fb.angle],
    personalizationSentence: `As a ${lead.segment} business, ${fb.pain.toLowerCase()}.`,
    source: "segment_fallback",
  };
}
