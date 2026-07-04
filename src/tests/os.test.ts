import { describe, it, expect, beforeEach } from "vitest";
import { initDb, saveLead, getAllLeads } from "../storage/database.js";
import { applySearchFilters } from "../os/search.js";
import { setCrmStage, markSent, setTemperature, getTemperature } from "../os/crm.js";
import { extractTechFromText } from "../connectors/lead-mapper.js";
import { createApp } from "../server/index.js";
import type { Lead } from "../types/index.js";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  const now = new Date().toISOString();
  return {
    id: `lead_${Math.random().toString(36).slice(2, 10)}`,
    source: "csv_import",
    segment: "shopify",
    status: "scored",
    company: {
      name: "Test Store",
      website: "teststore.com",
      platform: "Shopify",
      platformIndicators: ["Shopify"],
      niche: "home decor",
      products: [],
      techStack: ["Klaviyo", "Meta Ads"],
    },
    contact: { fullName: "Ada Test", email: "ada@teststore.com" },
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

// ── Tech extraction from notes ──────────────────────────────────

describe("extractTechFromText", () => {
  it("detects tools mentioned in free text", () => {
    const tech = extractTechFromText("Running Meta ads and Google Ads, uses Klaviyo for email");
    expect(tech).toContain("Meta Ads");
    expect(tech).toContain("Google Ads");
    expect(tech).toContain("Klaviyo");
  });

  it("returns empty for text with no known tools", () => {
    expect(extractTechFromText("A lovely little store selling candles")).toEqual([]);
  });
});

// ── Search filter engine ────────────────────────────────────────

describe("applySearchFilters", () => {
  const leads = [
    makeLead({
      company: { name: "Ads Store", platformIndicators: [], products: [], techStack: ["Meta Pixel", "Klaviyo"] },
      score: score(80, "A"),
    }),
    makeLead({
      company: { name: "Attribution Store", platformIndicators: [], products: [], techStack: ["Meta Pixel", "Triple Whale"] },
      score: score(60, "B"),
    }),
    makeLead({
      company: { name: "Quiet Store", niche: "handmade pottery", platformIndicators: [], products: [], techStack: [] },
      score: score(20, "D"),
      tags: ["hot"],
    }),
  ];

  it("filters by tier", () => {
    const r = applySearchFilters(leads, { tier: "A" });
    expect(r).toHaveLength(1);
    expect(r[0].company.name).toBe("Ads Store");
  });

  it("filters by techIncludes and techExcludes (the why-gap query)", () => {
    const r = applySearchFilters(leads, {
      techIncludes: ["pixel"],
      techExcludes: ["triple whale", "northbeam"],
    });
    expect(r).toHaveLength(1);
    expect(r[0].company.name).toBe("Ads Store");
  });

  it("filters by keywords across niche", () => {
    const r = applySearchFilters(leads, { keywords: ["pottery"] });
    expect(r).toHaveLength(1);
    expect(r[0].company.name).toBe("Quiet Store");
  });

  it("filters by temperature tag", () => {
    const r = applySearchFilters(leads, { temperature: "hot" });
    expect(r).toHaveLength(1);
    expect(r[0].company.name).toBe("Quiet Store");
  });

  it("filters by minScore and respects limit", () => {
    expect(applySearchFilters(leads, { minScore: 50 })).toHaveLength(2);
    expect(applySearchFilters(leads, { limit: 1 })).toHaveLength(1);
  });
});

function score(finalScore: number, tier: "A" | "B" | "C" | "D") {
  return {
    fitScore: finalScore, fitFactors: [], opportunityScore: finalScore, opportunityFactors: [],
    urgencyScore: finalScore, urgencyFactors: [], personalizationDepth: finalScore, personalizationFactors: [],
    finalScore, tier, explanation: "test", redFlags: [], excluded: false,
  };
}

// ── CRM stage + temperature ─────────────────────────────────────

describe("crm", () => {
  it("moves an approved lead through the funnel", () => {
    let lead = makeLead({ status: "approved" });
    lead = markSent(lead);
    expect(lead.status).toBe("sent");
    expect(lead.sentAt).toBeTruthy();
    lead = setCrmStage(lead, "contacted");
    lead = setCrmStage(lead, "meeting_booked");
    lead = setCrmStage(lead, "won");
    expect(lead.status).toBe("won");
  });

  it("blocks CRM entry for leads still in the drafting pipeline", () => {
    expect(() => setCrmStage(makeLead({ status: "new" }), "contacted")).toThrow();
    expect(() => markSent(makeLead({ status: "scored" }))).toThrow();
  });

  it("keeps only one temperature tag", () => {
    let lead = makeLead({ tags: ["imported"] });
    lead = setTemperature(lead, "hot");
    lead = setTemperature(lead, "cold");
    expect(getTemperature(lead)).toBe("cold");
    expect(lead.tags.filter((t) => ["hot", "warm", "cold"].includes(t))).toHaveLength(1);
    expect(lead.tags).toContain("imported");
  });
});

// ── Excel/CSV import endpoint ───────────────────────────────────

describe("POST /api/os/import", () => {
  beforeEach(() => {
    initDb(":memory:");
  });

  function upload(content: string, filename: string, runPipeline = "false") {
    const fd = new FormData();
    fd.append("file", new File([content], filename, { type: "text/csv" }));
    fd.append("segment", "shopify");
    fd.append("runPipeline", runPipeline);
    return createApp().request("/api/os/import", { method: "POST", body: fd });
  }

  it("imports a CSV with machine headers", async () => {
    const csv = "company_name,website,contact_name,contact_email,notes\nCandle Co,candleco.com,Amy F,amy@candleco.com,uses Klaviyo and Meta ads\n";
    const res = await upload(csv, "leads.csv");
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.imported).toBe(1);

    const lead = getAllLeads()[0];
    expect(lead.company.name).toBe("Candle Co");
    expect(lead.company.techStack).toContain("Klaviyo");
    expect(lead.company.techStack).toContain("Meta Ads");
  });

  it("maps friendly Excel-style headers and dedupes", async () => {
    const csv = [
      "Company Name,Website,Contact,Role,Email",
      "Trail Gear,trailgear.com,Ben O,CEO,ben@trailgear.com",
      "Trail Gear Again,trailgear.com,Ben O,CEO,ben@trailgear.com",
      ",noname.com,,,",
    ].join("\n");
    const res = await upload(csv, "leads.csv");
    const data = await res.json();
    expect(data.imported).toBe(1);
    expect(data.duplicates).toBe(1);
    expect(data.skipped).toBe(1);
    expect(getAllLeads()[0].contact.fullName).toBe("Ben O");
  });

  it("rejects unsupported file types", async () => {
    const res = await upload("hello", "leads.pdf");
    expect(res.status).toBe(400);
  });

  it("serves the CSV template", async () => {
    const res = await createApp().request("/api/os/import/template");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("company_name");
  });
});
