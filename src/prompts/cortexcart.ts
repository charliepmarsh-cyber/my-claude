/**
 * CortexCart-specific outreach prompts — v2.
 * Built from the full CortexCart product brief, ICP definitions,
 * tone guidelines, and dual-variant messaging framework.
 */

export const CORTEXCART_SYSTEM_PROMPT = `You are an outreach writer for CortexCart — an AI-powered e-commerce analytics platform.

PRODUCT (CortexCart v2.0 Beta):
- Free AI analytics dashboard that replaces 5-8 separate tools
- Consolidates: store analytics, AI homepage/product analysis, social media scheduling, CRM/unified inbox, heatmaps, A/B testing, financial tracking, Mailchimp + GA4 integration
- Free during beta, 1.5M AI tokens per account, no credit card required
- Built for SMB Shopify stores ($0-$500K revenue, 1-10 person teams)
- Sign up: https://tracker.cortexcart.com
- UK-based company, global users

KEY DIFFERENTIATORS:
- vs Triple Whale ($100-$1200/mo): CortexCart is free, built for SMBs not $1M+ brands
- vs GA4: CortexCart adds AI recommendations + social + CRM in one place
- vs Hotjar ($32+/mo): CortexCart includes heatmaps + analytics + social — bundled free
- vs Hootsuite/Buffer ($19-$99/mo): Social scheduling included as part of the platform
- vs Shopify Analytics: CortexCart adds AI recommendations, social management, heatmaps

YOUR VOICE:
- Sound like a helpful founder who's been in their shoes
- Use "we built" not "our platform offers"
- Reference specific things about their store
- Keep sentences short and punchy
- End with questions, not statements
- Acknowledge their current tools respectfully

BANNED PHRASES (never use these):
- "Just checking in" / "Hope you're doing well" / "I wanted to reach out because"
- "Are you the right person?" / "Do you have 15 minutes?"
- "We help [type] do [thing]" / "I noticed you're in the [industry] space"
- "Revolutionary" / "game-changing" / "cutting-edge" / "synergy" / "leverage"
- "I'd love to" / "I'd be happy to"
- No exclamation marks in subject lines
- No paragraphs longer than 2 sentences

MESSAGE ARCHITECTURE (every message follows this):
1. PERSONALIZED HOOK — 1 sentence about them specifically
2. BRIDGE — connect their situation to a relevant pain point
3. VALUE PROP — 1 sentence on what CortexCart does for people like them
4. LOW-FRICTION CTA — a question that's easy to say yes to

Output valid JSON only. No markdown fences, no explanation.`;

// ── Cold Email ──────────────────────────────────────────────────

export function buildCortexCartEmail(ctx: {
  contactFirstName: string;
  contactRole: string;
  companyName: string;
  observation: string;
  painHypothesis: string;
  niche: string;
}): string {
  return `Write TWO cold email variants for a Shopify store owner. Max 80 words each.

PROSPECT:
- Name: ${ctx.contactFirstName}
- Role: ${ctx.contactRole}
- Store/Company: ${ctx.companyName}
- Niche: ${ctx.niche}
- Observation: ${ctx.observation}
- Pain hypothesis: ${ctx.painHypothesis}

VARIANT A (Insight-Driven): Lead with a specific observation or data point about their store/niche. Position yourself as someone paying attention to their market.

VARIANT B (Question-Driven): Lead with a genuine question about their business that naturally opens a conversation about analytics, social, or optimization.

Rules:
- Subject lines: lowercase, 3-6 words, curiosity or specificity
- Body: 50-80 words max, plain text feel, no HTML
- Signature: first name only
- One CTA only per variant
- Frame beta as "early access" not "free trial"
- Never list features in bullets

Output JSON:
{
  "variantA": {
    "subject": "lowercase subject line",
    "body": "the email body",
    "personalizationSnippet": "what you referenced",
    "signalUsed": "the observation"
  },
  "variantB": {
    "subject": "lowercase subject line",
    "body": "the email body",
    "personalizationSnippet": "what you referenced",
    "signalUsed": "the observation"
  }
}`;
}

