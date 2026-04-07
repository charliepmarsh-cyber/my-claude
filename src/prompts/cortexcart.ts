/**
 * CortexCart-specific outreach prompts — v3.
 * Focuses on natural, human voice. No robotic analysis.
 */

export const CORTEXCART_SYSTEM_PROMPT = `You write outreach messages for CortexCart, a free AI analytics dashboard for Shopify stores.

WHAT CORTEXCART IS:
Free during beta. Replaces 5-8 tools: analytics, AI product/homepage analysis, social scheduling, CRM inbox, heatmaps, A/B testing, financial tracking. Built for small Shopify stores. Sign up: https://tracker.cortexcart.com

YOUR WRITING STYLE:
Write like a real person texting a friend who runs a Shopify store. Short sentences. Casual punctuation. No corporate speak. Think "founder chatting at a coffee shop" not "sales rep reading a script."

CRITICAL RULES:
1. ONLY reference facts you are given. If you don't know their product, their revenue, or their tech stack — DON'T MAKE IT UP. Say something general like "running a DTC brand" or "managing a Shopify store."
2. NEVER invent specific problems. Don't say "you're manually handling customer support" unless the data explicitly says so. Instead, ask questions: "how are you tracking conversions?" or "curious what tools you're using."
3. Keep it SHORT. Emails: 50-80 words. LinkedIn DMs: under 80 words. X DMs: under 50 words. Connection notes: under 280 chars.
4. Sound like a human. Use "we built" not "our platform offers." Use "pretty useful" not "powerful solution." Use contractions.
5. ONE call to action per message. Make it easy to say yes to.
6. Frame beta as early access, not "free trial."

NEVER USE THESE PHRASES:
"I noticed [company] [invented observation]" / "founder-led organization" / "consuming significant time" / "business strategy" / "operational complexity" / "streamline" / "leverage" / "synergy" / "game-changer" / "revolutionary" / "I'd love to" / "I'd be happy to" / "hope this finds you well" / "just checking in"

Output valid JSON only. No markdown fences.`;

// ── Cold Email ──────────────────────────────────────────────────

export function buildCortexCartEmail(ctx: {
  contactFirstName: string;
  contactRole: string;
  companyName: string;
  observation: string;
  painHypothesis: string;
  niche: string;
}): string {
  return `Write TWO cold email variants. 50-80 words each MAX.

TO: ${ctx.contactFirstName} (${ctx.contactRole}) at ${ctx.companyName}
NICHE: ${ctx.niche}
WHAT WE ACTUALLY KNOW: ${ctx.observation}

VARIANT A (Insight): Open with something specific about their niche (not about them personally unless you KNOW it). Connect to how most store owners in that niche track data. Mention CortexCart casually.

VARIANT B (Question): Open with a genuine question about how they track store performance. Let the conversation happen naturally.

IMPORTANT: If you don't know specifics about their store, DON'T FAKE IT. Talk about their niche generally or ask a question. Be honest and casual.

Subject lines: lowercase, 3-6 words max.
Sign off with: Charlie

JSON:
{
  "variantA": { "subject": "...", "body": "...", "personalizationSnippet": "...", "signalUsed": "..." },
  "variantB": { "subject": "...", "body": "...", "personalizationSnippet": "...", "signalUsed": "..." }
}`;
}

// ── LinkedIn Connection Note ────────────────────────────────────

export function buildCortexCartLinkedInNote(ctx: {
  contactFirstName: string;
  companyName: string;
  niche: string;
  observation: string;
}): string {
  return `Write a LinkedIn connection request. Max 280 chars. NO PITCH.

TO: ${ctx.contactFirstName} at ${ctx.companyName}
NICHE: ${ctx.niche}
WHAT WE KNOW: ${ctx.observation}

Just say you came across their store/brand and want to connect. That's it. Don't mention CortexCart. Don't mention analytics. Just be a normal human connecting on LinkedIn.

JSON: { "body": "...", "personalizationSnippet": "...", "signalUsed": "..." }`;
}

// ── LinkedIn Follow-Up DM ───────────────────────────────────────

export function buildCortexCartLinkedInMessage(ctx: {
  contactFirstName: string;
  contactRole: string;
  companyName: string;
  niche: string;
  observation: string;
  painHypothesis: string;
}): string {
  return `Write a LinkedIn DM to send AFTER they accept. Max 80 words.

TO: ${ctx.contactFirstName} (${ctx.contactRole}) at ${ctx.companyName}
NICHE: ${ctx.niche}
WHAT WE KNOW: ${ctx.observation}

Thanks for connecting (keep it brief). Ask ONE genuine question about how they track their store's performance. Mention "we built a free dashboard" only if it fits naturally. End with a question.

Don't invent problems they have. Ask what their setup looks like.

JSON: { "body": "...", "personalizationSnippet": "...", "signalUsed": "..." }`;
}

// ── X Engagement Strategy ───────────────────────────────────────

export function buildCortexCartXEngagement(ctx: {
  contactFirstName: string;
  companyName: string;
  niche: string;
  observation: string;
}): string {
  return `Give 2-3 ways to engage with this person's X content BEFORE DMing. Max 60 words.

PERSON: ${ctx.contactFirstName} at ${ctx.companyName} (${ctx.niche})

Be specific about what kind of posts to engage with and what to say. The goal is to be genuinely helpful, not to set up a pitch.

JSON: { "body": "...", "personalizationSnippet": "...", "signalUsed": "..." }`;
}

// ── X DM ────────────────────────────────────────────────────────

export function buildCortexCartXDm(ctx: {
  contactFirstName: string;
  companyName: string;
  niche: string;
  observation: string;
}): string {
  return `Write an X DM. UNDER 50 WORDS. Send after 2-3 genuine interactions.

TO: ${ctx.contactFirstName} at ${ctx.companyName} (${ctx.niche})

Reference a previous interaction or their content. Mention CortexCart super casually — "free dashboard we built." End with a question. Sound like a real person, not a marketer.

JSON: { "body": "...", "personalizationSnippet": "...", "signalUsed": "..." }`;
}

// ── Follow-Up Emails ────────────────────────────────────────────

export function buildCortexCartFollowUp(ctx: {
  contactFirstName: string;
  companyName: string;
  followUpNumber: number;
}): string {
  const rules = ctx.followUpNumber === 1
    ? `Bump with something useful — share a quick insight about their niche or mention the free dashboard. Max 40 words. Don't say "just checking in" or "following up." Add value or don't send it. Sign off: Charlie`
    : `Final message. Offer to run a free AI analysis of their homepage — no strings attached. Max 40 words. Keep it light and easy to say yes to. Sign off: Charlie`;

  return `Write follow-up email #${ctx.followUpNumber} for ${ctx.contactFirstName} at ${ctx.companyName}.

${rules}

JSON: { "subject": "re: ...", "body": "...", "personalizationSnippet": "...", "signalUsed": "..." }`;
}
