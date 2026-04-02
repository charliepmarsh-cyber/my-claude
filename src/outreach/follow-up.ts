import type { Lead, OutreachDraft } from "../types/index.js";
import { callLlmJson } from "../lib/llm.js";
import { log } from "../lib/logger.js";
import { OUTREACH_SYSTEM_PROMPT, buildFollowUpEmail } from "../prompts/outreach.js";

interface FollowUpResult {
  subject: string;
  body: string;
  personalizationSnippet: string;
  signalUsed: string;
}

/**
 * Follow-up angle rotation.
 * Each follow-up uses a different approach to avoid repetition.
 */
const FOLLOW_UP_ANGLES: Record<number, (lead: Lead) => string> = {
  1: (lead) => {
    // Follow-up #1: Share a relevant example or insight
    const industry = lead.company.industry || lead.company.niche || "your industry";
    return `Share a specific example of how automation helped a similar ${industry} business — focus on a concrete metric or outcome`;
  },
  2: (lead) => {
    // Follow-up #2: Graceful close with specific offer
    const painPoint = lead.painPoints[0]?.hypothesis || "operational bottlenecks";
    return `Final touch — acknowledge they're busy, reference ${painPoint}, and offer a specific low-commitment next step (e.g., a 2-minute video walkthrough or a relevant case study)`;
  },
};

/**
 * Generate follow-up emails for a lead.
 * Generates up to 2 follow-ups based on the initial email.
 */
export async function generateFollowUps(
  lead: Lead,
  maxFollowUps: number = 2
): Promise<OutreachDraft[]> {
  const initialEmail = lead.outreachDrafts.find(
    (d) => d.messageType === "email_first_touch"
  );

  if (!initialEmail) {
    log.warn(`No initial email found for ${lead.company.name} — skipping follow-ups`);
    return [];
  }

  const contactName = lead.contact.fullName || lead.contact.firstName || "there";
  const followUps: OutreachDraft[] = [];
  const now = new Date().toISOString();

  for (let i = 1; i <= Math.min(maxFollowUps, 2); i++) {
    const angleGenerator = FOLLOW_UP_ANGLES[i];
    if (!angleGenerator) break;

    try {
      const result = await callLlmJson<FollowUpResult>({
        system: OUTREACH_SYSTEM_PROMPT,
        prompt: buildFollowUpEmail({
          contactName,
          companyName: lead.company.name,
          previousMessageSummary: i === 1
            ? summarizeDraft(initialEmail)
            : summarizeDraft(followUps[followUps.length - 1] || initialEmail),
          followUpNumber: i,
          newAngle: angleGenerator(lead),
        }),
      });

      followUps.push({
        channel: "email",
        messageType: i === 1 ? "email_follow_up_1" : "email_follow_up_2",
        subject: result.subject || undefined,
        body: result.body,
        personalizationSnippet: result.personalizationSnippet,
        signalUsed: result.signalUsed,
        qualityIssues: [],
        createdAt: now,
      });
    } catch (err) {
      log.error(`Failed to generate follow-up #${i} for ${lead.company.name}: ${(err as Error).message}`);
    }
  }

  return followUps;
}

function summarizeDraft(draft: OutreachDraft): string {
  // First 100 chars of the body as a summary
  const bodyPreview = draft.body.slice(0, 100).replace(/\n/g, " ");
  return `Subject: ${draft.subject || "(no subject)"}. Body preview: ${bodyPreview}...`;
}
