import { describe, expect, it } from "vitest";
import { computeCompleteness, computeOverall, computeScoreSet, computeScores, suggestPriority } from "./scoring";
import { DEFAULT_SETTINGS } from "./constants";
import type { Company, Lead } from "@/db/schema";

const baseLead = (over: Partial<Lead> = {}): Lead =>
  ({
    id: "led_test",
    fullName: "Test Person",
    preferredName: null,
    pronouns: null,
    linkedinUrl: null,
    avatarUrl: null,
    workEmail: null,
    personalEmail: null,
    phone: null,
    location: null,
    timezone: null,
    jobTitle: null,
    seniority: "unknown",
    department: null,
    decisionAuthority: "unknown",
    isFounder: false,
    yearsInRole: null,
    previousRoles: null,
    companyId: null,
    source: null,
    warmth: "cold",
    connectionDegree: "unknown",
    howKnown: null,
    relationshipStrength: null,
    referrer: null,
    sharedConnections: null,
    sharedGroups: null,
    trustIndicators: null,
    lastInteractionAt: null,
    interactionCount: 0,
    icpCategory: "other",
    recommendedAngle: null,
    aiSummary: null,
    notes: null,
    likelyObjections: null,
    currentTools: null,
    status: "imported",
    priorityLabel: null,
    channel: "linkedin",
    lastContactedAt: null,
    nextAction: null,
    nextActionDue: null,
    followUpCount: 0,
    replySentiment: null,
    conversationStage: null,
    meetingStatus: "none",
    opportunityValue: null,
    probability: null,
    proposedService: null,
    caseStudySuitability: null,
    paidSuitability: null,
    retainerSuitability: null,
    referralPotential: null,
    strategicValue: null,
    dataSource: "manual",
    doNotContact: false,
    suppressionReason: null,
    completeness: 0,
    overallScore: null,
    duplicateOfId: null,
    closedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  }) as Lead;

const baseCompany = (over: Partial<Company> = {}): Company =>
  ({
    id: "com_test",
    name: "Test Co",
    website: null,
    linkedinUrl: null,
    description: null,
    industry: null,
    subIndustry: null,
    employeeRange: null,
    revenueRange: null,
    ecommercePlatform: null,
    shopifyStatus: "unknown",
    otherTechnologies: null,
    businessModel: "unknown",
    salesChannels: null,
    markets: null,
    dataSource: "manual",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  }) as Company;

const emptyInput = (lead: Lead, company: Company | null = null) => ({
  lead,
  company,
  research: [],
  signals: [],
  pains: [],
  discovery: null,
});

describe("scoring engine", () => {
  it("gives an empty record low scores with missing-info lines everywhere", () => {
    const set = computeScores(emptyInput(baseLead()));
    expect(set.icp_fit.value).toBeLessThan(20);
    expect(set.pain_probability.value).toBe(0);
    const missing = set.icp_fit.breakdown.filter((l) => l.missing);
    expect(missing.length).toBeGreaterThan(2);
  });

  it("scores a strong ecommerce founder with Shopify high on ICP fit", () => {
    const lead = baseLead({ icpCategory: "ecommerce_founder" });
    const company = baseCompany({ shopifyStatus: "shopify", businessModel: "dtc", employeeRange: "2-10", industry: "Ecommerce — homeware", description: "Sells things" });
    const set = computeScores(emptyInput(lead, company));
    expect(set.icp_fit.value).toBeGreaterThanOrEqual(85);
  });

  it("caps every dimension at 100 and floors at 0", () => {
    const lead = baseLead({
      icpCategory: "ecommerce_founder",
      isFounder: true,
      seniority: "founder",
      decisionAuthority: "decision_maker",
      jobTitle: "Founder",
      warmth: "warm",
      connectionDegree: "1st",
      relationshipStrength: 5,
      referrer: "A friend",
      sharedConnections: "Many",
      linkedinUrl: "linkedin.com/in/x",
      lastInteractionAt: new Date(),
    });
    const set = computeScores(emptyInput(lead));
    for (const dim of Object.values(set)) {
      expect(dim.value).toBeGreaterThanOrEqual(0);
      expect(dim.value).toBeLessThanOrEqual(100);
    }
    expect(set.authority.value).toBe(100);
  });

  it("every breakdown line's points are traceable and sum to the (unclamped) total", () => {
    const lead = baseLead({ icpCategory: "email_marketer", jobTitle: "Email lead" });
    const set = computeScores(emptyInput(lead));
    for (const r of Object.values(set)) {
      const sum = r.breakdown.reduce((a, l) => a + l.points, 0);
      expect(r.value).toBe(Math.max(0, Math.min(100, Math.round(sum))));
    }
  });

  it("weighted overall respects weights", () => {
    const dims = Object.fromEntries(
      ["icp_fit", "pain_probability", "urgency", "authority", "accessibility", "automation_feasibility", "case_study_potential", "paid_opportunity", "strategic_relationship", "data_confidence"].map((d) => [d, { value: 50 }]),
    ) as never;
    const overall = computeOverall(dims, DEFAULT_SETTINGS.scoreWeights);
    expect(overall.value).toBe(50);
    expect(overall.breakdown).toHaveLength(10);
  });

  it("suggests do_not_contact when the flag is set, regardless of score", () => {
    const lead = baseLead({ doNotContact: true, icpCategory: "ecommerce_founder" });
    const input = emptyInput(lead);
    const set = computeScoreSet(input, DEFAULT_SETTINGS.scoreWeights);
    expect(suggestPriority(input, set).label).toBe("do_not_contact");
  });

  it("treats AI specialists as peers, never P1 prospects", () => {
    const lead = baseLead({ icpCategory: "ai_automation_specialist", warmth: "warm", connectionDegree: "1st" });
    const input = emptyInput(lead);
    const set = computeScoreSet(input, DEFAULT_SETTINGS.scoreWeights);
    expect(suggestPriority(input, set).label).toBe("peer_collaborator");
  });

  it("completeness increases as fields fill", () => {
    const empty = computeCompleteness(baseLead(), null);
    const fuller = computeCompleteness(
      baseLead({ jobTitle: "Founder", linkedinUrl: "x", icpCategory: "ecommerce_founder", source: "LinkedIn", location: "UK", decisionAuthority: "decision_maker", seniority: "founder", notes: "Notes" }),
      baseCompany({ website: "x.com", industry: "Ecommerce", employeeRange: "2-10", shopifyStatus: "shopify" }),
    );
    expect(empty).toBeLessThan(20);
    expect(fuller).toBeGreaterThan(80);
  });
});
