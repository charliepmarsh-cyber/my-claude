import "server-only";
import { and, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, ne, or, sql, sum } from "drizzle-orm";
import { endOfDay, startOfDay, startOfWeek } from "date-fns";
import { getDb } from "@/db";
import {
  caseStudies,
  conversationEntries,
  leads,
  messages,
  opportunities,
  replyAnalyses,
  tasks,
} from "@/db/schema";
import { getSettings } from "@/lib/settings";
import type { SettingsShape } from "@/lib/constants";

export type MissionItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  count: number;
  done: number;
  kind: "respond" | "contact" | "research" | "follow_up" | "discovery" | "case_study";
};

export type DashboardData = {
  settings: SettingsShape;
  counts: {
    repliesAwaiting: number;
    followUpsDueToday: number;
    followUpsOverdue: number;
    highFitUntouched: number;
    needsResearch: number;
    activeDiscovery: number;
    caseStudyCandidates: number;
    qualifiedOpps: number;
    readyToContact: number;
  };
  today: {
    outreachSent: number;
    repliesReceived: number;
    meetingsBooked: number;
    proposalsSent: number;
    caseStudiesAgreed: number;
    paidOppsCreated: number;
    positiveReplyRatePct: number | null;
    pipelineValue: number;
  };
  progress: {
    warmList: { value: number; target: number };
    outreachToday: { value: number; target: number };
    repliesThisWeek: { value: number; target: number };
    discoveryConversations: { value: number; target: number };
    caseStudies: { value: number; target: number };
    paidClients: { value: number; target: number };
  };
  mission: MissionItem[];
  recentOutcomes: Array<{ id: string; title: string; stage: "won" | "lost"; when: Date; leadId: string }>;
};

const num = (v: unknown): number => Number(v ?? 0);

