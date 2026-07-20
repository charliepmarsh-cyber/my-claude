/**
 * Rules-based outreach generator.
 *
 * Every draft is assembled ONLY from facts on the lead record; each fact used
 * is logged into `evidenceUsed` (shown beside the draft, never sent). If the
 * record can't support a personalised message, generation refuses and says
 * exactly what's missing — it never invents familiarity or achievements.
 *
 * Tone: Charlie's — approachable, direct, British English, no hard pitch.
 */

import type { ScoringInput } from "@/lib/scoring";
import { isPeerCategory } from "@/lib/pain-suggestions";
import { ICP_CATEGORY_LABELS, type IcpCategory, type MessageType } from "@/lib/constants";
import type { Message } from "@/db/schema";

export type GenerationControls = {
  tone: "warm" | "neutral" | "professional";
  length: "short" | "medium";
  directness: "gentle" | "direct";
  techDepth: "plain" | "technical";
  ctaStrength: "soft" | "clear";
};

export const DEFAULT_CONTROLS: GenerationControls = {
  tone: "warm",
  length: "short",
  directness: "gentle",
  techDepth: "plain",
  ctaStrength: "soft",
};

export type GenerationContext = {
  input: ScoringInput;
  controls: GenerationControls;
  lastInboundText?: string | null;
  lastOutbound?: Pick<Message, "body" | "msgType" | "sentAt"> | null;
  followUpCount?: number;
  senderName?: string;
};

export type GenerationResult =
  | { ok: true; body: string; subject: string | null; evidenceUsed: string[]; notes: string[] }
  | { ok: false; missing: string[]; suggestion?: string };

export const PROMPT_VERSION = "rules-v1";

/* ------------------------------------------------------------------ */
/* Category question banks (brief §6)                                  */
/* ------------------------------------------------------------------ */

const CATEGORY_QUESTIONS: Partial<Record<IcpCategory, string[]>> = {
  ecommerce_founder: [
    "What repetitive task would you happily never do again?",
    "Which process do you wish you'd fixed a year earlier?",
    "Which operational process becomes painful as you scale?",
  ],
  shopify_expert: [
    "What part of client store work still takes more manual effort than it should?",
    "Across the stores you work on, what bottleneck appears most often?",
  ],
  shopify_agency: [
    "Across the brands you work with, what bottleneck appears most often?",
    "What part of onboarding a new client still takes more manual work than it should?",
  ],
  dtc_growth: [
    "What part of the growth workflow still takes more manual work than it should?",
    "Which operational process becomes painful as brands scale?",
  ],
  head_of_ecommerce: [
    "What part of your weekly trading routine consumes the most manual preparation?",
    "Which process do you wish you had fixed earlier?",
  ],
  performance_marketer: [
    "What part of campaign reporting consumes the most human preparation?",
    "After a lead is generated, what still has to be handled manually?",
  ],
  meta_ads_specialist: [
    "What part of campaign reporting consumes the most human preparation?",
    "Across your accounts, what's the most repetitive part of the week?",
  ],
  cro_specialist: [
    "Before you can actually analyse a site, how much data gathering has to happen first?",
    "What part of audit preparation still takes more manual work than it should?",
  ],
  email_marketer: [
    "What part of campaign setup takes longest before you can actually write?",
    "What part of performance reporting consumes the most preparation?",
  ],
  creator_marketer: [
    "How much of your week goes on chasing creators for deliverables?",
    "What's the most repetitive part of running campaigns across platforms?",
  ],
  ecommerce_bookkeeper: [
    "Which reconciliation eats the most time each month?",
    "How do you currently chase clients for missing documents?",
  ],
  operations_director: [
    "Which recurring process consumes unnecessary team time — and what happens when it fails?",
    "Where does the same data get typed twice in your operation?",
  ],
  website_agency: [
    "What still has to be chased manually to get a project over the line?",
    "Across your projects, what bottleneck appears most often?",
  ],
  recruitment_founder: [
    "What repetitive admin sits between you and more placements?",
  ],
  fulfilment_founder: [
    "What operational reporting do clients ask for that still gets built by hand?",
  ],
  local_trade: [
    "How do enquiries become quotes at the moment — and how often does one slip through?",
    "What paperwork steals your evenings?",
  ],
  restaurant_owner: ["What's the last repetitive thing you do before closing each night?"],
  cleaning_business: ["How much of your day is scheduling and rescheduling rather than delivering?"],
  general_owner: [
    "What repetitive task would you happily never do again?",
    "Which admin task steals the most evenings?",
  ],
};

