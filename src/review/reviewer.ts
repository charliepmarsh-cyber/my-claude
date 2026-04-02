import type { Lead, LeadStatus } from "../types/index.js";

/**
 * Valid status transitions for the review workflow.
 */
const VALID_TRANSITIONS: Record<string, LeadStatus[]> = {
  drafted: ["review_pending"],
  review_pending: ["approved", "edited", "rejected", "snoozed", "not_a_fit"],
  approved: ["sent", "review_pending"],
  edited: ["review_pending", "approved"],
  rejected: ["review_pending", "not_a_fit"],
  snoozed: ["review_pending", "not_a_fit"],
  sent: ["replied", "follow_up_due", "closed"],
  replied: ["follow_up_due", "closed"],
  follow_up_due: ["sent", "closed", "snoozed"],
};

export interface ReviewAction {
  action: "approve" | "edit" | "reject" | "snooze" | "not_a_fit";
  notes?: string;
  editedDrafts?: Lead["outreachDrafts"];
  snoozeUntil?: string; // ISO date
}

/**
 * Apply a review action to a lead, enforcing valid transitions.
 */
export function applyReview(lead: Lead, review: ReviewAction): Lead {
  const statusMap: Record<ReviewAction["action"], LeadStatus> = {
    approve: "approved",
    edit: "edited",
    reject: "rejected",
    snooze: "snoozed",
    not_a_fit: "not_a_fit",
  };

  const targetStatus = statusMap[review.action];
  const allowed = VALID_TRANSITIONS[lead.status];

  if (!allowed?.includes(targetStatus)) {
    throw new Error(`Cannot transition from "${lead.status}" to "${targetStatus}"`);
  }

  const now = new Date().toISOString();

  return {
    ...lead,
    status: targetStatus,
    reviewNotes: review.notes || lead.reviewNotes,
    outreachDrafts: review.editedDrafts || lead.outreachDrafts,
    nextAction: getNextAction(targetStatus, review),
    reviewedAt: now,
    updatedAt: now,
  };
}

/**
 * Move a lead to review_pending status (queue it for human review).
 */
export function queueForReview(lead: Lead): Lead {
  if (lead.status !== "drafted") {
    throw new Error(`Can only queue "drafted" leads for review, got "${lead.status}"`);
  }
  return {
    ...lead,
    status: "review_pending",
    nextAction: "Human review required",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get leads that are pending review.
 */
export function filterReviewQueue(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.status === "review_pending");
}

/**
 * Get summary stats for the review queue.
 */
export function reviewQueueStats(leads: Lead[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const lead of leads) {
    stats[lead.status] = (stats[lead.status] || 0) + 1;
  }
  return stats;
}

function getNextAction(status: LeadStatus, review: ReviewAction): string {
  switch (status) {
    case "approved":
      return "Ready to send — choose channel and send";
    case "edited":
      return "Re-review edited drafts";
    case "rejected":
      return review.notes ? `Rejected: ${review.notes}` : "Rejected — no further action";
    case "snoozed":
      return review.snoozeUntil ? `Snoozed until ${review.snoozeUntil}` : "Snoozed — revisit later";
    case "not_a_fit":
      return "Marked as not a fit — archived";
    default:
      return "";
  }
}
