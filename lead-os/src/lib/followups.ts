/**
 * Follow-up engine rules — deterministic, configurable, testable.
 * Business-day arithmetic; hard guards against over-messaging and
 * contacting suppressed leads.
 */

import { addBusinessDays, differenceInCalendarDays, isSaturday, isSunday } from "date-fns";
import type { Lead } from "@/db/schema";
import type { SettingsShape } from "@/lib/constants";

/** Which follow-up is next given how many have been sent, and when it should land. */
export function suggestFollowUp(
  followUpCount: number,
  settings: SettingsShape,
  from: Date = new Date(),
): { n: number; dueAt: Date; label: string } | null {
  if (followUpCount >= settings.maxFollowUps) return null;
  const days =
    followUpCount === 0 ? settings.followUp1Days : followUpCount === 1 ? settings.followUp2Days : settings.finalCloseDays;
  let due = addBusinessDays(from, days);
  // Never land a follow-up on a weekend even if config maths does.
  while (isSaturday(due) || isSunday(due)) due = addBusinessDays(due, 1);
  const n = followUpCount + 1;
  const label = n >= settings.maxFollowUps ? "Final polite close" : `Follow-up ${n}`;
  return { n, dueAt: due, label };
}

export type OutboundCheck = { allowed: boolean; reasons: string[] };

/**
 * Guard rails before recording another outbound message.
 * `lastOutboundAt` is the most recent outbound entry; `repliedSince` is true
 * when an inbound reply arrived after it.
 */
export function canSendOutbound(
  lead: Pick<Lead, "doNotContact" | "followUpCount" | "suppressionReason">,
  lastOutboundAt: Date | null,
  repliedSince: boolean,
  settings: SettingsShape,
  now: Date = new Date(),
): OutboundCheck {
  const reasons: string[] = [];
  if (lead.doNotContact) {
    reasons.push(
      lead.suppressionReason
        ? `Do-not-contact is set: ${lead.suppressionReason}`
        : "Do-not-contact is set for this lead.",
    );
  }
  if (!repliedSince && lastOutboundAt) {
    const gap = differenceInCalendarDays(now, lastOutboundAt);
    if (gap < settings.minDaysBetweenOutbound) {
      reasons.push(
        `Last message went ${gap === 0 ? "today" : `${gap} day${gap === 1 ? "" : "s"} ago`} with no reply — the minimum gap is ${settings.minDaysBetweenOutbound} days.`,
      );
    }
    if (lead.followUpCount >= settings.maxFollowUps) {
      reasons.push(`Follow-up limit reached (${settings.maxFollowUps}). Move them to nurture or close politely.`);
    }
  }
  return { allowed: reasons.length === 0, reasons };
}
