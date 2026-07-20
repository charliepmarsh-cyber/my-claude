import { describe, expect, it } from "vitest";
import { DEFAULT_CONTROLS, generateMessage, type GenerationContext } from "./generator";
import type { ScoringInput } from "@/lib/scoring";
import type { Company, Lead, PainHypothesis } from "@/db/schema";

const lead = (over: Partial<Lead> = {}): Lead =>
  ({
    id: "led_t",
    fullName: "Jane Founder",
    preferredName: null,
    warmth: "cold",
    icpCategory: "ecommerce_founder",
    doNotContact: false,
    followUpCount: 0,
    channel: "linkedin",
    completeness: 0,
    currentTools: null,
    ...over,
  }) as Lead;

const company = (over: Partial<Company> = {}): Company =>
  ({ id: "com_t", name: "GlowSkin", description: null, ...over }) as Company;

const pain = (over: Partial<PainHypothesis> = {}): PainHypothesis =>
  ({
    id: "pn_t",
    leadId: "led_t",
    category: "campaign_reporting",
    hypothesis: "Weekly reporting is stitched together by hand.",
    evidence: "Their own post about it",
    evidenceUrl: null,
    confidence: "high",
    impact: "high",
    discoveryQuestion: "What does your weekly reporting routine involve?",
    automationDirection: null,
    humanJudgementNote: null,
    status: "confirmed",
    source: "human",
    createdAt: new Date(),
    ...over,
  }) as PainHypothesis;

const ctx = (input: Partial<ScoringInput>, extra: Partial<GenerationContext> = {}): GenerationContext => ({
  input: { lead: lead(), company: null, research: [], signals: [], pains: [], discovery: null, ...input },
  controls: { ...DEFAULT_CONTROLS },
  senderName: "Charlie Marshall",
  ...extra,
});

describe("outreach generator", () => {
  it("refuses warm messages without a real relationship on record", () => {
    const r = generateMessage("initial_warm", ctx({ lead: lead({ warmth: "warm" }) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing.join(" ")).toMatch(/how you know them/i);
  });

  it("writes a warm message from recorded facts, citing every one", () => {
    const r = generateMessage(
      "initial_warm",
      ctx({
        lead: lead({ warmth: "warm", howKnown: "met at the Manchester meetup", jobTitle: "Founder" }),
        company: company(),
        pains: [pain()],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body).toContain("Jane");
      expect(r.body).toContain("Manchester meetup");
      expect(r.body).toContain("GlowSkin");
      expect(r.body.toLowerCase()).toContain("what does your weekly reporting routine involve?");
      expect(r.body.endsWith("Charlie")).toBe(true);
      expect(r.evidenceUsed.length).toBeGreaterThanOrEqual(3);
      expect(r.evidenceUsed.join(" ")).toMatch(/meetup/);
    }
  });

  it("refuses cold messages with no recognition data — never invents personalisation", () => {
    const r = generateMessage("initial_cold", ctx({ lead: lead({ jobTitle: null }) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing.join(" ")).toMatch(/spam|recognition/i);
  });

  it("redirects sales messages for peers to the peer type", () => {
    const r = generateMessage("initial_cold", ctx({ lead: lead({ icpCategory: "ai_automation_specialist", jobTitle: "AI Consultant" }) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.suggestion).toMatch(/peer/i);
  });

  it("blocks everything for do-not-contact leads", () => {
    const r = generateMessage("insight_seeking", ctx({ lead: lead({ doNotContact: true }) }));
    expect(r.ok).toBe(false);
  });

  it("gates the case-study proposal behind a confirmed problem", () => {
    const no = generateMessage("case_study_proposal", ctx({ lead: lead({ warmth: "warm" }) }));
    expect(no.ok).toBe(false);
    const yes = generateMessage("case_study_proposal", ctx({ lead: lead({ warmth: "warm" }), pains: [pain()] }));
    expect(yes.ok).toBe(true);
    if (yes.ok) expect(yes.body).toContain("no cost");
  });

  it("requires a logged reply before drafting reply responses", () => {
    const r = generateMessage("reply_positive", ctx({}));
    expect(r.ok).toBe(false);
    const withReply = generateMessage("reply_positive", ctx({}, { lastInboundText: "Great question — honestly it's reporting." }));
    expect(withReply.ok).toBe(true);
  });

  it("requires a previous sent message before a follow-up, then references it without guilt", () => {
    const no = generateMessage("follow_up_1", ctx({}));
    expect(no.ok).toBe(false);
    const yes = generateMessage("follow_up_1", ctx({ lead: lead({ jobTitle: "Founder" }) }, { lastOutbound: { body: "x", msgType: "initial_cold", sentAt: new Date() } }));
    expect(yes.ok).toBe(true);
    if (yes.ok) {
      expect(yes.body).not.toMatch(/urgent|last chance|final offer/i);
      expect(yes.body).toMatch(/not for me/);
    }
  });

  it("keeps short messages genuinely short", () => {
    const r = generateMessage(
      "initial_cold",
      ctx({ lead: lead({ jobTitle: "Founder" }), company: company({ description: "sells skincare to UK customers" }), signals: [], pains: [pain({ status: "proposed" })] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const paragraphs = r.body.split("\n\n");
      expect(paragraphs.length).toBeLessThanOrEqual(6); // greeting + ≤3 body + signoff
    }
  });
});
