import type { Lead, LeadStatus, LeadTemperature } from "../types/index.js";

/**
 * CRM stage management — the post-outreach sales lifecycle.
 * Deliberately forgiving: a solo operator moves deals around, the tool
 * shouldn't fight them. The only hard rule is a lead must have been
 * through outreach (or explicitly contacted) before entering the funnel.
 */

export const CRM_STAGES: LeadStatus[] = [
  "contacted",
  "meeting_booked",
  "demo",
  "proposal",
  "won",
  "lost",
];

/** Statuses from which a lead may enter the CRM funnel. */
const CRM_ENTRY_STATUSES: LeadStatus[] = [
  "approved",
  "edited",
  "sent",
  "replied",
  "follow_up_due",
];

export function isCrmStage(status: string): status is LeadStatus {
  return (CRM_STAGES as string[]).includes(status);
}

/**
 * Move a lead to a CRM stage. Throws if the lead hasn't been through
 * outreach yet (still in the discovery/drafting part of the pipeline).
 */
export function setCrmStage(lead: Lead, stage: LeadStatus): Lead {
  if (!isCrmStage(stage)) {
    throw new Error(`"${stage}" is not a CRM stage (${CRM_STAGES.join(", ")})`);
  }

  const canEnter = isCrmStage(lead.status) || CRM_ENTRY_STATUSES.includes(lead.status);
  if (!canEnter) {
    throw new Error(
      `Lead is "${lead.status}" — it must be approved/sent before it can enter the CRM funnel`,
    );
  }

  const now = new Date().toISOString();
  return {
    ...lead,
    status: stage,
    nextAction: nextActionFor(stage),
    updatedAt: now,
  };
}

/**
 * Mark an approved lead's outreach as sent (manual send — the engine
 * never sends automatically).
 */
export function markSent(lead: Lead): Lead {
  const allowed: LeadStatus[] = ["approved", "edited", "follow_up_due"];
  if (!allowed.includes(lead.status)) {
    throw new Error(`Can only mark approved/edited leads as sent, got "${lead.status}"`);
  }
  const now = new Date().toISOString();
  return {
    ...lead,
    status: "sent",
    nextAction: "Watch for a reply — follow-up due in 3-5 days",
    sentAt: now,
    updatedAt: now,
  };
}

const TEMPERATURE_TAGS = ["hot", "warm", "cold"];

/** Set lead temperature, stored as a tag (only one temperature tag at a time). */
export function setTemperature(lead: Lead, temperature: LeadTemperature): Lead {
  const tags = lead.tags.filter((t) => !TEMPERATURE_TAGS.includes(t));
  tags.push(temperature);
  return { ...lead, tags, updatedAt: new Date().toISOString() };
}

export function getTemperature(lead: Lead): LeadTemperature | undefined {
  return lead.tags.find((t) => TEMPERATURE_TAGS.includes(t)) as LeadTemperature | undefined;
}

function nextActionFor(stage: LeadStatus): string {
  switch (stage) {
    case "contacted":
      return "Awaiting reply — follow up in 3-5 days";
    case "meeting_booked":
      return "Prep for the call: review fit analysis + sales angle";
    case "demo":
      return "Run the demo — lead with their why-gap";
    case "proposal":
      return "Proposal out — follow up within a week";
    case "won":
      return "Onboard them — make the first week great";
    case "lost":
      return "Log the reason — revisit in 90 days";
    default:
      return "";
  }
}
