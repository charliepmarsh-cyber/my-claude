import { z } from "zod";
import type { Lead } from "../types/index.js";
import { callLlmJson } from "../lib/llm.js";
import { getTemperature } from "./crm.js";

/**
 * Natural-language lead search.
 * An LLM translates the query into a structured filter; a pure function
 * applies the filter. The filter layer is deterministic and unit-testable,
 * and the mock LLM provides a keyword fallback when no API key is set.
 */

export const SearchFilter = z.object({
  status: z.string().optional(),
  tier: z.enum(["A", "B", "C", "D"]).optional(),
  minScore: z.number().optional(),
  minLikelihood: z.number().optional(), // aiAnalysis.likelihoodToBuy
  temperature: z.enum(["hot", "warm", "cold"]).optional(),
  techIncludes: z.array(z.string()).optional(), // match ANY
  techExcludes: z.array(z.string()).optional(), // match NONE
  hiring: z.boolean().optional(),
  keywords: z.array(z.string()).optional(), // match ANY across company/niche/signals
  segment: z.string().optional(),
  limit: z.number().optional(),
});
export type SearchFilter = z.infer<typeof SearchFilter>;

export function applySearchFilters(leads: Lead[], filter: SearchFilter): Lead[] {
  let result = leads;

  if (filter.status) result = result.filter((l) => l.status === filter.status);
  if (filter.segment) result = result.filter((l) => l.segment === filter.segment);
  if (filter.tier) result = result.filter((l) => l.score?.tier === filter.tier);
  if (filter.minScore !== undefined) {
    result = result.filter((l) => (l.score?.finalScore ?? 0) >= filter.minScore!);
  }
  if (filter.minLikelihood !== undefined) {
    result = result.filter((l) => (l.aiAnalysis?.likelihoodToBuy ?? 0) >= filter.minLikelihood!);
  }
  if (filter.temperature) {
    result = result.filter((l) => getTemperature(l) === filter.temperature);
  }
  if (filter.techIncludes?.length) {
    result = result.filter((l) => {
      const stack = l.company.techStack.map((t) => t.toLowerCase());
      return filter.techIncludes!.some((n) => stack.some((t) => t.includes(n.toLowerCase())));
    });
  }
  if (filter.techExcludes?.length) {
    result = result.filter((l) => {
      const stack = l.company.techStack.map((t) => t.toLowerCase());
      return !filter.techExcludes!.some((n) => stack.some((t) => t.includes(n.toLowerCase())));
    });
  }
  if (filter.hiring) {
    result = result.filter((l) => l.signals.hiringSignals.length > 0);
  }
  if (filter.keywords?.length) {
    result = result.filter((l) => {
      const haystack = [
        l.company.name,
        l.company.niche || "",
        l.company.industry || "",
        l.company.description || "",
        ...l.signals.painPointClues,
        ...l.signals.growthIndicators,
        ...l.signals.hiringSignals,
        ...(l.aiAnalysis?.estimatedPainPoints || []),
      ]
        .join(" ")
        .toLowerCase();
      return filter.keywords!.some((k) => haystack.includes(k.toLowerCase()));
    });
  }

  if (filter.limit && filter.limit > 0) result = result.slice(0, filter.limit);
  return result;
}

const NL_SEARCH_SYSTEM_PROMPT = `You are a lead search query translator for a CRM of ecommerce store leads.

Translate the user's natural-language query into a JSON filter. Available fields:
- status: pipeline status (new, enriched, scored, drafted, review_pending, approved, sent, replied, contacted, meeting_booked, demo, proposal, won, lost, follow_up_due)
- tier: "A" | "B" | "C" | "D" (A is best)
- minScore: number 0-100 (lead score)
- minLikelihood: number 0-100 (AI likelihood-to-buy; "likely to buy" → 60+)
- temperature: "hot" | "warm" | "cold"
- techIncludes: array of tech-stack substrings (e.g. ["meta pixel","google ads"] for stores running ads; ["klaviyo"] for email marketing)
- techExcludes: array of tech-stack substrings the lead must NOT have (e.g. attribution tools ["triple whale","northbeam","lifetimely","polar"] for "no attribution" / "poor attribution" / "needs CortexCart" queries)
- hiring: true if the query mentions hiring
- keywords: free-text terms to match against company name/niche/signals
- segment: "shopify" | "ecommerce" | "enterprise"
- limit: max results if the query asks for "top N"

Only set fields the query implies. Output valid JSON only, shape: {"filter": {...}, "interpretation": "one sentence describing what you searched for"}`;

export interface NlSearchResult {
  filter: SearchFilter;
  interpretation: string;
  leads: Lead[];
}

export async function nlSearch(query: string, leads: Lead[]): Promise<NlSearchResult> {
  const response = await callLlmJson<{ filter: unknown; interpretation?: string }>({
    system: NL_SEARCH_SYSTEM_PROMPT,
    prompt: `QUERY: ${query}\n\nJSON:`,
    maxTokens: 512,
  });

  const parsed = SearchFilter.safeParse(response.filter ?? {});
  const filter = parsed.success ? parsed.data : {};

  return {
    filter,
    interpretation: response.interpretation || "Parsed search filter",
    leads: applySearchFilters(leads, filter),
  };
}
