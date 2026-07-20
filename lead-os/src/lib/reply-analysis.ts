/**
 * Conservative rules-based reply analysis.
 *
 * Design rule from the brief: never overinterpret politeness as buying
 * intent. Rules-based classifications cap at medium confidence; a polite
 * thanks with no problem content is neutral, not positive.
 */

import type { ReplyClassification } from "@/lib/constants";

export type ReplyAnalysisResult = {
  classification: ReplyClassification;
  confidence: "low" | "medium";
  rationale: string;
  explicitProblem: string | null;
  impliedPain: string | null;
  currentProcess: string | null;
  frequency: string | null;
  consequence: string | null;
  toolsMentioned: string[];
  authoritySignal: string | null;
  interestLevel: "none" | "low" | "medium" | "high" | "unclear";
  techSophistication: string | null;
  humanJudgementAreas: string | null;
  possibleObjections: string[];
  recommendation: "continue_discovery" | "propose_action" | "nurture" | "close_politely" | "treat_as_peer" | "await_reply";
};

const TOOL_PATTERN =
  /\b(shopify|klaviyo|hubspot|mailchimp|google sheets?|excel|airtable|notion|slack|meta|facebook ads?|google ads?|ga4|google analytics|xero|quickbooks|stripe|zapier|make\.com|n8n|amazon|ebay|etsy|woocommerce|bigcommerce|pipedrive|monday\.com|asana|trello|gorgias|zendesk|triplewhale|northbeam|looker|power ?bi|canva|figma)\b/gi;

const PAIN_MARKERS =
  /\b(manual(?:ly)?|by hand|takes (?:hours|ages|forever|too long)|every (?:day|week|month)|pain(?:ful)?|nightmare|tedious|repetitive|time.?consuming|annoying|frustrat|wish (?:i|we)|bottleneck|drowning|overwhelm|chas(?:e|ing)|copy(?:ing)? (?:and|&) past|spreadsheet|stitch(?:ing)? together|juggl)/i;

