import { describe, it, expect } from "vitest";
import { scoreLead } from "../scoring/scorer.js";
import type { Lead } from "../types/index.js";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  const now = new Date().toISOString();
  return {
    id: "test_lead",
    source: "csv_import",
    segment: "shopify",
    status: "enriched",
    company: {
      name: "Test Co",
      website: "test.com",
      platform: "Shopify",
      platformIndicators: ["Shopify"],
      industry: "Retail",
      sizeEstimate: "10-20",
      products: ["product1", "product2", "product3", "product4", "product5"],
      techStack: ["Shopify", "Klaviyo", "ShipStation", "Gorgias", "Recharge"],
    },
    contact: {
      fullName: "Jane Test",
      firstName: "Jane",
      role: "CEO",
      email: "jane@test.com",
      linkedinUrl: "https://linkedin.com/in/janetest",
    },
    signals: {
      hiringSignals: ["Hiring fulfillment coordinator"],
      recentAnnouncements: [],
      customerExperienceClues: [],
      operationalComplexityClues: ["Multi-channel operations"],
      multiChannelPresence: ["Shopify", "Amazon"],
      teamStructureClues: [],
      fragmentedTooling: ["Klaviyo", "ShipStation", "Gorgias"],
      growthIndicators: ["Recent product launch"],
      painPointClues: ["Manual order routing", "Spreadsheet reporting"],
      rawNotes: "",
    },
    painPoints: [],
    outreachDrafts: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("scoreLead", () => {
  it("scores a well-qualified Shopify lead as tier A or B", () => {
    const lead = makeLead();
    const score = scoreLead(lead);

    expect(score.finalScore).toBeGreaterThan(40);
    expect(["A", "B"]).toContain(score.tier);
    expect(score.excluded).toBe(false);
    expect(score.fitFactors.length).toBeGreaterThan(0);
    expect(score.opportunityFactors.length).toBeGreaterThan(0);
  });

  it("excludes leads with no company name", () => {
    const lead = makeLead({
      company: { ...makeLead().company, name: "" },
    });
    const score = scoreLead(lead);
    expect(score.excluded).toBe(true);
    expect(score.tier).toBe("D");
  });

  it("flags leads with shutting down signals", () => {
    const lead = makeLead({
      signals: {
        ...makeLead().signals,
        recentAnnouncements: ["Company is shutting down operations"],
      },
    });
    const score = scoreLead(lead);
    expect(score.excluded).toBe(true);
  });

  it("gives lower scores to leads with no signals", () => {
    const sparseLeadData = makeLead({
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
        rawNotes: "",
      },
    });
    const score = scoreLead(sparseLeadData);
    expect(score.finalScore).toBeLessThan(50);
    expect(score.redFlags.length).toBeGreaterThan(0);
  });

  it("scores enterprise leads correctly", () => {
    const lead = makeLead({
      segment: "enterprise",
      company: {
        ...makeLead().company,
        sizeEstimate: "500-1000",
        platform: "",
        platformIndicators: [],
      },
      signals: {
        ...makeLead().signals,
        hiringSignals: ["Hiring CTO", "Hiring Head of Automation"],
        operationalComplexityClues: ["12 warehouses", "200+ clients", "Legacy WMS"],
        painPointClues: ["Manual reporting", "Legacy systems 8 years old"],
        growthIndicators: ["Recent acquisition", "Digital transformation"],
      },
    });
    const score = scoreLead(lead);
    expect(score.finalScore).toBeGreaterThan(30);
    expect(score.opportunityFactors.length).toBeGreaterThan(0);
  });

  it("includes personalization depth in the score", () => {
    const fullLead = makeLead();
    const sparseLead = makeLead({
      company: { ...makeLead().company, description: undefined, website: undefined },
      contact: { fullName: undefined, firstName: undefined, role: undefined },
      signals: { ...makeLead().signals, painPointClues: [], hiringSignals: [] },
    });

    const fullScore = scoreLead(fullLead);
    const sparseScore = scoreLead(sparseLead);

    expect(fullScore.personalizationDepth).toBeGreaterThan(sparseScore.personalizationDepth);
  });
});
