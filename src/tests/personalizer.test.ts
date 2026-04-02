import { describe, it, expect } from "vitest";
import { selectPersonalization } from "../personalization/personalizer.js";
import type { Lead } from "../types/index.js";

function makeTestLead(overrides: Partial<Lead> = {}): Lead {
  const now = new Date().toISOString();
  return {
    id: "test_lead",
    source: "csv_import",
    segment: "shopify",
    status: "enriched",
    company: {
      name: "TestCo",
      website: "testco.com",
      platform: "Shopify",
      platformIndicators: [],
      products: [],
      techStack: [],
    },
    contact: {
      fullName: "Jane Doe",
      firstName: "Jane",
      role: "CEO",
    },
    signals: {
      hiringSignals: [],
      recentAnnouncements: [],
      customerExperienceClues: [],
      operationalComplexityClues: [],
      multiChannelPresence: [],
      teamStructureClues: [],
      fragmentedTooling: [],
      growthIndicators: [],
      painPointClues: [],
    },
    painPoints: [],
    outreachDrafts: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("selectPersonalization", () => {
  it("prefers LLM pain points when available", () => {
    const lead = makeTestLead({
      painPoints: [
        {
          hypothesis: "Manual order routing is consuming 15 hours/week",
          confidence: "high",
          supportingSignals: ["15 hours/week on manual order routing"],
          automationAngle: "Automate order routing based on SKU, location, and shipping speed",
          roiAngle: "Save 15 hours/week of manual work",
          relevantUseCases: ["Order routing automation"],
        },
      ],
    });
    const result = selectPersonalization(lead);
    expect(result.source).toBe("llm_enrichment");
    expect(result.painPointHypothesis).toContain("order routing");
  });

  it("falls back to rule-based matching with hiring signals", () => {
    const lead = makeTestLead({
      signals: {
        ...makeTestLead().signals,
        hiringSignals: ["Hiring operations manager"],
      },
    });
    const result = selectPersonalization(lead);
    expect(result.source).toBe("rule_based");
    expect(result.topSignal).toContain("operations");
  });

  it("falls back to segment-based when no signals", () => {
    const lead = makeTestLead();
    const result = selectPersonalization(lead);
    expect(result.source).toBe("segment_fallback");
  });

  it("personalizes differently for enterprise", () => {
    const lead = makeTestLead({ segment: "enterprise" });
    const result = selectPersonalization(lead);
    expect(result.personalizationSentence.toLowerCase()).toContain("enterprise");
  });
});
