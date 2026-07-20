import "server-only";
import { eq, isNull } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { getDb } from "@/db";
import {
  caseStudies,
  conversationEntries,
  leads,
  messages,
  opportunities,
  replyAnalyses,
} from "@/db/schema";
import {
  ICP_CATEGORY_LABELS,
  MESSAGE_TYPE_LABELS,
  REPLY_CLASSIFICATION_LABELS,
  type IcpCategory,
  type MessageType,
  type ReplyClassification,
} from "@/lib/constants";

export type RateRow = { label: string; sent: number; replies: number; ratePct: number | null; lowSample: boolean };

export type AnalyticsData = {
  outreach: {
    messagesSent: number;
    leadsContacted: number;
    leadsReplied: number;
    replyRatePct: number | null;
    positiveReplyRatePct: number | null;
    qualifiedProblemRatePct: number | null;
    meetingsBooked: number;
    byMessageType: RateRow[];
    byCategory: RateRow[];
    byWarmth: RateRow[];
    byChannel: RateRow[];
    followUpPerformance: { followUpsSent: number; repliesAfterFollowUp: number };
    sentPerDay: Array<{ day: string; sent: number; replies: number }>;
    classifications: Array<{ label: string; count: number }>;
  };
  pipeline: {
    opportunitiesCreated: number;
    caseStudiesAgreed: number;
    proposalsSent: number;
    won: number;
    lost: number;
    winRatePct: number | null;
    estimatedValue: number;
    actualValue: number;
    avgHoursToReply: number | null;
    lostReasons: Array<{ reason: string; count: number }>;
  };
  quality: {
    avgCompleteness: number;
    aiDraftShare: { rules: number; ai: number; human: number };
    sentEditedByHand: number;
    sentTotal: number;
    dncCount: number;
  };
  learning: {
    insights: Array<{ text: string; confidence: "solid" | "early" }>;
  };
};

const pct = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 100) : null);