const CASE_STUDY_OFFER =
  "I’m working with a small number of businesses to remove repetitive operational work using automation. If this is a genuine bottleneck, I’d be happy to map the process and build an initial version at no cost. If it delivers a measurable result, I’d ask for permission to document the outcome as a case study.";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

class Draft {
  parts: string[] = [];
  evidence: string[] = [];
  notes: string[] = [];

  say(text: string): this {
    this.parts.push(text.trim());
    return this;
  }

  cite(fact: string): this {
    if (!this.evidence.includes(fact)) this.evidence.push(fact);
    return this;
  }

  note(n: string): this {
    this.notes.push(n);
    return this;
  }

  render(signoff: string): string {
    return `${this.parts.join("\n\n")}\n\n${signoff}`;
  }
}

function firstName(input: ScoringInput): string {
  const l = input.lead;
  return (l.preferredName || l.fullName.split(/\s+/)[0] || l.fullName).trim();
}

function signoff(controls: GenerationControls, sender: string): string {
  const name = sender.split(/\s+/)[0] || sender;
  return controls.tone === "professional" ? `Best regards,\n${name}` : `Cheers,\n${name}`;
}

function greeting(input: ScoringInput, controls: GenerationControls): string {
  const name = firstName(input);
  return controls.tone === "professional" ? `Hello ${name},` : `Hi ${name},`;
}

/** The one focused question: best confirmed pain question > evidenced > category bank. */
function pickQuestion(input: ScoringInput, d: Draft): string {
  const confirmed = input.pains.find((p) => p.status === "confirmed" && p.discoveryQuestion);
  if (confirmed) {
    d.cite(`Confirmed pain hypothesis: "${confirmed.hypothesis}" — its discovery question was used`);
    return confirmed.discoveryQuestion!;
  }
  const evidenced = input.pains.find((p) => p.status === "proposed" && (p.evidence || p.evidenceUrl) && p.discoveryQuestion);
  if (evidenced) {
    d.cite(`Evidenced hypothesis: "${evidenced.hypothesis}" — its discovery question was used`);
    return evidenced.discoveryQuestion!;
  }
  const bank = CATEGORY_QUESTIONS[input.lead.icpCategory ?? "general_owner"] ?? CATEGORY_QUESTIONS.general_owner!;
  d.cite(`Question chosen from the ${ICP_CATEGORY_LABELS[input.lead.icpCategory ?? "other"]} question bank`);
  return bank[0]!;
}

/** Specific recognition of role/business — only from real record data. */
function recognition(input: ScoringInput, d: Draft): string | null {
  const { lead, company } = input;
  const role = lead.jobTitle;
  const companyName = company?.name;
  const what = company?.description;

  if (role && companyName) {
    d.cite(`Job title: ${role} (lead record)`).cite(`Company: ${companyName} (lead record)`);
    if (what) {
      d.cite(`Company description on file: "${what}"`);
      return `Saw you're ${aOrAn(role)} ${role} at ${companyName} — ${lowerFirst(what.replace(/\.*\s*$/, ""))}.`;
    }
    return `Saw you're ${aOrAn(role)} ${role} at ${companyName}.`;
  }
  if (companyName) {
    d.cite(`Company: ${companyName} (lead record)`);
    return `I've been looking at what you're building with ${companyName}.`;
  }
  if (role) {
    d.cite(`Job title: ${role} (lead record)`);
    return `Saw you're working as ${aOrAn(role)} ${role}.`;
  }
  return null;
}

function aOrAn(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}
function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Operational context from signals/pains — only cited facts. */
function operationalContext(input: ScoringInput, d: Draft): string | null {
  const strongSignal = input.signals.find((s) => s.signalType === "manual_process_mention" || s.signalType === "public_complaint");
  if (strongSignal) {
    d.cite(`Signal: ${strongSignal.description}${strongSignal.evidenceUrl ? ` (${strongSignal.evidenceUrl})` : ""}`);
    return `I noticed ${lowerFirst(strongSignal.description.replace(/\.$/, ""))}.`;
  }
  const growth = input.signals.find((s) => ["hiring", "rapid_growth", "expansion", "product_launch", "funding"].includes(s.signalType));
  if (growth) {
    d.cite(`Signal: ${growth.description}${growth.evidenceUrl ? ` (${growth.evidenceUrl})` : ""}`);
    return `Looks like things are moving — ${lowerFirst(growth.description.replace(/\.$/, ""))}.`;
  }
  return null;
}