export function getDashboardData(): DashboardData {
  const db = getDb();
  const settings = getSettings();
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const live = and(isNull(leads.deletedAt), eq(leads.doNotContact, false));

  const repliesAwaiting = num(db.select({ n: count() }).from(leads).where(and(live, eq(leads.status, "replied"))).get()?.n);

  const openTask = and(eq(tasks.status, "open"), or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, now)));
  const followUpsDueToday = num(
    db
      .select({ n: count() })
      .from(tasks)
      .where(and(openTask, eq(tasks.kind, "follow_up"), gte(tasks.dueAt, dayStart), lte(tasks.dueAt, dayEnd)))
      .get()?.n,
  );
  const followUpsOverdue = num(
    db
      .select({ n: count() })
      .from(tasks)
      .where(and(openTask, eq(tasks.kind, "follow_up"), lt(tasks.dueAt, dayStart)))
      .get()?.n,
  );

  const highFitUntouched = num(
    db
      .select({ n: count() })
      .from(leads)
      .where(
        and(
          live,
          isNull(leads.lastContactedAt),
          gte(leads.overallScore, 60),
          inArray(leads.status, ["researched", "ready_to_contact", "imported", "needs_research"]),
        ),
      )
      .get()?.n,
  );

  const needsResearch = num(
    db
      .select({ n: count() })
      .from(leads)
      .where(and(live, inArray(leads.status, ["imported", "needs_research"])))
      .get()?.n,
  );

  const readyToContact = num(
    db.select({ n: count() }).from(leads).where(and(live, eq(leads.status, "ready_to_contact"))).get()?.n,
  );

  const activeDiscovery = num(
    db
      .select({ n: count() })
      .from(leads)
      .where(and(live, isNotNull(leads.conversationStage), ne(leads.status, "closed_unsuitable")))
      .get()?.n,
  );

  const caseStudyCandidates = num(
    db
      .select({ n: count() })
      .from(opportunities)
      .where(inArray(opportunities.stage, ["case_study_candidate", "free_build_proposed"]))
      .get()?.n,
  );

  const openOppStages = ["qualified", "case_study_candidate", "free_build_proposed", "paid_discovery", "proposal_drafted", "proposal_sent", "negotiation"] as const;
  const qualifiedOpps = num(
    db.select({ n: count() }).from(opportunities).where(inArray(opportunities.stage, [...openOppStages])).get()?.n,
  );

  const pipelineValue = num(
    db
      .select({ v: sum(sql`coalesce(${opportunities.value}, 0) * coalesce(${opportunities.probability}, 0.5)`) })
      .from(opportunities)
      .where(inArray(opportunities.stage, [...openOppStages]))
      .get()?.v,
  );

  const outreachSent = num(
    db
      .select({ n: count() })
      .from(messages)
      .where(and(eq(messages.status, "sent"), gte(messages.sentAt, dayStart)))
      .get()?.n,
  );

  const repliesReceived = num(
    db
      .select({ n: count() })
      .from(conversationEntries)
      .where(and(eq(conversationEntries.direction, "inbound"), gte(conversationEntries.occurredAt, dayStart)))
      .get()?.n,
  );

  const meetingsBooked = num(db.select({ n: count() }).from(leads).where(and(live, eq(leads.meetingStatus, "booked"))).get()?.n);

  const proposalsSent = num(
    db
      .select({ n: count() })
      .from(opportunities)
      .where(inArray(opportunities.stage, ["proposal_sent", "negotiation", "won"]))
      .get()?.n,
  );

  const caseStudiesAgreed = num(
    db.select({ n: count() }).from(caseStudies).where(eq(caseStudies.approvalStatus, "approved")).get()?.n,
  );

  const paidOppsCreated = num(
    db
      .select({ n: count() })
      .from(opportunities)
      .where(and(gt(opportunities.value, 0), inArray(opportunities.stage, ["paid_discovery", "proposal_drafted", "proposal_sent", "negotiation", "won"])))
      .get()?.n,
  );

  const inboundTotal = num(db.select({ n: count() }).from(replyAnalyses).get()?.n);
  const inboundPositive = num(
    db
      .select({ n: count() })
      .from(replyAnalyses)
      .where(inArray(replyAnalyses.classification, ["positive", "curious", "qualified_problem", "meeting_ready", "referral"]))
      .get()?.n,
  );
  const positiveReplyRatePct = inboundTotal > 0 ? Math.round((inboundPositive / inboundTotal) * 100) : null;

  /* Progress targets */
  const warmCount = num(db.select({ n: count() }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.warmth, "warm"))).get()?.n);
  const repliesThisWeek = num(
    db
      .select({ n: count() })
      .from(conversationEntries)
      .where(and(eq(conversationEntries.direction, "inbound"), gte(conversationEntries.occurredAt, weekStart)))
      .get()?.n,
  );
  const paidClients = num(
    db
      .select({ n: count() })
      .from(opportunities)
      .where(and(eq(opportunities.stage, "won"), gt(opportunities.value, 0)))
      .get()?.n,
  );

  /* Mission — only include items with genuine work behind them */
  const mission: MissionItem[] = [];
  if (repliesAwaiting > 0) {
    mission.push({
      id: "respond",
      kind: "respond",
      label: `Respond to ${Math.min(repliesAwaiting, 5)} active conversation${Math.min(repliesAwaiting, 5) === 1 ? "" : "s"}`,
      detail: "Replies are waiting on you — momentum dies fastest here.",
      href: "/conversations",
      count: Math.min(repliesAwaiting, 5),
      done: 0,
    });
  }
  const contactRemaining = Math.max(0, settings.dailyOutreachTarget - outreachSent);
  if (contactRemaining > 0 && readyToContact + highFitUntouched > 0) {
    mission.push({
      id: "contact",
      kind: "contact",
      label: `Contact ${Math.min(contactRemaining, readyToContact + highFitUntouched)} highest-priority leads`,
      detail: "Work through Daily Execution Mode — it queues the best next lead each time.",
      href: "/execute",
      count: Math.min(contactRemaining, readyToContact + highFitUntouched),
      done: outreachSent,
    });
  }
  if (needsResearch > 0) {
    mission.push({
      id: "research",
      kind: "research",
      label: `Research ${Math.min(settings.dailyResearchTarget, needsResearch)} leads`,
      detail: "Move imported leads to researched so they can be scored and contacted.",
      href: "/research",
      count: Math.min(settings.dailyResearchTarget, needsResearch),
      done: 0,
    });
  }
  if (followUpsDueToday + followUpsOverdue > 0) {
    mission.push({
      id: "follow_up",
      kind: "follow_up",
      label: `Send ${followUpsDueToday + followUpsOverdue} due follow-up${followUpsDueToday + followUpsOverdue === 1 ? "" : "s"}`,
      detail: followUpsOverdue > 0 ? `${followUpsOverdue} overdue — clear these first.` : "All due today.",
      href: "/tasks?filter=due",
      count: followUpsDueToday + followUpsOverdue,
      done: 0,
    });
  }
  const qualifiedNoDiscovery = num(
    db
      .select({ n: count() })
      .from(leads)
      .where(
        and(
          live,
          eq(leads.replySentiment, "qualified_problem"),
          sql`${leads.id} not in (select lead_id from discoveries)`,
        ),
      )
      .get()?.n,
  );
  if (qualifiedNoDiscovery > 0) {
    mission.push({
      id: "discovery",
      kind: "discovery",
      label: "Prepare one discovery brief",
      detail: "A lead has described a qualified problem with no discovery record yet.",
      href: "/conversations?filter=qualified",
      count: 1,
      done: 0,
    });
  }
  if (caseStudyCandidates > 0) {
    mission.push({
      id: "case_study",
      kind: "case_study",
      label: "Review one case-study opportunity",
      detail: "Check evidence, scope and the success metric before offering the build.",
      href: "/opportunities?stage=case_study_candidate",
      count: 1,
      done: 0,
    });
  }

  /* Recent wins / losses */
  const recent = db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      stage: opportunities.stage,
      wonAt: opportunities.wonAt,
      lostAt: opportunities.lostAt,
      leadId: opportunities.leadId,
    })
    .from(opportunities)
    .where(inArray(opportunities.stage, ["won", "lost"]))
    .orderBy(desc(opportunities.updatedAt))
    .limit(5)
    .all();

  return {
    settings,
    counts: {
      repliesAwaiting,
      followUpsDueToday,
      followUpsOverdue,
      highFitUntouched,
      needsResearch,
      activeDiscovery,
      caseStudyCandidates,
      qualifiedOpps,
      readyToContact,
    },
    today: {
      outreachSent,
      repliesReceived,
      meetingsBooked,
      proposalsSent,
      caseStudiesAgreed,
      paidOppsCreated,
      positiveReplyRatePct,
      pipelineValue,
    },
    progress: {
      warmList: { value: warmCount, target: settings.warmListTarget },
      outreachToday: { value: outreachSent, target: settings.dailyOutreachTarget },
      repliesThisWeek: { value: repliesThisWeek, target: settings.weeklyReplyGoal },
      discoveryConversations: { value: activeDiscovery, target: settings.discoveryConversationTarget },
      caseStudies: { value: caseStudiesAgreed, target: settings.caseStudyTarget },
      paidClients: { value: paidClients, target: settings.paidClientTarget },
    },
    mission,
    recentOutcomes: recent.map((r) => ({
      id: r.id,
      title: r.title,
      stage: r.stage as "won" | "lost",
      when: (r.stage === "won" ? r.wonAt : r.lostAt) ?? new Date(0),
      leadId: r.leadId,
    })),
  };
}
