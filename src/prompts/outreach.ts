/**
 * Prompts for generating channel-specific outreach drafts.
 * Messaging is signal-based, concise, and non-spammy.
 */

export const OUTREACH_SYSTEM_PROMPT = `You are an outreach copywriter specializing in B2B automation services. You write concise, personalized messages that are:

- Observant and specific (reference real signals, not generic assumptions)
- Operationally aware (speak to their actual business context)
- Respectful of the prospect's time (short, clear, no fluff)
- Credible (no hype, no "10x growth" claims, no fake familiarity)
- Focused on practical business value (reducing manual work, connecting systems, improving ops)

NEVER:
- Pretend you have used their product if you haven't
- Make false claims about knowing them personally
- Use manipulative urgency tactics
- Write generic "we help businesses scale" messages
- Use buzzwords without substance
- Write more than the specified word limit

ALWAYS:
- Lead with a specific observation about their business
- Connect that observation to a practical automation outcome
- Keep the ask low-friction
- Output valid JSON matching the requested schema`;

export function buildLinkedInConnectionNote(context: {
  contactName: string;
  contactRole: string;
  companyName: string;
  segment: string;
  topSignal: string;
  painPointHypothesis: string;
  automationAngle: string;
}): string {
  return `Write a LinkedIn connection request note (max 280 characters) for:

PROSPECT:
- Name: ${context.contactName}
- Role: ${context.contactRole}
- Company: ${context.companyName}
- Segment: ${context.segment}

SIGNAL: ${context.topSignal}
PAIN POINT HYPOTHESIS: ${context.painPointHypothesis}
AUTOMATION ANGLE: ${context.automationAngle}

Output JSON:
{
  "subject": null,
  "body": "the connection note text (max 280 chars)",
  "personalizationSnippet": "the specific observation used",
  "signalUsed": "which signal drove this message"
}

The note should feel natural, reference something specific, and give a clear reason to connect. No sales pitch — just a credible reason for the connection.`;
}

export function buildLinkedInFirstMessage(context: {
  contactName: string;
  contactRole: string;
  companyName: string;
  segment: string;
  topSignal: string;
  painPointHypothesis: string;
  automationAngle: string;
  roiAngle: string;
}): string {
  return `Write a LinkedIn first message (max 150 words) for:

PROSPECT:
- Name: ${context.contactName}
- Role: ${context.contactRole}
- Company: ${context.companyName}
- Segment: ${context.segment}

SIGNAL: ${context.topSignal}
PAIN POINT: ${context.painPointHypothesis}
AUTOMATION ANGLE: ${context.automationAngle}
ROI ANGLE: ${context.roiAngle}

Output JSON:
{
  "subject": null,
  "body": "the message text",
  "personalizationSnippet": "the specific observation used",
  "signalUsed": "which signal drove this message"
}

Structure: observation -> hypothesis -> value prop -> soft CTA. Keep it conversational, not salesy.`;
}

export function buildXEngagementIdea(context: {
  contactName: string;
  companyName: string;
  segment: string;
  topSignal: string;
  painPointHypothesis: string;
}): string {
  return `Suggest an X (Twitter) engagement strategy for:

PROSPECT:
- Name: ${context.contactName}
- Company: ${context.companyName}
- Segment: ${context.segment}

SIGNAL: ${context.topSignal}
PAIN POINT: ${context.painPointHypothesis}

Output JSON:
{
  "subject": "engagement strategy summary",
  "body": "2-3 specific engagement ideas: what to like/reply to, what kind of reply to write, how to add value before DMing. Max 100 words.",
  "personalizationSnippet": "the specific observation used",
  "signalUsed": "which signal drove this"
}`;
}

export function buildXDm(context: {
  contactName: string;
  companyName: string;
  segment: string;
  topSignal: string;
  painPointHypothesis: string;
  automationAngle: string;
}): string {
  return `Write an X (Twitter) DM (max 280 characters) for:

PROSPECT: ${context.contactName} at ${context.companyName} (${context.segment})
SIGNAL: ${context.topSignal}
PAIN POINT: ${context.painPointHypothesis}
AUTOMATION ANGLE: ${context.automationAngle}

Output JSON:
{
  "subject": null,
  "body": "the DM text (max 280 chars)",
  "personalizationSnippet": "the specific observation used",
  "signalUsed": "which signal drove this"
}

Ultra-concise, specific, no pitch — just a relevant observation and soft question.`;
}

export function buildColdEmailFirstTouch(context: {
  contactName: string;
  contactRole: string;
  companyName: string;
  segment: string;
  topSignal: string;
  painPointHypothesis: string;
  automationAngle: string;
  roiAngle: string;
  useCases: string[];
}): string {
  return `Write a cold email first touch for:

PROSPECT:
- Name: ${context.contactName}
- Role: ${context.contactRole}
- Company: ${context.companyName}
- Segment: ${context.segment}

SIGNAL: ${context.topSignal}
PAIN POINT: ${context.painPointHypothesis}
AUTOMATION ANGLE: ${context.automationAngle}
ROI ANGLE: ${context.roiAngle}
RELEVANT USE CASES: ${context.useCases.join(", ")}

Output JSON:
{
  "subject": "email subject line (max 60 chars, no clickbait)",
  "body": "email body (max 150 words)",
  "personalizationSnippet": "the specific observation used",
  "signalUsed": "which signal drove this"
}

Structure:
1. Opening line: specific observation about their business (NOT "I hope this finds you well")
2. Pain point hypothesis: what you think they might be dealing with
3. Value prop: how automation addresses it (1-2 sentences)
4. Social proof hint or specificity (optional, only if credible)
5. Soft CTA: suggest a quick chat or share a relevant resource

Tone: direct, helpful, operationally aware. No hype.`;
}

export function buildFollowUpEmail(context: {
  contactName: string;
  companyName: string;
  previousMessageSummary: string;
  followUpNumber: number;
  newAngle: string;
}): string {
  return `Write follow-up email #${context.followUpNumber} for:

PROSPECT: ${context.contactName} at ${context.companyName}
PREVIOUS MESSAGE: ${context.previousMessageSummary}
NEW ANGLE: ${context.newAngle}

Output JSON:
{
  "subject": "Re: [keep original thread or new short subject]",
  "body": "follow-up body (max 80 words)",
  "personalizationSnippet": "what makes this follow-up relevant",
  "signalUsed": "the new angle used"
}

Rules for follow-up #${context.followUpNumber}:
${context.followUpNumber === 1 ? "- Add new value (share an insight, relevant example, or resource)\n- Don't just \"bump\" — give them a reason to engage" : ""}
${context.followUpNumber === 2 ? "- Final touch — very short, acknowledge they're busy\n- Offer a specific next step or gracefully close the loop" : ""}`;
}