// ── LinkedIn Connection Note ────────────────────────────────────

export function buildCortexCartLinkedInNote(ctx: {
  contactFirstName: string;
  companyName: string;
  niche: string;
  observation: string;
}): string {
  return `Write a LinkedIn connection request (max 280 chars) for a Shopify store owner.

Name: ${ctx.contactFirstName}
Store: ${ctx.companyName}
Niche: ${ctx.niche}
Observation: ${ctx.observation}

Rules:
- Mention their store by name
- Never pitch in the connection request
- Keep it natural — you found their store and want to connect
- Under 280 characters

Output JSON:
{
  "body": "the connection note",
  "personalizationSnippet": "what you referenced",
  "signalUsed": "the observation"
}`;
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
  return `Write a LinkedIn DM (max 80 words) to send AFTER they accept your connection.

Name: ${ctx.contactFirstName}
Role: ${ctx.contactRole}
Store: ${ctx.companyName}
Niche: ${ctx.niche}
Observation: ${ctx.observation}
Pain hypothesis: ${ctx.painHypothesis}

Rules:
- Thank them for connecting (brief, not sycophantic)
- Ask a genuine question about how they track performance
- Mention CortexCart only as "a free tool we built" — don't list features
- End with a question
- Max 80 words

Output JSON:
{
  "body": "the message",
  "personalizationSnippet": "what you referenced",
  "signalUsed": "the observation"
}`;
}

// ── X (Twitter) Engagement Strategy ─────────────────────────────

export function buildCortexCartXEngagement(ctx: {
  contactFirstName: string;
  companyName: string;
  niche: string;
  observation: string;
}): string {
  return `Write an X engagement strategy (before DMing) for a Shopify store owner.

Name: ${ctx.contactFirstName}
Store: ${ctx.companyName}
Niche: ${ctx.niche}
Observation: ${ctx.observation}

Rules:
- Give 2-3 specific ideas for engaging with their content FIRST
- The goal is 2-3 genuine interactions before any DM
- Focus on adding value, not just liking posts
- Max 60 words total

Output JSON:
{
  "body": "the engagement strategy",
  "personalizationSnippet": "what to engage with",
  "signalUsed": "the observation"
}`;
}

// ── X DM ────────────────────────────────────────────────────────

export function buildCortexCartXDm(ctx: {
  contactFirstName: string;
  companyName: string;
  niche: string;
  observation: string;
}): string {
  return `Write an X DM (max 50 words) to send AFTER 2-3 genuine interactions.

Name: ${ctx.contactFirstName}
Store: ${ctx.companyName}
Niche: ${ctx.niche}
Observation: ${ctx.observation}

Rules:
- Under 50 words (strict)
- Reference a previous interaction or their content
- Mention CortexCart casually — "free dashboard we built"
- End with a question
- No feature lists

Output JSON:
{
  "body": "the DM (under 50 words)",
  "personalizationSnippet": "what you referenced",
  "signalUsed": "the observation"
}`;
}

// ── Follow-Up Email ─────────────────────────────────────────────

export function buildCortexCartFollowUp(ctx: {
  contactFirstName: string;
  companyName: string;
  followUpNumber: number;
}): string {
  return `Write a follow-up email (${ctx.followUpNumber === 1 ? "Day 3-5" : "Day 10 final"}).

Name: ${ctx.contactFirstName}
Store: ${ctx.companyName}
Follow-up #: ${ctx.followUpNumber}

Rules:
${ctx.followUpNumber === 1 ? `- Shorter than the original email
- Bump with new value — don't just "check in"
- Mention "free AI analytics dashboard" + link: https://tracker.cortexcart.com
- Max 40 words` : `- Final touch — share a relevant insight or offer to run their AI homepage analysis for free
- "No strings attached" tone
- Max 40 words`}

Output JSON:
{
  "subject": "re: [keep short]",
  "body": "the follow-up",
  "personalizationSnippet": "what makes this relevant",
  "signalUsed": "follow-up timing"
}`;
}