function whyAsking(controls: GenerationControls, d: Draft): string {
  d.cite("Charlie's honest context: mapping repetitive operational work in this space");
  return controls.techDepth === "technical"
    ? "I build automation systems for ecommerce operators, and I'm mapping where repetitive operational work actually piles up — real answers, not assumptions."
    : "I spend my time removing repetitive operational work for ecommerce businesses, and I'm trying to understand where it genuinely piles up — from the people living it.";
}

/* ------------------------------------------------------------------ */
/* Generators per message type                                         */
/* ------------------------------------------------------------------ */

export function generateMessage(type: MessageType, ctx: GenerationContext): GenerationResult {
  const { input } = ctx;
  const sender = ctx.senderName ?? "Charlie";

  if (input.lead.doNotContact) {
    return { ok: false, missing: ["This lead is marked do-not-contact. Clear it (with a reason) before drafting."] };
  }

  const peer = isPeerCategory(input.lead.icpCategory);
  if (peer && ["initial_warm", "initial_cold", "insight_seeking", "local_business", "case_study_proposal", "paid_transition"].includes(type)) {
    return {
      ok: false,
      missing: ["This lead is categorised as an AI specialist — a peer, not a prospect."],
      suggestion: "Use the Peer / collaboration message type instead; pitching a peer damages the relationship.",
    };
  }

  switch (type) {
    case "initial_warm":
      return initialWarm(ctx, sender);
    case "initial_cold":
      return initialCold(ctx, sender);
    case "insight_seeking":
      return insightSeeking(ctx, sender);
    case "peer_collaboration":
      return peerCollab(ctx, sender);
    case "local_business":
      return localBusiness(ctx, sender);
    case "follow_up_1":
    case "follow_up_2":
      return followUp(ctx, sender, type);
    case "final_close":
      return finalClose(ctx, sender);
    case "reply_positive":
      return replyPositive(ctx, sender);
    case "reply_vague":
      return replyVague(ctx, sender);
    case "reply_objection":
      return replyObjection(ctx, sender);
    case "discovery_call_invite":
      return discoveryInvite(ctx, sender);
    case "case_study_proposal":
      return caseStudyProposal(ctx, sender);
    case "paid_transition":
      return paidTransition(ctx, sender);
    case "referral_request":
      return referralRequest(ctx, sender);
    case "testimonial_request":
      return testimonialRequest(ctx, sender);
  }
}

function initialWarm(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  const missing: string[] = [];

  if (input.lead.warmth !== "warm") {
    missing.push("Lead is marked cold — use the initial cold message, or update warmth if you do know them.");
  }
  if (!input.lead.howKnown && !input.lead.referrer && !input.lead.source) {
    missing.push("Record how you know them (Relationship section) — warm messages must reference a real connection.");
  }
  if (missing.length) return { ok: false, missing };

  d.say(greeting(input, controls));

  const how = input.lead.howKnown;
  if (how) {
    d.cite(`How known: ${how} (lead record)`);
    d.say(`Good to be connected — ${lowerFirst(how.replace(/\.$/, ""))}.`);
  } else if (input.lead.referrer) {
    d.cite(`Referrer: ${input.lead.referrer} (lead record)`);
    d.say(`${input.lead.referrer} mentioned you — glad to be connected.`);
  }

  const rec = recognition(input, d);
  if (rec) d.say(rec);

  const opCtx = operationalContext(input, d);
  if (opCtx) d.say(opCtx);

  d.say(whyAsking(controls, d));
  const q = pickQuestion(input, d);
  d.say(controls.directness === "direct" ? `Straight question: ${lowerFirst(q)}` : `Out of genuine curiosity — ${lowerFirst(q)}`);

  if (controls.length === "short") trimToShort(d);
  d.note("Warm first message: recognition → context → honest reason → one question. No pitch.");
  return { ok: true, body: d.render(signoff(controls, sender)), subject: null, evidenceUsed: d.evidence, notes: d.notes };
}

