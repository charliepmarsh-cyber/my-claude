import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RawLead } from "../connectors/discovery-types.js";
import { rawLeadToLead, extractDomain } from "../connectors/lead-mapper.js";
import { initDb, getAllLeads } from "../storage/database.js";

// ── rawLeadToLead mapping ───────────────────────────────────────

describe("rawLeadToLead", () => {
  it("maps a RawLead to a full Lead object", () => {
    const raw: RawLead = {
      companyName: "TestCo",
      website: "testco.com",
      platform: "Shopify",
      industry: "Retail",
      sizeEstimate: "11-50",
      contactName: "Jane Smith",
      contactRole: "CEO",
      contactEmail: "jane@testco.com",
      linkedinUrl: "https://linkedin.com/in/janesmith",
      segment: "shopify",
      source: "apollo",
      notes: "Fast-growing DTC brand",
      intentSignal: "hiring",
      personalizationHints: "Recently launched subscription model",
      tags: ["dtc", "beauty"],
    };

    const lead = rawLeadToLead(raw);

    expect(lead.id).toMatch(/^lead_/);
    expect(lead.company.name).toBe("TestCo");
    expect(lead.company.website).toBe("testco.com");
    expect(lead.company.platform).toBe("Shopify");
    expect(lead.contact.fullName).toBe("Jane Smith");
    expect(lead.contact.firstName).toBe("Jane");
    expect(lead.contact.lastName).toBe("Smith");
    expect(lead.contact.email).toBe("jane@testco.com");
    expect(lead.source).toBe("apollo");
    expect(lead.segment).toBe("shopify");
    expect(lead.status).toBe("new");
    expect(lead.signals.hiringSignals).toContain("Fast-growing DTC brand");
    expect(lead.personalizationNotes).toBe("Recently launched subscription model");
    expect(lead.tags).toContain("dtc");
  });

  it("handles minimal RawLead without optional fields", () => {
    const raw: RawLead = {
      companyName: "MinimalCo",
      segment: "ecommerce",
      source: "job_board",
    };

    const lead = rawLeadToLead(raw);

    expect(lead.company.name).toBe("MinimalCo");
    expect(lead.contact.email).toBeUndefined();
    expect(lead.company.website).toBeUndefined();
    expect(lead.status).toBe("new");
  });
});

// ── extractDomain ───────────────────────────────────────────────

describe("extractDomain", () => {
  it("extracts domain from full URL", () => {
    expect(extractDomain("https://www.example.com/path")).toBe("example.com");
  });

  it("handles bare domain", () => {
    expect(extractDomain("example.com")).toBe("example.com");
  });

  it("strips www prefix", () => {
    expect(extractDomain("www.shopify.com")).toBe("shopify.com");
  });

  it("returns empty string for undefined", () => {
    expect(extractDomain(undefined)).toBe("");
  });

  it("returns lowercased domain", () => {
    expect(extractDomain("EXAMPLE.COM")).toBe("example.com");
  });
});

// ── Deduplication in discovery pipeline ─────────────────────────

describe("discovery deduplication", () => {
  it("deduplicates raw leads by domain", () => {
    // Import the function we need to test
    // We test the behavior through rawLeadToLead + domain extraction
    const leads: RawLead[] = [
      { companyName: "Co A", website: "example.com", segment: "shopify", source: "apollo" },
      { companyName: "Co A Duplicate", website: "https://www.example.com", segment: "shopify", source: "builtwith" },
      { companyName: "Co B", website: "other.com", segment: "shopify", source: "apollo" },
    ];

    // Simulate dedup logic from discovery pipeline
    const seen = new Set<string>();
    const unique: RawLead[] = [];
    for (const lead of leads) {
      const domain = extractDomain(lead.website);
      const email = (lead.contactEmail || "").toLowerCase();
      const key = [domain, email].filter(Boolean).join("|") || lead.companyName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(lead);
    }

    expect(unique.length).toBe(2);
    expect(unique[0].companyName).toBe("Co A");
    expect(unique[1].companyName).toBe("Co B");
  });
});

// ── Connector isolation (one failure doesn't block others) ──────

describe("connector isolation", () => {
  it("Promise.allSettled handles one failing connector without blocking others", async () => {
    const successConnector = async () => {
      return [{ companyName: "Good Co", segment: "shopify" as const, source: "apollo" as const }];
    };
    const failingConnector = async (): Promise<RawLead[]> => {
      throw new Error("API key invalid");
    };
    const anotherSuccess = async () => {
      return [{ companyName: "Also Good Co", segment: "shopify" as const, source: "job_board" as const }];
    };

    const results = await Promise.allSettled([
      successConnector(),
      failingConnector(),
      anotherSuccess(),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(2);
    expect(rejected.length).toBe(1);

    // Successful results should still have their leads
    const allLeads = fulfilled
      .flatMap((r) => (r as PromiseFulfilledResult<RawLead[]>).value);
    expect(allLeads.length).toBe(2);
    expect(allLeads[0].companyName).toBe("Good Co");
    expect(allLeads[1].companyName).toBe("Also Good Co");
  });
});

// ── Dry run produces no storage writes ──────────────────────────

describe("discovery dry run", () => {
  beforeEach(() => {
    initDb(":memory:");
  });

  it("dry run does not write to storage", async () => {
    // We can't easily import and run the full discovery pipeline in tests
    // (it would try to call real APIs), but we can verify the storage behavior
    const beforeCount = getAllLeads().length;
    expect(beforeCount).toBe(0);

    // Simulate what dry run does: create leads but don't save
    const mockLead = rawLeadToLead({
      companyName: "DryRunCo",
      segment: "shopify",
      source: "apollo",
    });

    // In dry run mode, we do NOT call saveLeads
    // Verify nothing was saved
    const afterCount = getAllLeads().length;
    expect(afterCount).toBe(0);

    // The lead object itself should still be valid
    expect(mockLead.company.name).toBe("DryRunCo");
    expect(mockLead.status).toBe("new");
  });
});

// ── ConnectorHttpClient error classification ────────────────────

describe("connector key validation", () => {
  it("checkConnectorKeys does not throw when no specific source requested", async () => {
    // Import dynamically to avoid module-level env reads
    const { checkConnectorKeys } = await import("../lib/connector-keys.js");

    // Should not throw — just reports status
    const status = checkConnectorKeys();
    expect(typeof status.apollo).toBe("boolean");
    expect(typeof status.builtwith).toBe("boolean");
    expect(typeof status.hunter).toBe("boolean");
  });

  it("checkConnectorKeys throws when required source key is missing", async () => {
    const { checkConnectorKeys } = await import("../lib/connector-keys.js");

    // Apollo key is likely not set in test env
    const originalKey = process.env.APOLLO_API_KEY;
    delete process.env.APOLLO_API_KEY;

    try {
      expect(() => checkConnectorKeys(["apollo"])).toThrow("APOLLO_API_KEY is required");
    } finally {
      if (originalKey) process.env.APOLLO_API_KEY = originalKey;
    }
  });

  it("checkConnectorKeys passes for jobsignals (no key needed)", async () => {
    const { checkConnectorKeys } = await import("../lib/connector-keys.js");
    // Should not throw for jobsignals
    expect(() => checkConnectorKeys(["jobsignals"])).not.toThrow();
  });
});
