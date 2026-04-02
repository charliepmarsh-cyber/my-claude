import { describe, it, expect } from "vitest";
import { validateLead, validateDraft, detectDuplicateMessages } from "../quality/validator.js";
import type { Lead, OutreachDraft } from "../types/index.js";

function makeDraft(overrides: Partial<OutreachDraft> = {}): OutreachDraft {
  return {
    channel: "email",
    messageType: "email_first_touch",
    subject: "Quick question about your ops workflow",
    body: "Hi Maya, I noticed GlowBean recently launched subscription boxes — that usually adds meaningful fulfillment complexity. We help Shopify brands automate order routing and fulfillment workflows. Would a 15-min call make sense?",
    personalizationSnippet: "launched subscription boxes",
    signalUsed: "subscription launch",
    qualityIssues: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("validateDraft", () => {
  it("passes a clean, well-personalized draft", () => {
    const result = validateDraft(makeDraft());
    expect(result.valid).toBe(true);
    expect(result.overallScore).toBeGreaterThan(70);
  });

  it("catches spam phrases", () => {
    const result = validateDraft(makeDraft({ body: "This is a game-changer that will 10x your growth!" }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "spam_check")).toBe(true);
  });

  it("catches generic phrases", () => {
    const result = validateDraft(makeDraft({ body: "I hope this email finds you well. We help businesses like yours grow." }));
    expect(result.issues.some((i) => i.rule === "generic_check")).toBe(true);
  });

  it("catches unverifiable claims", () => {
    const result = validateDraft(makeDraft({ body: "I've used your product and I'm a huge fan of what you're building!" }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "claim_check")).toBe(true);
  });

  it("flags missing email subject", () => {
    const result = validateDraft(makeDraft({ subject: undefined }));
    expect(result.issues.some((i) => i.message.includes("subject"))).toBe(true);
  });

  it("flags overly long LinkedIn connection notes", () => {
    const result = validateDraft(makeDraft({
      messageType: "linkedin_connection_note",
      body: "x".repeat(350),
    }));
    expect(result.issues.some((i) => i.rule === "length_check")).toBe(true);
  });

  it("flags weak personalization", () => {
    const result = validateDraft(makeDraft({ personalizationSnippet: "" }));
    expect(result.issues.some((i) => i.rule === "personalization_check")).toBe(true);
  });
});

describe("detectDuplicateMessages", () => {
  it("detects highly similar drafts", () => {
    const d1 = makeDraft({ body: "Hi Maya, I noticed your store has grown a lot recently." });
    const d2 = makeDraft({ body: "Hi Maya, I noticed your store has grown a lot recently. Congrats!" });
    const issues = detectDuplicateMessages([d1, d2]);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("allows different drafts", () => {
    const d1 = makeDraft({ body: "Hi Maya, your subscription launch caught my eye." });
    const d2 = makeDraft({ body: "James, congrats on the Series A. Multi-warehouse ops are tricky." });
    const issues = detectDuplicateMessages([d1, d2]);
    expect(issues.length).toBe(0);
  });
});