export function getAnalytics(): AnalyticsData {
  const db = getDb();

  const sentMessages = db.select().from(messages).where(eq(messages.status, "sent")).all();
  const allLeads = db.select().from(leads).where(isNull(leads.deletedAt)).all();
  const analyses = db.select().from(replyAnalyses).all();
  const inboundEntries = db
    .select()
    .from(conversationEntries)
    .where(eq(conversationEntries.direction, "inbound"))
    .all();
  const outboundEntries = db
    .select()
    .from(conversationEntries)
    .where(eq(conversationEntries.direction, "outbound"))
    .all();
  const opps = db.select().from(opportunities).all();
  const cases = db.select().from(caseStudies).all();

  const leadById = new Map(allLeads.map((l) => [l.id, l]));
  const contactedLeads = allLeads.filter((l) => l.lastContactedAt);
  const repliedLeadIds = new Set(inboundEntries.map((e) => e.leadId));
  const leadsReplied = contactedLeads.filter((l) => repliedLeadIds.has(l.id));

  const positiveClasses: ReplyClassification[] = ["positive", "curious", "qualified_problem", "meeting_ready", "referral"];
  const positiveLeads = new Set(analyses.filter((a) => positiveClasses.includes(a.classification)).map((a) => a.leadId));
  const qualifiedLeads = new Set(analyses.filter((a) => a.classification === "qualified_problem").map((a) => a.leadId));

  /* Rate helper: group sent messages by key; count leads in group that replied after. */
  const rateBy = (keyOf: (m: (typeof sentMessages)[number]) => string | null, labelOf: (k: string) => string): RateRow[] => {
    const groups = new Map<string, { sent: number; leads: Set<string> }>();
    for (const m of sentMessages) {
      const k = keyOf(m);
      if (!k) continue;
      const g = groups.get(k) ?? { sent: 0, leads: new Set() };
      g.sent++;
      g.leads.add(m.leadId);
      groups.set(k, g);
    }
    return [...groups.entries()]
      .map(([k, g]) => {
        const replies = [...g.leads].filter((id) => repliedLeadIds.has(id)).length;
        return {
          label: labelOf(k),
          sent: g.sent,
          replies,
          ratePct: pct(replies, g.leads.size),
          lowSample: g.leads.size < 5,
        };
      })
      .sort((a, b) => b.sent - a.sent);
  };

  const byMessageType = rateBy(
    (m) => m.msgType,
    (k) => MESSAGE_TYPE_LABELS[k as MessageType] ?? k,
  );
  const byCategory = rateBy(
    (m) => leadById.get(m.leadId)?.icpCategory ?? null,
    (k) => ICP_CATEGORY_LABELS[k as IcpCategory] ?? k,
  );
  const byWarmth = rateBy(
    (m) => leadById.get(m.leadId)?.warmth ?? null,
    (k) => (k === "warm" ? "Warm" : "Cold"),
  );
  const byChannel = rateBy(
    (m) => m.channel,
    (k) => k.charAt(0).toUpperCase() + k.slice(1),
  );

  const followUps = sentMessages.filter((m) => ["follow_up_1", "follow_up_2", "final_close"].includes(m.msgType));
  const repliesAfterFollowUp = followUps.filter((m) =>
    inboundEntries.some((e) => e.leadId === m.leadId && m.sentAt && e.occurredAt > m.sentAt),
  ).length;

  /* Sent per day, last 30 days */
  const days: Array<{ day: string; sent: number; replies: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const key = format(d, "yyyy-MM-dd");
    days.push({
      day: format(d, "d MMM"),
      sent: sentMessages.filter((m) => m.sentAt && format(m.sentAt, "yyyy-MM-dd") === key).length,
      replies: inboundEntries.filter((e) => format(e.occurredAt, "yyyy-MM-dd") === key).length,
    });
  }

  const classCounts = new Map<string, number>();
  for (const a of analyses) classCounts.set(a.classification, (classCounts.get(a.classification) ?? 0) + 1);
  const classifications = [...classCounts.entries()]
    .map(([k, count]) => ({ label: REPLY_CLASSIFICATION_LABELS[k as ReplyClassification] ?? k, count }))
    .sort((a, b) => b.count - a.count);

  /* Time to first reply */
  const replyDeltas: number[] = [];
  for (const l of allLeads) {
    const firstOut = outboundEntries.filter((e) => e.leadId === l.id).sort((a, b) => +a.occurredAt - +b.occurredAt)[0];
    const firstIn = inboundEntries
      .filter((e) => e.leadId === l.id && firstOut && e.occurredAt > firstOut.occurredAt)
      .sort((a, b) => +a.occurredAt - +b.occurredAt)[0];
    if (firstOut && firstIn) replyDeltas.push((+firstIn.occurredAt - +firstOut.occurredAt) / 36e5);
  }
  const avgHoursToReply = replyDeltas.length
    ? Math.round((replyDeltas.reduce((a, b) => a + b, 0) / replyDeltas.length) * 10) / 10
    : null;

  const won = opps.filter((o) => o.stage === "won");
  const lost = opps.filter((o) => o.stage === "lost");
  const lostReasonCounts = new Map<string, number>();
  for (const o of lost) {
    const r = o.lostReason ?? "No reason recorded";
    lostReasonCounts.set(r, (lostReasonCounts.get(r) ?? 0) + 1);
  }
  for (const l of allLeads.filter((x) => x.status === "closed_unsuitable" && x.closedReason)) {
    lostReasonCounts.set(l.closedReason!, (lostReasonCounts.get(l.closedReason!) ?? 0) + 1);
  }

  const sentBySource = { rules: 0, ai: 0, human: 0 };
  for (const m of sentMessages) sentBySource[m.generationSource]++;

  /* Learning insights — recomputed from data every load; recommendations only, never silent changes. */
  const insights: AnalyticsData["learning"]["insights"] = [];
  const warmRow = byWarmth.find((r) => r.label === "Warm");
  const coldRow = byWarmth.find((r) => r.label === "Cold");
  if (warmRow && coldRow && warmRow.ratePct !== null && coldRow.ratePct !== null) {
    insights.push({
      text: `Warm outreach is replying at ${warmRow.ratePct}% vs ${coldRow.ratePct}% cold. ${warmRow.ratePct > coldRow.ratePct ? "Keep prioritising the warm list before cold expansion." : "Unusual — cold is outperforming warm; check whether warm messages have gone stale."}`,
      confidence: warmRow.lowSample || coldRow.lowSample ? "early" : "solid",
    });
  }
  const bestCategory = byCategory.filter((r) => r.ratePct !== null && r.sent >= 3).sort((a, b) => (b.ratePct ?? 0) - (a.ratePct ?? 0))[0];
  if (bestCategory) {
    insights.push({
      text: `${bestCategory.label} leads reply best so far (${bestCategory.ratePct}% of ${bestCategory.sent} sent). Consider weighting research time toward this category.`,
      confidence: bestCategory.lowSample ? "early" : "solid",
    });
  }
  const bestType = byMessageType.filter((r) => r.ratePct !== null && r.sent >= 3 && !["reply_positive", "reply_vague", "reply_objection"].includes(r.label)).sort((a, b) => (b.ratePct ?? 0) - (a.ratePct ?? 0))[0];
  if (bestType) {
    insights.push({
      text: `"${bestType.label}" is the strongest opener/type at ${bestType.ratePct}%. Compare its structure against weaker types before changing templates.`,
      confidence: bestType.lowSample ? "early" : "solid",
    });
  }
  if (followUps.length >= 3) {
    insights.push({
      text: `${repliesAfterFollowUp} of ${followUps.length} follow-ups eventually drew a reply (${pct(repliesAfterFollowUp, followUps.length)}%). ${repliesAfterFollowUp > 0 ? "Follow-ups are earning their place — keep the cadence." : "No replies from follow-ups yet — check they add a genuinely new thought."}`,
      confidence: followUps.length < 8 ? "early" : "solid",
    });
  }
  if (lostReasonCounts.size > 0) {
    const top = [...lostReasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]!;
    insights.push({
      text: `Most common lost/closed reason: "${top[0]}" (${top[1]}×). If it repeats, address it earlier in qualification.`,
      confidence: top[1] < 3 ? "early" : "solid",
    });
  }
  if (insights.length === 0) {
    insights.push({
      text: "Not enough recorded outcomes to learn from yet. Every sent message, reply and closed reason sharpens these insights.",
      confidence: "early",
    });
  }

  return {
    outreach: {
      messagesSent: sentMessages.length,
      leadsContacted: contactedLeads.length,
      leadsReplied: leadsReplied.length,
      replyRatePct: pct(leadsReplied.length, contactedLeads.length),
      positiveReplyRatePct: pct(
        contactedLeads.filter((l) => positiveLeads.has(l.id)).length,
        leadsReplied.length,
      ),
      qualifiedProblemRatePct: pct(
        contactedLeads.filter((l) => qualifiedLeads.has(l.id)).length,
        contactedLeads.length,
      ),
      meetingsBooked: allLeads.filter((l) => l.meetingStatus === "booked" || l.meetingStatus === "held").length,
      byMessageType,
      byCategory,
      byWarmth,
      byChannel,
      followUpPerformance: { followUpsSent: followUps.length, repliesAfterFollowUp },
      sentPerDay: days,
      classifications,
    },
    pipeline: {
      opportunitiesCreated: opps.length,
      caseStudiesAgreed: cases.filter((c) => c.approvalStatus === "approved").length,
      proposalsSent: opps.filter((o) => ["proposal_sent", "negotiation", "won"].includes(o.stage)).length,
      won: won.length,
      lost: lost.length,
      winRatePct: pct(won.length, won.length + lost.length),
      estimatedValue: opps
        .filter((o) => !["won", "lost"].includes(o.stage))
        .reduce((acc, o) => acc + (o.value ?? 0) * (o.probability ?? 0.5), 0),
      actualValue: won.reduce((acc, o) => acc + (o.value ?? 0), 0),
      avgHoursToReply,
      lostReasons: [...lostReasonCounts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    },
    quality: {
      avgCompleteness: allLeads.length
        ? Math.round(allLeads.reduce((acc, l) => acc + l.completeness, 0) / allLeads.length)
        : 0,
      aiDraftShare: sentBySource,
      sentEditedByHand: sentBySource.human,
      sentTotal: sentMessages.length,
      dncCount: allLeads.filter((l) => l.doNotContact).length,
    },
    learning: { insights },
  };
}
