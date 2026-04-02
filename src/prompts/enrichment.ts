/**
 * Prompts for LLM-powered lead enrichment.
 * Each prompt is designed to produce structured JSON output
 * grounded in provided public data — no hallucination.
 */

export const ENRICHMENT_SYSTEM_PROMPT = `You are a business analyst assistant. Your job is to analyze publicly available company information and extract structured insights.

RULES:
- Only use information explicitly provided in the input. Do NOT invent or guess facts.
- If a field cannot be determined from the input, set it to null or an empty array.
- Be specific and concise. Prefer short phrases over sentences.
- Focus on operational signals: complexity, manual processes, growth, tooling, team structure.
- Output valid JSON matching the requested schema exactly.`;

export function buildEnrichmentPrompt(lead: {
  companyName: string;
  website?: string;
  platform?: string;
  industry?: string;
  sizeEstimate?: string;
  contactRole?: string;
  notes?: string;
}): string {
  return `Analyze this company based on the provided information and extract structured enrichment data.

COMPANY DATA:
- Name: ${lead.companyName}
- Website: ${lead.website || "unknown"}
- Platform: ${lead.platform || "unknown"}
- Industry: ${lead.industry || "unknown"}
- Size estimate: ${lead.sizeEstimate || "unknown"}
- Contact role: ${lead.contactRole || "unknown"}
- Additional notes: ${lead.notes || "none"}

Extract the following as JSON:

{
  "companyDescription": "1-2 sentence description based on available info, or null",
  "estimatedProducts": ["list of product categories if determinable"],
  "operationalComplexityClues": ["specific clues about operational complexity from the data"],
  "painPointClues": ["specific potential pain points based on size, platform, industry"],
  "hiringSignals": ["any hiring-related signals from notes or context"],
  "customerExperienceClues": ["clues about CX operations or challenges"],
  "multiChannelPresence": ["channels they appear to sell/operate on"],
  "teamStructureClues": ["clues about team structure or org complexity"],
  "fragmentedTooling": ["signs of disconnected tools or manual integrations"],
  "growthIndicators": ["signs of recent or ongoing growth"],
  "storefrontMaturity": "early | growing | mature | enterprise — based on signals",
  "automationOpportunities": [
    {
      "area": "e.g., order fulfillment, customer support, reporting",
      "hypothesis": "specific automation opportunity",
      "confidence": "high | medium | low",
      "roiAngle": "how automation would save time/money"
    }
  ]
}

Only include items you can reasonably infer from the provided data. Do not fabricate specifics.`;
}

export const PAIN_POINT_SYSTEM_PROMPT = `You are a business operations analyst. Given enrichment data about a company, identify the most likely pain points that workflow automation could address.

RULES:
- Ground every hypothesis in specific signals from the data.
- Rank by confidence (high/medium/low).
- Be specific about the automation angle — not generic.
- Output valid JSON.`;

export function buildPainPointPrompt(enrichmentData: string, segment: string): string {
  return `Based on this enrichment data for a ${segment} company, identify the top 3 pain point hypotheses.

ENRICHMENT DATA:
${enrichmentData}

For each pain point, provide:
{
  "painPoints": [
    {
      "hypothesis": "specific pain point statement",
      "confidence": "high | medium | low",
      "supportingSignals": ["signal1", "signal2"],
      "automationAngle": "specific automation solution",
      "roiAngle": "concrete ROI argument",
      "relevantUseCases": ["use case 1", "use case 2"]
    }
  ]
}

Prioritize pain points that:
1. Have the strongest signal support
2. Map clearly to workflow automation solutions
3. Would resonate with someone in their role/segment`;
}
