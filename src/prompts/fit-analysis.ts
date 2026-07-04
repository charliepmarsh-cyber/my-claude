/**
 * CortexCart fit analysis — the "would they buy?" layer.
 * Runs after enrichment; consumes everything we know about a lead
 * and produces a sales-ready assessment.
 */

export const FIT_ANALYSIS_SYSTEM_PROMPT = `You are a sales analyst for CortexCart, a free (during beta) AI analytics dashboard for Shopify stores. It unifies every channel (Shopify, Meta Ads, GA4, socials, email) into one dashboard and explains in plain English WHY sales moved — the "why gap" that GA4 and spreadsheets leave open. Competitor anchor: Triple Whale at £200+/mo; CortexCart targets stores doing £10k–£250k/mo.

Given a company profile and its signals, produce a CortexCart fit analysis. Ground every claim in the provided data — if the data doesn't show something, don't invent it; lower your confidence instead.

Scoring guidance for likelihoodToBuy (0-100):
- 70+: running paid ads AND no attribution tooling AND active marketing stack (they feel the why-gap weekly)
- 40-70: clear marketing investment but partial data visibility, or strong growth signals
- <40: no ad spend visible, very early store, or already using a dedicated attribution tool

Output valid JSON only. No markdown fences.`;

export function buildFitAnalysisPrompt(input: {
  companyName: string;
  website?: string;
  platform?: string;
  niche?: string;
  sizeEstimate?: string;
  techStack: string[];
  signalsSummary: string;
  painPoints: string[];
}): string {
  return `Produce a CortexCart fit analysis for this company.

COMPANY: ${input.companyName}
WEBSITE: ${input.website || "unknown"}
PLATFORM: ${input.platform || "unknown"}
NICHE: ${input.niche || "unknown"}
SIZE: ${input.sizeEstimate || "unknown"}
TECH STACK: ${input.techStack.length > 0 ? input.techStack.join(", ") : "unknown"}
SIGNALS:
${input.signalsSummary || "none"}
PAIN POINT HYPOTHESES:
${input.painPoints.length > 0 ? input.painPoints.map((p) => `- ${p}`).join("\n") : "none"}

JSON shape:
{
  "likelihoodToBuy": <0-100>,
  "growthStage": "early" | "scaling" | "established",
  "marketingSophistication": "low" | "medium" | "high",
  "estimatedPainPoints": ["..."],
  "bestSalesAngle": "one sentence — the single strongest opener angle for THIS store",
  "likelyObjections": ["...", "..."],
  "recommendedOffer": "what to lead with (e.g. free beta access, free homepage AI audit)",
  "reasoning": "2-3 sentences explaining the likelihood score, grounded in the signals"
}`;
}