function initialCold(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  const missing: string[] = [];

  const rec = recognition(input, d);
  if (!rec) {
    missing.push("Record their job title and/or company first — a cold message with no specific recognition is spam.");
  }
  if ((input.pains.length === 0 && input.signals.length === 0) && input.lead.completeness < 40) {
    missing.push("Add at least one researched observation (signal or pain hypothesis) so the message references something real about them.");
  }
  if (missing.length) return { ok: false, missing };

  d.say(greeting(input, controls));
  d.say(rec!);
  const opCtx = operationalContext(input, d);
  if (opCtx) d.say(opCtx);
  d.say(whyAsking(controls, d));
  const q = pickQuestion(input, d);
  d.say(`If you're open to it, one question: ${lowerFirst(q)}`);
  d.say("No agenda beyond the answer — genuinely mapping this.");

  if (controls.length === "short") trimToShort(d);
  d.note("Cold first message: requires real recognition + researched observation. Never claims familiarity.");
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function insightSeeking(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  d.say(greeting(input, controls));
  const rec = recognition(input, d);
  if (rec) d.say(rec);
  d.cite("Insight-seeking framing: asks for their expertise, offers nothing to buy");
  d.say(
    "I'm doing some honest research into how operators like you actually run things day to day — not selling anything, just trying to learn from people who live it.",
  );
  const q = pickQuestion(input, d);
  d.say(`The one thing I'd love your take on: ${lowerFirst(q)}`);
  d.say("Even a one-line answer would be genuinely useful.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function peerCollab(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  d.say(greeting(input, controls));
  const rec = recognition(input, d);
  if (rec) d.say(rec);
  d.cite("Peer framing: knowledge exchange, no pitch — category is AI specialist or manually chosen");
  d.say(
    "I build automation systems for ecommerce brands — sounds like we're working similar problems from different angles.",
  );
  d.say(
    "I'd genuinely enjoy comparing notes: what you're seeing clients struggle with, where human supervision has to sit in agent workflows, lessons from real implementations.",
  );
  d.say("Open to swapping war stories sometime?");
  if (controls.length === "short") trimToShort(d);
  d.note("Peer message — never pitches. Referrals and collaboration grow from genuine exchange.");
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function localBusiness(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  const companyName = input.company?.name;
  if (!companyName && !input.lead.jobTitle) {
    return { ok: false, missing: ["Record their business name first so the message is specific."] };
  }
  d.say(greeting(input, controls));
  if (companyName) {
    d.cite(`Company: ${companyName} (lead record)`);
    d.say(`I know running ${companyName} means most of your day is already spoken for, so I'll keep this short.`);
  } else {
    d.say("I'll keep this short — I know your day is already full.");
  }
  d.cite("Local-business framing: plain language, no jargon");
  d.say("I help local businesses cut down the repetitive paperwork side of things — quotes, bookings, chasing invoices, that sort of thing.");
  const q = pickQuestion(input, d);
  d.say(`Quick question: ${lowerFirst(q)}`);
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function followUp(ctx: GenerationContext, sender: string, type: "follow_up_1" | "follow_up_2"): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  if (!ctx.lastOutbound) {
    return { ok: false, missing: ["No previous sent message on record — send and log the first message before drafting a follow-up."] };
  }
  d.cite(`Previous message sent ${ctx.lastOutbound.sentAt ? ctx.lastOutbound.sentAt.toDateString() : "(date unknown)"} (message log)`);
  d.say(greeting(input, controls));
  if (type === "follow_up_1") {
    d.say("Just floating my note back up — I know messages sink fast.");
  } else {
    d.say("Last nudge from me on this, promise.");
  }

  // Add a useful thought: a different question or a cited observation.
  const bank = CATEGORY_QUESTIONS[input.lead.icpCategory ?? "general_owner"] ?? CATEGORY_QUESTIONS.general_owner!;
  const alt = bank[type === "follow_up_1" ? 1 : 0] ?? bank[0]!;
  const opCtx = operationalContext(input, d);
  if (opCtx && type === "follow_up_1") {
    d.say(opCtx);
    d.say(`It made me wonder: ${lowerFirst(alt)}`);
    d.cite("Alternate question from the category bank (adds a new thought, not a repeat)");
  } else {
    d.say(`A different way into what I was asking: ${lowerFirst(alt)}`);
    d.cite("Alternate question from the category bank (adds a new thought, not a repeat)");
  }
  d.say("If it's not relevant, a quick 'not for me' is completely fine.");
  d.note("Follow-up rules: references the previous message, adds a new thought, no guilt, no fake urgency.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function finalClose(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  d.say(greeting(input, controls));
  d.cite("Final close: leaves the door open, ends the thread politely");
  d.say("I'll stop nudging — clearly the timing isn't right, and that's completely fair.");
  d.say("If repetitive operational work ever becomes the thing you want off your plate, you know where I am. Genuinely wishing you well with it all.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function requireReply(ctx: GenerationContext): string[] {
  return ctx.lastInboundText ? [] : ["No reply is logged yet — paste their reply into the Conversation tab first so the response references what they actually said."];
}

function replyPositive(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const missing = requireReply(ctx);
  if (missing.length) return { ok: false, missing };
  const d = new Draft();
  d.cite("Their last reply (conversation log) — respond to their actual words before sending");
  d.say(greeting(input, controls));
  d.say("Really appreciate you coming back on that — and honestly, it matches what I keep hearing.");
  d.say(
    "Rather than guess at solutions, I'd like to understand it properly first. How are you currently handling it, and roughly how often does it come up?",
  );
  d.cite("Discovery sequence step 1–2: current handling + frequency (never jumps to pitch)");
  d.note("Positive reply → continue discovery. The system deliberately does not pitch here.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: null, evidenceUsed: d.evidence, notes: d.notes };
}

function replyVague(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const missing = requireReply(ctx);
  if (missing.length) return { ok: false, missing };
  const d = new Draft();
  d.cite("Their last reply (conversation log)");
  d.say(greeting(input, controls));
  d.say("Thanks for replying — and no pressure at all if this isn't a real itch right now.");
  const bank = CATEGORY_QUESTIONS[input.lead.icpCategory ?? "general_owner"] ?? CATEGORY_QUESTIONS.general_owner!;
  d.say(`To make it concrete rather than abstract: ${lowerFirst(bank[bank.length - 1]!)}`);
  d.cite("A more concrete question from the category bank (vague replies get specificity, not pressure)");
  d.note("Vague reply → one sharper question. Never interpreted as buying intent.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: null, evidenceUsed: d.evidence, notes: d.notes };
}

function replyObjection(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const missing = requireReply(ctx);
  if (missing.length) return { ok: false, missing };
  const d = new Draft();
  d.cite("Their last reply (conversation log) — the objection is respected, not argued with");
  d.say(greeting(input, controls));
  d.say("That's a completely fair position — thanks for being straight about it.");
  d.say(
    "For what it's worth, I'm not attached to automation being the answer. If the current way works, that's the right answer. The only situations worth changing are ones with real, measurable drag.",
  );
  d.say("If that ever shows up, happy to think it through with you. Either way, appreciated the honesty.");
  d.note("Objection → agree where true, de-escalate, leave the door open. No rebuttal scripts.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: null, evidenceUsed: d.evidence, notes: d.notes };
}

function discoveryInvite(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  const confirmed = input.pains.find((p) => p.status === "confirmed");
  const qualified = input.lead.replySentiment === "qualified_problem";
  if (!confirmed && !qualified) {
    return {
      ok: false,
      missing: [
        "No confirmed problem on record. A call invitation before a problem is established feels like a pitch — continue discovery in the conversation first.",
      ],
    };
  }
  d.say(greeting(input, controls));
  if (confirmed) {
    d.cite(`Confirmed pain: "${confirmed.hypothesis}"`);
    d.say(`From what you've described — ${lowerFirst(confirmed.hypothesis.replace(/\.$/, ""))} — I think it's worth 20 minutes to map it properly.`);
  } else {
    d.cite("Reply classified as qualified problem (conversation analysis)");
    d.say("From what you've described, I think it's worth 20 minutes to map the process properly.");
  }
  d.say(
    "No slides, no pitch — just walking through how it works today: what triggers it, who touches it, where it goes wrong, and what 'fixed' would actually mean. You'd get the map either way.",
  );
  d.say(controls.ctaStrength === "clear" ? "Would sometime this week or next suit for a short call?" : "If that sounds useful, happy to find a time that suits.");
  d.note("Invite only offered because a problem is on record. The map is the value, not the pitch.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function caseStudyProposal(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  const confirmed = input.pains.find((p) => p.status === "confirmed");
  if (!confirmed && input.lead.replySentiment !== "qualified_problem") {
    return {
      ok: false,
      missing: ["The free-build offer requires a confirmed, evidenced problem. Confirm a pain hypothesis (with evidence) or classify a reply as a qualified problem first."],
    };
  }
  d.say(greeting(input, controls));
  if (confirmed) {
    d.cite(`Confirmed pain: "${confirmed.hypothesis}" (evidence on file)`);
    d.say(`You've been clear that ${lowerFirst(confirmed.hypothesis.replace(/\.$/, ""))} — and it sounds like a genuine bottleneck rather than a niggle.`);
  } else {
    d.cite("Reply classified as qualified problem (conversation analysis)");
    d.say("You've described a genuine bottleneck rather than a niggle — that's exactly the kind of thing I look for.");
  }
  d.say(CASE_STUDY_OFFER);
  d.cite("CPM case-study offer (standard wording)");
  d.say("If that's interesting, the next step is a short mapping call — no commitment beyond that.");
  d.note("Uses the standard CPM case-study offer verbatim. Only available once a problem is confirmed.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function paidTransition(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  d.say(greeting(input, controls));
  d.cite("Paid transition framing: value delivered first, priced follow-on second");
  d.say(
    "Now the first build is doing its job, it's a sensible moment to talk about what's next — there are usually two or three adjacent processes where the same approach pays for itself quickly.",
  );
  d.say(
    "I'd suggest a short review: what the current build has actually saved, what's still manual around it, and what a paid phase two would look like with clear numbers attached. If the numbers don't stack up, I'll say so.",
  );
  d.say(controls.ctaStrength === "clear" ? "Shall we book 30 minutes this week?" : "Worth a look when you have a moment?");
  d.note("Only send after a delivered build with measured results — check the case-study record first.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function referralRequest(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  d.say(greeting(input, controls));
  d.cite("Referral framing: specific ask, easy no");
  d.say("A small ask, and please feel free to ignore it: I'm looking to help one or two more businesses remove repetitive operational work the way we did.");
  d.say("If anyone comes to mind who's drowning in a process they'd rather not own — an intro or even just a name would mean a lot. And if no one springs to mind, no worries at all.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

function testimonialRequest(ctx: GenerationContext, sender: string): GenerationResult {
  const { input, controls } = ctx;
  const d = new Draft();
  d.say(greeting(input, controls));
  d.cite("Testimonial framing: specific, low-effort ask tied to the delivered work");
  d.say("Would you be up for a two-line testimonial about the build? Something honest about what changed day-to-day is worth far more to me than polish.");
  d.say("Happy to draft something from your words for you to edit, if that's easier — and totally fine to say no.");
  if (controls.length === "short") trimToShort(d);
  return { ok: true, body: d.render(signoff(controls, sender)), subject: subjectFor(ctx), evidenceUsed: d.evidence, notes: d.notes };
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

function subjectFor(ctx: GenerationContext): string | null {
  if (ctx.input.lead.channel !== "email") return null;
  const company = ctx.input.company?.name;
  return company ? `Quick question about how ${company} runs day-to-day` : "A quick operational question";
}

/** Short mode: greeting + at most 3 body paragraphs, preferring the question. */
function trimToShort(d: Draft): void {
  if (d.parts.length <= 4) return;
  const greetingPart = d.parts[0]!;
  const rest = d.parts.slice(1);
  const questionIdx = rest.findIndex((p) => p.includes("?"));
  const keep: string[] = [];
  for (let i = 0; i < rest.length && keep.length < 3; i++) {
    if (i === questionIdx || keep.length < 2) keep.push(rest[i]!);
  }
  if (questionIdx >= 0 && !keep.includes(rest[questionIdx]!)) {
    keep[keep.length - 1] = rest[questionIdx]!;
  }
  d.parts = [greetingPart, ...keep];
  d.note("Trimmed to short form — kept recognition and the single question.");
}
