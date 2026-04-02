import { describe, it, expect, beforeEach } from "vitest";
import { runPipeline } from "../pipelines/main-pipeline.js";
import { initDb, getAllLeads } from "../storage/database.js";
import type { Lead } from "../types/index.js";

function makeSampleLeads(): Lead[] {
  const now = new Date().toISOString();
  return [
    {
      id: "lead_test_shopify",
      source: "csv_import",
      segment: "shopify",
      status: "new",
      company: {
        name: "TestShop Beauty",
        website: "testshopbeauty.com",
        platform: "Shopify",
        platformIndicators: ["Shopify Plus"],
        industry: "Beauty",
        sizeEstimate: "10-20",
        products: ["serums", "moisturizers", "cleansers", "masks", "toners"],
        techStack: ["Shopify Plus", "Klaviyo", "ShipStation"],
      },
      contact: {
        fullName: "Sarah Kim",
        firstName: "Sarah",
        lastName: "Kim",
        role: "Founder",
        email: "sarah@testshopbeauty.com",
        linkedinUrl: "https://linkedin.com/in/sarahkim",
      },
      signals: {
        hiringSignals: ["Hiring fulfillment coordinator"],
        recentAnnouncements: [],
        customerExperienceClues: [],
        operationalComplexityClues: ["Multi-channel operations"],
        multiChannelPresence: ["Shopify", "Amazon"],
        teamStructureClues: [],
        fragmentedTooling: ["Klaviyo", "ShipStation", "Recharge"],
        growthIndicators: ["Recent product launch"],
        painPointClues: ["Manual order routing", "Spreadsheet-based reporting"],
        rawNotes: "Shopify Plus store with manual order routing and hiring for fulfillment",
      },
      painPoints: [],
      outreachDrafts: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "lead_test_enterprise",
      source: "csv_import",
      segment: "enterprise",
      status: "new",
      company: {
        name: "MegaCorp Logistics",
        website: "megacorplogistics.com",
        platform: "",
        platformIndicators: [],
        industry: "Logistics",
        sizeEstimate: "500-1000",
        products: ["3PL fulfillment", "warehousing"],
        techStack: ["Legacy WMS"],
      },
      contact: {
        fullName: "David Park",
        firstName: "David",
        role: "VP Operations",
        email: "dpark@megacorplogistics.com",
        linkedinUrl: "https://linkedin.com/in/davidpark",
      },
      signals: {
        hiringSignals: ["Hiring CTO", "Hiring Head of Automation"],
        recentAnnouncements: ["Digital transformation initiative"],
        customerExperienceClues: [],
        operationalComplexityClues: ["10 warehouses", "Legacy WMS system"],
        multiChannelPresence: [],
        teamStructureClues: ["500+ employees"],
        fragmentedTooling: ["Legacy WMS", "Manual reporting"],
        growthIndicators: ["Digital transformation", "Recent acquisition"],
        painPointClues: ["Manual carrier rate shopping", "Legacy systems 8 years old"],
        rawNotes: "Large logistics company with legacy WMS, hiring CTO, digital transformation underway",
      },
      painPoints: [],
      outreachDrafts: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

describe("runPipeline (end-to-end with mock LLM)", () => {
  beforeEach(() => {
    // Use in-memory database for testing
    initDb(":memory:");
  });

  it("processes leads through the full pipeline", async () => {
    const leads = makeSampleLeads();
    const result = await runPipeline(leads);

    expect(result.total).toBe(2);
    expect(result.errors).toBe(0);
    expect(result.enriched).toBe(2);
    expect(result.scored).toBe(2);
    expect(result.leads.length).toBe(2);
  }, 30000);

  it("deduplicates identical leads", async () => {
    const leads = makeSampleLeads();
    const duped = [...leads, { ...leads[0] }]; // duplicate first lead
    const result = await runPipeline(duped);

    expect(result.total).toBe(3);
    expect(result.deduplicated).toBe(1);
  }, 30000);

  it("respects dry-run mode", async () => {
    const leads = makeSampleLeads();
    await runPipeline(leads, { dryRun: true });

    // Nothing should be saved in dry-run
    const saved = getAllLeads();
    expect(saved.length).toBe(0);
  }, 30000);

  it("skips drafting for low-score leads when configured", async () => {
    const leads = makeSampleLeads();
    const result = await runPipeline(leads, { minScoreForDrafting: 99 });

    // With a 99 threshold, most leads should skip drafting
    // but still be enriched and scored
    expect(result.enriched).toBe(2);
    expect(result.scored).toBe(2);
  }, 30000);

  it("skips enrichment when disabled", async () => {
    const leads = makeSampleLeads();
    const result = await runPipeline(leads, { enrichmentEnabled: false });

    expect(result.enriched).toBe(0);
    expect(result.scored).toBe(2);
  }, 30000);

  it("produces outreach drafts with quality scores", async () => {
    const leads = makeSampleLeads();
    const result = await runPipeline(leads);

    const draftedLeads = result.leads.filter((l) => l.outreachDrafts.length > 0);
    for (const lead of draftedLeads) {
      for (const draft of lead.outreachDrafts) {
        // Every draft should have been validated
        expect(draft.qualityScore).toBeDefined();
        expect(typeof draft.qualityScore).toBe("number");
      }
    }
  }, 30000);

  it("generates follow-up emails when email channel is included", async () => {
    const leads = makeSampleLeads();
    const result = await runPipeline(leads, { channels: ["email"] });

    const draftedLeads = result.leads.filter((l) => l.outreachDrafts.length > 0);
    for (const lead of draftedLeads) {
      const followUps = lead.outreachDrafts.filter(
        (d) => d.messageType === "email_follow_up_1" || d.messageType === "email_follow_up_2"
      );
      // Should have generated follow-ups
      expect(followUps.length).toBeGreaterThan(0);
    }
  }, 30000);

  it("stores leads in the database", async () => {
    const leads = makeSampleLeads();
    await runPipeline(leads);

    const stored = getAllLeads();
    expect(stored.length).toBe(2);
    // Should be in review_pending status after full pipeline
    for (const lead of stored) {
      expect(["review_pending", "scored", "not_a_fit"]).toContain(lead.status);
    }
  }, 30000);
});
