import type { Lead, OutreachDraft, OutreachChannel } from "../types/index.js";
import { callLlmJson } from "../lib/llm.js";
import { log } from "../lib/logger.js";
import { selectPersonalization } from "../personalization/personalizer.js";
import {
  OUTREACH_SYSTEM_PROMPT,
  buildLinkedInConnectionNote,
  buildLinkedInFirstMessage,
  buildXEngagementIdea,
  buildXDm,
  buildColdEmailFirstTouch,
} from "../prompts/outreach.js";

interface DraftResult {
  subject: string | null;
  body: string;
  personalizationSnippet: string;
  signalUsed: string;
}

/**
 * Generate outreach drafts for a lead across specified channels.
 */
export async function draftOutreach(
  lead: Lead,
  channels: OutreachChannel[] = ["linkedin", "x", "email"]
): Promise<Lead> {
  log.info(`Drafting outreach for: ${lead.company.name}`);

  const personalization = selectPersonalization(lead);
  const contactName = lead.contact.fullName || lead.contact.firstName || "there";
  const contactRole = lead.contact.role || lead.contact.title || "decision maker";
  const drafts: OutreachDraft[] = [...lead.outreachDrafts];
  const now = new Date().toISOString();

  const context = {
    contactName,
    contactRole,
    companyName: lead.company.name,
    segment: lead.segment,
    topSignal: personalization.topSignal,
    painPointHypothesis: personalization.painPointHypothesis,
    automationAngle: personalization.automationAngle,
    roiAngle: personalization.roiAngle,
    useCases: personalization.useCases,
  };

  for (const channel of channels) {
    try {
      if (channel === "linkedin") {
        // Connection note
        const connNote = await callLlmJson<DraftResult>({
          system: OUTREACH_SYSTEM_PROMPT,
          prompt: buildLinkedInConnectionNote(context),
        });
        drafts.push(toDraft("linkedin", "linkedin_connection_note", connNote, now));

        // First message
        const firstMsg = await callLlmJson<DraftResult>({
          system: OUTREACH_SYSTEM_PROMPT,
          prompt: buildLinkedInFirstMessage(context),
        });
        drafts.push(toDraft("linkedin", "linkedin_first_message", firstMsg, now));
      }

      if (channel === "x") {
        // Engagement idea
        const engagement = await callLlmJson<DraftResult>({
          system: OUTREACH_SYSTEM_PROMPT,
          prompt: buildXEngagementIdea(context),
        });
        drafts.push(toDraft("x", "x_engagement_idea", engagement, now));

        // DM
        const dm = await callLlmJson<DraftResult>({
          system: OUTREACH_SYSTEM_PROMPT,
          prompt: buildXDm(context),
        });
        drafts.push(toDraft("x", "x_dm", dm, now));
      }

      if (channel === "email") {
        const email = await callLlmJson<DraftResult>({
          system: OUTREACH_SYSTEM_PROMPT,
          prompt: buildColdEmailFirstTouch(context),
        });
        drafts.push(toDraft("email", "email_first_touch", email, now));
      }
    } catch (err) {
      log.error(`Failed to draft ${channel} for ${lead.company.name}: ${(err as Error).message}`);
    }
  }

  return {
    ...lead,
    outreachDrafts: drafts,
    personalizationNotes: personalization.personalizationSentence,
    status: "drafted",
    draftedAt: now,
    updatedAt: now,
  };
}

function toDraft(
  channel: OutreachChannel,
  messageType: OutreachDraft["messageType"],
  result: DraftResult,
  createdAt: string
): OutreachDraft {
  return {
    channel,
    messageType,
    subject: result.subject || undefined,
    body: result.body,
    personalizationSnippet: result.personalizationSnippet,
    signalUsed: result.signalUsed,
    qualityIssues: [],
    createdAt,
  };
}
