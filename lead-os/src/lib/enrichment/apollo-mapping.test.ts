import { describe, expect, it } from "vitest";
import {
  buildEnrichmentProposal,
  isUsableEmail,
  mapApolloSeniority,
  mapEmployeeRange,
  type ApolloPerson,
} from "./apollo-mapping";
import type { Company, Lead } from "@/db/schema";

const lead = (over: Partial<Lead> = {}): Lead =>
  ({
    id: "led_t",
    fullName: "Sophie Hartley",
    jobTitle: null,
    seniority: "unknown",
    workEmail: null,
    linkedinUrl: null,
    location: null,
    doNotContact: false,
    ...over,
  }) as Lead;

const company = (over: Partial<Company> = {}): Company =>
  ({ id: "com_t", name: "Willow & Wren", website: null, linkedinUrl: null, industry: null, employeeRange: null, revenueRange: null, description: null, ...over }) as Company;

const person = (over: Partial<ApolloPerson> = {}): ApolloPerson => ({
  name: "Sophie Hartley",
  title: "Founder & CEO",
  seniority: "founder",
  email: "sophie@willowandwren.co.uk",
  linkedin_url: "https://linkedin.com/in/sophie-hartley",
  city: "Bristol",
  country: "United Kingdom",
  organization: {
    name: "Willow & Wren",
    website_url: "https://willowandwren-home.co.uk",
    industry: "consumer goods",
    estimated_num_employees: 8,
    annual_revenue_printed: "$1.2M",
    keywords: ["homeware", "dtc", "shopify"],
    short_description: "Sustainable homeware brand.",
  },
  ...over,
});

describe("apollo mapping", () => {
  it("filters Apollo's locked-email placeholders", () => {
    expect(isUsableEmail("email_not_unlocked@domain.com")).toBe(false);
    expect(isUsableEmail(undefined)).toBe(false);
    expect(isUsableEmail("real@brand.co.uk")).toBe(true);
  });

  it("maps seniority from Apollo values and title fallbacks", () => {
    expect(mapApolloSeniority("founder", undefined)).toBe("founder");
    expect(mapApolloSeniority("c_suite", undefined)).toBe("c_level");
    expect(mapApolloSeniority(undefined, "Head of Growth")).toBe("head");
    expect(mapApolloSeniority(undefined, "Marketing Manager")).toBe("manager");
    expect(mapApolloSeniority(undefined, undefined)).toBeNull();
  });

  it("maps employee counts into the app's ranges", () => {
    expect(mapEmployeeRange(1)).toBe("1");
    expect(mapEmployeeRange(8)).toBe("2-10");
    expect(mapEmployeeRange(45)).toBe("11-50");
    expect(mapEmployeeRange(150)).toBe("51-200");
    expect(mapEmployeeRange(900)).toBe("200+");
    expect(mapEmployeeRange(undefined)).toBeNull();
  });

  it("returns no proposal when Apollo found nobody", () => {
    const p = buildEnrichmentProposal(lead(), company(), null);
    expect(p.personFound).toBe(false);
    expect(p.research).toHaveLength(0);
    expect(p.suggestions).toHaveLength(0);
  });

  it("proposes source-attributed research and pre-tickable fills for empty fields", () => {
    const p = buildEnrichmentProposal(lead(), company(), person());
    expect(p.personFound).toBe(true);
    expect(p.research.length).toBeGreaterThanOrEqual(2);
    expect(p.research.every((r) => r.content.length > 0)).toBe(true);
    expect(p.research[0]!.content).toMatch(/Apollo/);

    const fields = Object.fromEntries(p.suggestions.map((s) => [`${s.target}.${s.field}`, s]));
    expect(fields["lead.jobTitle"]!.proposed).toBe("Founder & CEO");
    expect(fields["lead.jobTitle"]!.conflict).toBe(false);
    expect(fields["lead.seniority"]!.proposed).toBe("founder");
    expect(fields["lead.workEmail"]!.proposed).toBe("sophie@willowandwren.co.uk");
    expect(fields["company.employeeRange"]!.proposed).toBe("2-10");
    expect(fields["company.revenueRange"]!.proposed).toMatch(/Apollo estimate/);
  });

  it("flags conflicts instead of overwriting existing data", () => {
    const p = buildEnrichmentProposal(
      lead({ jobTitle: "Owner" }),
      company({ industry: "Ecommerce — homeware" }),
      person(),
    );
    const jt = p.suggestions.find((s) => s.field === "jobTitle")!;
    expect(jt.conflict).toBe(true);
    expect(jt.current).toBe("Owner");
    const ind = p.suggestions.find((s) => s.field === "industry")!;
    expect(ind.conflict).toBe(true);
  });

  it("suggests nothing for values that already match (case-insensitive)", () => {
    const p = buildEnrichmentProposal(lead({ jobTitle: "founder & ceo" }), company(), person());
    expect(p.suggestions.find((s) => s.field === "jobTitle")).toBeUndefined();
  });

  it("never proposes a locked placeholder email", () => {
    const p = buildEnrichmentProposal(lead(), company(), person({ email: "email_not_unlocked@domain.com" }));
    expect(p.suggestions.find((s) => s.field === "workEmail")).toBeUndefined();
  });
});
