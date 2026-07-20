import { describe, expect, it } from "vitest";
import { analyseReply } from "./reply-analysis";

describe("conservative reply classifier", () => {
  it("never reads a polite thanks as buying intent", () => {
    const r = analyseReply("Thanks! Appreciate it.");
    expect(r.classification).toBe("neutral");
    expect(r.confidence).toBe("low");
  });

  it("reads 'sounds good, will have a think' as vague, not positive", () => {
    const r = analyseReply("Sounds good, will have a think and maybe get back to you at some point.");
    expect(["vague", "neutral"]).toContain(r.classification);
    expect(r.recommendation).not.toBe("propose_action");
  });

  it("classifies a specific described problem as qualified (medium confidence max)", () => {
    const r = analyseReply(
      "Honestly the biggest one is reporting — every Friday we export CSVs from Shopify and Meta and stitch them together in Google Sheets, takes hours and something always breaks.",
    );
    expect(r.classification).toBe("qualified_problem");
    expect(r.confidence).toBe("medium");
    expect(r.toolsMentioned).toContain("shopify");
    expect(r.explicitProblem).toBeTruthy();
    expect(r.recommendation).toBe("continue_discovery");
  });

  it("detects the tool-fragmentation shape as qualified with tools extracted", () => {
    const r = analyseReply(
      "It's not one repetitive task — nothing talks to each other. Meta, GA4 and the client's Shopify all disagree, so I'm manually stitching four exports in Sheets before I can say anything useful. The judgement part I want to keep.",
    );
    expect(r.classification).toBe("qualified_problem");
    expect(r.humanJudgementAreas).toBeTruthy();
  });

  it("classifies practitioner exchange as peer discussion and recommends treating as peer", () => {
    const r = analyseReply(
      "Always up for comparing notes. Agent orchestration is powerful but in my experience every deployment needs a human checkpoint before anything touches a customer. My clients struggle most with scoping.",
      { isPeer: true },
    );
    expect(r.classification).toBe("peer_discussion");
    expect(r.recommendation).toBe("treat_as_peer");
  });

  it("classifies an explicit decline as objection and recommends closing politely", () => {
    const r = analyseReply("Thanks but we're all sorted — we already have someone handling this and I'm not interested.");
    expect(r.classification).toBe("objection");
    expect(r.recommendation).toBe("close_politely");
  });

  it("classifies timing pushback as not_now → nurture", () => {
    const r = analyseReply("Genuinely interesting but not right now — we're swamped until after peak. Come back to me in a few months?");
    expect(r.classification).toBe("not_now");
    expect(r.recommendation).toBe("nurture");
  });

  it("classifies a hand-off as referral", () => {
    const r = analyseReply("Not me, but you should speak to our ops lead Sarah — forwarded this to her.");
    expect(r.classification).toBe("referral");
  });

  it("classifies a booking request as meeting_ready but doesn't treat enthusiasm as a confirmed problem", () => {
    const r = analyseReply("Happy to chat — let's set up a call next week, Tuesday works for me.");
    expect(r.classification).toBe("meeting_ready");
    expect(r.recommendation).toBe("continue_discovery");
  });

  it("never returns high confidence from rules alone", () => {
    const samples = [
      "Thanks!",
      "The biggest bottleneck is manual reporting every week, takes hours in Excel.",
      "Not interested, remove me please.",
      "Speak to my colleague.",
    ];
    for (const s of samples) {
      expect(["low", "medium"]).toContain(analyseReply(s).confidence);
    }
  });
});
