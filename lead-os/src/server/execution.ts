import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { getDb } from "@/db";
import { companies, conversationEntries, leads, messages, painHypotheses, replyAnalyses, researchItems, tasks } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import type { IcpCategory, LeadStage, MessageType, PriorityLabel, ReplyClassification } from "@/lib/constants";

export type ExecutionItem = {
  leadId: string;
  fullName: string;
  jobTitle: string | null;
  companyName: string | null;
  icpCategory: IcpCategory | null;
  status: LeadStage;
  priorityLabel: PriorityLabel | null;
  overallScore: number | null;
  warmth: string;
  kind: "respond" | "overdue_follow_up" | "follow_up_due" | "contact" | "research";
  reason: string;
  taskId: string | null;
  taskTitle: string | null;
  latestDraft: { id: string; msgType: MessageType; body: string; status: string } | null;
  lastInbound: { content: string; classification: ReplyClassification | null; recommendedNextQuestion: string | null } | null;
  confirmedPains: string[];
  researchHighlights: string[];
  evidence: string[];
  dataSource: string;
};

export type ExecutionQueue = {
  items: ExecutionItem[];
  sentToday: number;
  dailyTarget: number;
};

export function buildExecutionQueue(): ExecutionQueue {
  const db = getDb();
  const settings = getSettings();
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const live = and(isNull(leads.deletedAt), eq(leads.doNotContact, false));
  const items: ExecutionItem[] = [];
  const seen = new Set<string>();

  const hydrate = (
    leadRow: {
      id: string;
      fullName: string;
      jobTitle: string | null;
      icpCategory: IcpCategory | null;
      status: LeadStage;
      priorityLabel: PriorityLabel | null;
      overallScore: number | null;
      warmth: string;
      dataSource: string;
      companyName: string | null;
    },
    kind: ExecutionItem["kind"],
    reason: string,
    task?: { id: string; title: string } | null,
  ): ExecutionItem => {
    const draft = db
      .select()
      .from(messages)
      .where(and(eq(messages.leadId, leadRow.id), eq(messages.status, "draft")))
      .orderBy(desc(messages.createdAt))
      .get();
    const inbound = db
      .select()
      .from(conversationEntries)
      .where(and(eq(conversationEntries.leadId, leadRow.id), eq(conversationEntries.direction, "inbound")))
      .orderBy(desc(conversationEntries.occurredAt))
      .get();
    const analysis = inbound
      ? db.select().from(replyAnalyses).where(eq(replyAnalyses.entryId, inbound.id)).get()
      : undefined;
    const pains = db
      .select()
      .from(painHypotheses)
      .where(and(eq(painHypotheses.leadId, leadRow.id), eq(painHypotheses.status, "confirmed")))
      .limit(3)
      .all();
    const research = db
      .select()
      .from(researchItems)
      .where(eq(researchItems.leadId, leadRow.id))
      .orderBy(desc(researchItems.createdAt))
      .limit(2)
      .all();

    const evidence: string[] = [];
    if (leadRow.overallScore !== null) evidence.push(`Overall priority score ${leadRow.overallScore}/100 (rules engine — see Intelligence tab)`);
    for (const p of pains) evidence.push(`Confirmed pain: ${p.hypothesis}${p.evidence ? ` (evidence: ${p.evidence.slice(0, 100)})` : ""}`);
    if (analysis?.classification) evidence.push(`Last reply classified: ${analysis.classification} (${analysis.confidence} confidence)`);

    return {
      leadId: leadRow.id,
      fullName: leadRow.fullName,
      jobTitle: leadRow.jobTitle,
      companyName: leadRow.companyName,
      icpCategory: leadRow.icpCategory,
      status: leadRow.status,
      priorityLabel: leadRow.priorityLabel,
      overallScore: leadRow.overallScore,
      warmth: leadRow.warmth,
      kind,
      reason,
      taskId: task?.id ?? null,
      taskTitle: task?.title ?? null,
      latestDraft: draft ? { id: draft.id, msgType: draft.msgType, body: draft.body, status: draft.status } : null,
      lastInbound: inbound
        ? {
            content: inbound.content,
            classification: analysis?.classification ?? null,
            recommendedNextQuestion: analysis?.recommendedNextQuestion ?? null,
          }
        : null,
      confirmedPains: pains.map((p) => p.hypothesis),
      researchHighlights: research.map((r) => `${r.title}: ${r.content.slice(0, 140)}`),
      evidence,
      dataSource: leadRow.dataSource,
    };
  };

  const leadCols = {
    id: leads.id,
    fullName: leads.fullName,
    jobTitle: leads.jobTitle,
    icpCategory: leads.icpCategory,
    status: leads.status,
    priorityLabel: leads.priorityLabel,
    overallScore: leads.overallScore,
    warmth: leads.warmth,
    dataSource: leads.dataSource,
    companyName: companies.name,
  };

  /* 1. Replies awaiting response — momentum first. Oldest wait first. */
  const replied = db
    .select(leadCols)
    .from(leads)
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(and(live, eq(leads.status, "replied")))
    .orderBy(asc(leads.lastInteractionAt))
    .limit(10)
    .all();
  for (const l of replied) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    items.push(hydrate(l, "respond", "They replied and are waiting on you — response speed is the biggest controllable factor in keeping conversations alive."));
  }

  /* 2 & 3. Follow-up tasks: overdue first, then due today. */
  const openTask = and(eq(tasks.status, "open"), or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, now)));
  const dueTasks = db
    .select({ task: tasks, lead: leadCols })
    .from(tasks)
    .innerJoin(leads, eq(tasks.leadId, leads.id))
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(and(openTask, eq(tasks.kind, "follow_up"), lte(tasks.dueAt, dayEnd), isNull(leads.deletedAt), eq(leads.doNotContact, false)))
    .orderBy(asc(tasks.dueAt))
    .limit(15)
    .all();
  for (const row of dueTasks) {
    if (seen.has(row.lead.id)) continue;
    seen.add(row.lead.id);
    const overdue = row.task.dueAt ? row.task.dueAt < dayStart : false;
    items.push(
      hydrate(
        row.lead,
        overdue ? "overdue_follow_up" : "follow_up_due",
        overdue
          ? `"${row.task.title}" was due ${row.task.dueAt?.toDateString()} — overdue follow-ups quietly kill reply rates.`
          : `"${row.task.title}" is due today, inside your configured cadence.`,
        { id: row.task.id, title: row.task.title },
      ),
    );
  }

  /* 4. Highest-priority contactable leads, up to the daily target. */
  const sentToday = db
    .select({ n: messages.id })
    .from(messages)
    .where(and(eq(messages.status, "sent"), gte(messages.sentAt, dayStart), lte(messages.sentAt, dayEnd)))
    .all().length;
  const contactBudget = Math.max(0, settings.dailyOutreachTarget - sentToday);
  if (contactBudget > 0) {
    const ready = db
      .select(leadCols)
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(and(live, inArray(leads.status, ["ready_to_contact", "researched"])))
      .orderBy(desc(leads.overallScore))
      .limit(contactBudget + 5)
      .all();
    for (const l of ready) {
      if (seen.has(l.id) || items.filter((i) => i.kind === "contact").length >= contactBudget) continue;
      seen.add(l.id);
      const p1 = l.priorityLabel === "p1_contact_now";
      items.push(
        hydrate(
          l,
          "contact",
          `${p1 ? "Marked P1 — contact now. " : ""}Score ${l.overallScore ?? "—"}/100 puts them at the top of the contactable list${l.warmth === "warm" ? "; warm relationship" : ""}.`,
        ),
      );
    }
  }

  /* 5. High-fit leads stuck in research. */
  const researchNeeded = db
    .select(leadCols)
    .from(leads)
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(and(live, inArray(leads.status, ["imported", "needs_research"])))
    .orderBy(desc(leads.overallScore))
    .limit(settings.dailyResearchTarget)
    .all();
  for (const l of researchNeeded) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    items.push(
      hydrate(
        l,
        "research",
        `High-potential lead still unresearched (score ${l.overallScore ?? "—"} on current data). Ten minutes of research makes the first message specific instead of generic.`,
      ),
    );
  }

  return { items, sentToday, dailyTarget: settings.dailyOutreachTarget };
}
