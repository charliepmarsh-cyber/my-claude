import { describe, expect, it } from "vitest";
import { isSaturday, isSunday } from "date-fns";
import { canSendOutbound, suggestFollowUp } from "./followups";
import { DEFAULT_SETTINGS } from "./constants";

const settings = { ...structuredClone(DEFAULT_SETTINGS) };

describe("follow-up engine", () => {
  it("schedules follow-up 1 after the configured business days, never on a weekend", () => {
    const friday = new Date(2026, 6, 17); // Fri 17 Jul 2026
    const s = suggestFollowUp(0, settings, friday)!;
    expect(s.n).toBe(1);
    expect(isSaturday(s.dueAt)).toBe(false);
    expect(isSunday(s.dueAt)).toBe(false);
    // 4 business days from Friday = Thursday next week
    expect(s.dueAt.getDay()).toBe(4);
  });

  it("labels the final follow-up as the polite close", () => {
    const s = suggestFollowUp(settings.maxFollowUps - 1, settings)!;
    expect(s.label).toMatch(/final polite close/i);
  });

  it("returns null once the follow-up limit is reached", () => {
    expect(suggestFollowUp(settings.maxFollowUps, settings)).toBeNull();
  });

  it("blocks outbound to do-not-contact leads", () => {
    const check = canSendOutbound({ doNotContact: true, followUpCount: 0, suppressionReason: "asked to stop" }, null, false, settings);
    expect(check.allowed).toBe(false);
    expect(check.reasons[0]).toMatch(/asked to stop/);
  });

  it("blocks a second message inside the minimum gap when there's no reply", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const check = canSendOutbound({ doNotContact: false, followUpCount: 0, suppressionReason: null }, yesterday, false, settings);
    expect(check.allowed).toBe(false);
    expect(check.reasons[0]).toMatch(/minimum gap/);
  });

  it("allows sending immediately after they reply", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const check = canSendOutbound({ doNotContact: false, followUpCount: 0, suppressionReason: null }, yesterday, true, settings);
    expect(check.allowed).toBe(true);
  });

  it("blocks when the follow-up limit is exhausted without a reply", () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const check = canSendOutbound({ doNotContact: false, followUpCount: settings.maxFollowUps, suppressionReason: null }, old, false, settings);
    expect(check.allowed).toBe(false);
    expect(check.reasons.join(" ")).toMatch(/limit/i);
  });
});