const OBJECTION_MARKERS =
  /\b(not interested|no thanks|we(?:'| a)re (?:all )?(?:good|set|sorted|covered)|already (?:have|using|working with)|no budget|too expensive|don'?t (?:need|want)|stop (?:messaging|contacting)|unsubscribe|remove me|not for (?:us|me)|happy with (?:our|what we))\b/i;

const NOT_NOW_MARKERS =
  /\b(not (?:right )?now|busy (?:at the moment|right now|this)|maybe (?:later|another time)|next (?:quarter|month|year)|come back (?:to me|later)|in a few (?:weeks|months)|after (?:christmas|summer|q[1-4]|launch|peak)|bad timing|swamped|snowed under)\b/i;

const REFERRAL_MARKERS =
  /\b(speak to|talk to|best person|forward(?:ed)? (?:this|it|you)|introduce you|intro to|pass (?:this|it|you) (?:on|to)|not me,? but|our (?:ops|marketing|operations) (?:lead|manager|director) (?:is|would))\b/i;

const MEETING_MARKERS =
  /\b(book|calendly|cal\.com|calendar|jump on a call|quick call|have a (?:call|chat|meeting)|happy to (?:talk|chat|speak|meet)|let'?s (?:talk|chat|speak|meet)|set up a (?:call|meeting)|free (?:on|this|next)\b.*\b(?:mon|tue|wed|thu|fri|week)|works for me)\b/i;

const CURIOUS_MARKERS =
  /\b(what (?:do you mean|exactly|kind of|sort of)|how (?:does|would) (?:that|this|it) work|tell me more|can you (?:explain|expand)|interesting[.,]? (?:what|how)|more (?:detail|info))\b/i;

const PEER_MARKERS =
  /\b(i (?:also )?(?:build|run|do|work on) (?:automation|ai|agents|workflows)|my clients|in my experience|we do (?:the same|similar)|same space|fellow|agent orchestration|multi.?agent|human.?in.?the.?loop|llm|prompt)\b/i;

const POSITIVE_ANSWER_MARKERS =
  /\b(good question|great question|honestly|to be honest|if i'?m honest|the (?:biggest|main|worst) (?:one|thing|issue|problem)|for us it'?s|i'?d say|probably (?:the|our))\b/i;

const POLITE_ONLY =
  /^(thanks|thank you|cheers|appreciate (?:it|that)|no worries|sounds good|nice one|will (?:do|have a think)|noted|ok(?:ay)?|got it|great|good stuff|all the best)[!., ]*$/i;

function firstSentenceMatching(text: string, pattern: RegExp): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return sentences.find((s) => pattern.test(s)) ?? null;
}

export function analyseReply(
  text: string,
  opts: { isPeer: boolean } = { isPeer: false },
): ReplyAnalysisResult {
  const t = text.trim();
  const tools = [...new Set((t.match(TOOL_PATTERN) ?? []).map((m) => m.toLowerCase()))];
  const frequencyMatch = t.match(/\b(every (?:day|week|month|morning|friday|monday)|daily|weekly|monthly|(?:once|twice|\d+ times?) a (?:day|week|month)|\d+ ?(?:hours?|hrs?) a (?:day|week|month))\b/i);
  const consequenceMatch = firstSentenceMatching(t, /\b(goes wrong|mistakes?|errors?|missed|late|delays?|complain|breaks?|falls? (?:over|through)|costs? us)\b/i);
  const authorityMatch = t.match(/\b(my (?:team|business|company|agency)|i (?:own|run|founded)|our (?:process|workflow)|i decide|i'?d have to ask|need (?:sign.?off|approval)|my (?:boss|manager|director))\b/i);
  const processSentence = firstSentenceMatching(
    t,
    /\b((?:we|i)(?:'m|'re| am| are)?\s+(?:currently\s+|usually\s+|normally\s+|just\s+|manually\s+)?(?:use|do|run|handle|manage|export|copy|past(?:e|ing)|pull|build|stitch)\w*|at the moment|currently|right now (?:we|i)|the way (?:we|i|it) work)/i,
  );
  const painSentence = firstSentenceMatching(t, PAIN_MARKERS);

  const base: Omit<ReplyAnalysisResult, "classification" | "confidence" | "rationale" | "recommendation" | "interestLevel"> = {
    explicitProblem: null,
    impliedPain: painSentence,
    currentProcess: processSentence,
    frequency: frequencyMatch?.[0] ?? null,
    consequence: consequenceMatch,
    toolsMentioned: tools,
    authoritySignal: authorityMatch?.[0] ?? null,
    techSophistication: tools.length >= 3 ? `Names ${tools.length} tools — hands-on with their stack` : null,
    humanJudgementAreas: /\b(judgement|judgment|manual(?:ly)? review|human (?:touch|eye|review)|can'?t automate|needs? a person|client.?specific|case.?by.?case)\b/i.test(t)
      ? (firstSentenceMatching(t, /\b(judgement|judgment|review|human|person|case.?by.?case|client.?specific)\b/i) ?? "They flagged parts needing human judgement")
      : null,
    possibleObjections: [],
  };

  const done = (
    classification: ReplyClassification,
    confidence: "low" | "medium",
    rationale: string,
    recommendation: ReplyAnalysisResult["recommendation"],
    interestLevel: ReplyAnalysisResult["interestLevel"],
    extra?: Partial<ReplyAnalysisResult>,
  ): ReplyAnalysisResult => ({ ...base, classification, confidence, rationale, recommendation, interestLevel, ...extra });

  /* Ordered, most-specific first. */

  if (OBJECTION_MARKERS.test(t)) {
    return done("objection", "medium", "Contains an explicit decline or pushback phrase.", "close_politely", "none", {
      possibleObjections: [t.match(OBJECTION_MARKERS)?.[0] ?? "declined"],
    });
  }

  if (REFERRAL_MARKERS.test(t)) {
    return done("referral", "medium", "They point to someone else as the right person.", "continue_discovery", "unclear");
  }

  if (NOT_NOW_MARKERS.test(t)) {
    return done("not_now", "medium", "Timing pushback without rejecting the topic.", "nurture", "low");
  }

  if (opts.isPeer || PEER_MARKERS.test(t)) {
    if (PEER_MARKERS.test(t)) {
      return done(
        "peer_discussion",
        "medium",
        opts.isPeer
          ? "Lead is categorised as an AI specialist and the reply reads as practitioner-to-practitioner exchange."
          : "Reply reads as practitioner-to-practitioner exchange (builds similar things).",
        "treat_as_peer",
        "medium",
      );
    }
  }

  const hasPain = PAIN_MARKERS.test(t);
  const describesProcess = !!processSentence;
  const substantive = t.length >= 80;

  if (hasPain && substantive && (describesProcess || POSITIVE_ANSWER_MARKERS.test(t))) {
    const problem = painSentence ?? firstSentenceMatching(t, POSITIVE_ANSWER_MARKERS) ?? t.slice(0, 200);
    return done(
      "qualified_problem",
      "medium",
      "They describe a specific repetitive problem in their own words — the strongest signal rules can award. Confidence capped at medium: verify by reading it yourself.",
      "continue_discovery",
      "medium",
      { explicitProblem: problem },
    );
  }

  if (MEETING_MARKERS.test(t)) {
    return done(
      "meeting_ready",
      "medium",
      "They reference booking or having a call. Note: enthusiasm for a chat is not a confirmed problem.",
      hasPain ? "propose_action" : "continue_discovery",
      "high",
    );
  }

  if (CURIOUS_MARKERS.test(t)) {
    return done("curious", "medium", "They ask how it works without describing their own problem.", "continue_discovery", "medium");
  }

  if (POLITE_ONLY.test(t) || (t.length < 60 && !hasPain)) {
    const vague = /\b(maybe|might|possibly|will think|at some point|good to know|interesting)\b/i.test(t);
    return done(
      vague ? "vague" : "neutral",
      "low",
      vague
        ? "Non-committal words with no concrete content — deliberately NOT read as interest."
        : "Polite acknowledgement only. Politeness is not buying intent, so this stays neutral.",
      vague ? "continue_discovery" : "await_reply",
      vague ? "unclear" : "unclear",
    );
  }

  if (POSITIVE_ANSWER_MARKERS.test(t) || (substantive && describesProcess)) {
    return done(
      "positive",
      "low",
      "They engage genuinely with the question, though without a clear pain statement yet.",
      "continue_discovery",
      "medium",
    );
  }

  return done(
    "neutral",
    "low",
    "No clear signal detected by rules — read it yourself and reclassify if needed.",
    "await_reply",
    "unclear",
  );
}
