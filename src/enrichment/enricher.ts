import type { Lead, PublicSignals, PainPointHypothesis } from "../types/index.js";
import { callLlmJson } from "../lib/llm.js";
import { log } from "../lib/logger.js";
import {
  ENRICHMENT_SYSTEM_PROMPT,
  buildEnrichmentPrompt,
  PAIN_POINT_SYSTEM_PROMPT,
  buildPainPointPrompt,
} from "../prompts/enrichment.js";

interface EnrichmentResult {
  companyDescription: string | null;
  estimatedProducts: string[];
  operationalComplexityClues: string[];
  painPointClues: string[];
  hiringSignals: string[];
  customerExperienceClues: string[];
  multiChannelPresence: string[];
  teamStructureClues: string[];
  fragmentedTooling: string[];
  growthIndicators: string[];
  storefrontMaturity: string;
  automationOpportunities: Array<{
    area: string;
    hypothesis: string;
    confidence: string;
    roiAngle: string;
  }>;
}

interface PainPointResult {
  painPoints: Array<{
    hypothesis: string;
    confidence: "high" | "medium" | "low";
    supportingSignals: string[];
    automationAngle: string;
    roiAngle: string;
    relevantUseCases: string[];
  }>;
}

/**
 * Enrich a lead using LLM analysis of its public data.
 * Updates the lead's signals and pain points in place.
 */
export async function enrichLead(lead: Lead): Promise<Lead> {
  log.info(`Enriching lead: ${lead.company.name}`);

  try {
    // Step 1: Extract structured enrichment data
    const enrichment = await callLlmJson<EnrichmentResult>({
      system: ENRICHMENT_SYSTEM_PROMPT,
      prompt: buildEnrichmentPrompt({
        companyName: lead.company.name,
        website: lead.company.website,
        platform: lead.company.platform,
        industry: lead.company.industry,
        sizeEstimate: lead.company.sizeEstimate,
        contactRole: lead.contact.role,
        notes: lead.signals.rawNotes,
      }),
    });

    // Merge enrichment into lead signals (append, don't replace)
    const signals: PublicSignals = {
      ...lead.signals,
      operationalComplexityClues: mergeArrays(lead.signals.operationalComplexityClues, enrichment.operationalComplexityClues),
      painPointClues: mergeArrays(lead.signals.painPointClues, enrichment.painPointClues),
      hiringSignals: mergeArrays(lead.signals.hiringSignals, enrichment.hiringSignals),
      customerExperienceClues: mergeArrays(lead.signals.customerExperienceClues, enrichment.customerExperienceClues),
      multiChannelPresence: mergeArrays(lead.signals.multiChannelPresence, enrichment.multiChannelPresence),
      teamStructureClues: mergeArrays(lead.signals.teamStructureClues, enrichment.teamStructureClues),
      fragmentedTooling: mergeArrays(lead.signals.fragmentedTooling, enrichment.fragmentedTooling),
      growthIndicators: mergeArrays(lead.signals.growthIndicators, enrichment.growthIndicators),
      storefrontMaturity: enrichment.storefrontMaturity || lead.signals.storefrontMaturity,
    };

    // Update company info if enrichment found new data
    const company = { ...lead.company };
    if (enrichment.companyDescription && !company.description) {
      company.description = enrichment.companyDescription;
    }
    if (enrichment.estimatedProducts.length > 0 && company.products.length === 0) {
      company.products = enrichment.estimatedProducts;
    }

    // Step 2: Generate pain point hypotheses
    const painPointResult = await callLlmJson<PainPointResult>({
      system: PAIN_POINT_SYSTEM_PROMPT,
      prompt: buildPainPointPrompt(JSON.stringify(enrichment, null, 2), lead.segment),
    });

    const painPoints: PainPointHypothesis[] = (painPointResult.painPoints || []).map((pp) => ({
      hypothesis: pp.hypothesis,
      confidence: pp.confidence,
      supportingSignals: pp.supportingSignals || [],
      automationAngle: pp.automationAngle,
      roiAngle: pp.roiAngle,
      relevantUseCases: pp.relevantUseCases || [],
    }));

    const now = new Date().toISOString();
    return {
      ...lead,
      company,
      signals,
      painPoints,
      status: "enriched",
      enrichedAt: now,
      updatedAt: now,
    };
  } catch (err) {
    log.error(`Failed to enrich ${lead.company.name}: ${(err as Error).message}`);
    return { ...lead, status: "enriched", updatedAt: new Date().toISOString() };
  }
}

function mergeArrays(existing: string[], incoming: string[] | undefined): string[] {
  if (!incoming) return existing;
  const set = new Set([...existing, ...incoming]);
  return [...set];
}
