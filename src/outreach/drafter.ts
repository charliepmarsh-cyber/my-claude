import type { Lead, OutreachChannel } from "../types/index.js";
import { log } from "../lib/logger.js";
import { selectPersonalization } from "../personalization/personalizer.js";
import { draftCortexCartLead } from "../scripts/redraft-cortexcart.js";

/**
 * Generate outreach drafts for a lead using the CortexCart product voice
 * (email A/B variants, LinkedIn note + DM, X engagement + DM, follow-ups).
 * The AI fit analysis (bestSalesAngle, estimatedPainPoints) feeds the
 * drafting context when present.
 */
export async function draftOutreach(
  lead: Lead,
  channels: OutreachChannel[] = ["linkedin", "x", "email"]
): Promise<Lead> {
  log.info(`Drafting outreach for: ${lead.company.name}`);

  const personalization = selectPersonalization(lead);
  const allDrafts = await draftCortexCartLead(lead);
  const drafts = allDrafts.filter((d) => channels.includes(d.channel));

  const now = new Date().toISOString();
  return {
    ...lead,
    outreachDrafts: [...lead.outreachDrafts, ...drafts],
    personalizationNotes: personalization.personalizationSentence,
    status: "drafted",
    draftedAt: now,
    updatedAt: now,
  };
}
