import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  activities,
  automationOpportunities,
  buyingSignals,
  caseStudies,
  companies,
  conversationEntries,
  conversations,
  discoveries,
  leads,
  messages,
  opportunities,
  painHypotheses,
  replyAnalyses,
  researchItems,
  scores,
  stageHistory,
  tasks,
  workflowEdges,
  workflowNodes,
  type Activity,
  type AutomationOpportunity,
  type BuyingSignal,
  type CaseStudy,
  type Company,
  type Conversation,
  type ConversationEntry,
  type Discovery,
  type Lead,
  type Message,
  type Opportunity,
  type PainHypothesis,
  type ReplyAnalysis,
  type ResearchItem,
  type Score,
  type Task,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/db/schema";

export type LeadDetail = {
  lead: Lead;
  company: Company | null;
  scores: Score[];
  research: ResearchItem[];
  signals: BuyingSignal[];
  pains: PainHypothesis[];
  messages: Message[];
  conversation: Conversation | null;
  entries: ConversationEntry[];
  analyses: ReplyAnalysis[];
  discovery: Discovery | null;
  autoOpps: AutomationOpportunity[];
  workflowNodes: WorkflowNode[];
  workflowEdges: WorkflowEdge[];
  opportunities: Opportunity[];
  caseStudy: CaseStudy | null;
  tasks: Task[];
  activities: Activity[];
  stageChanges: Array<{ id: string; fromStage: string | null; toStage: string; reason: string | null; createdAt: Date; entity: string }>;
};

export function loadLeadDetail(id: string): LeadDetail | null {
  const db = getDb();
  const lead = db.select().from(leads).where(and(eq(leads.id, id), isNull(leads.deletedAt))).get();
  if (!lead) return null;

  const company = lead.companyId ? (db.select().from(companies).where(eq(companies.id, lead.companyId)).get() ?? null) : null;
  const scoreRows = db.select().from(scores).where(eq(scores.leadId, id)).all();
  const research = db.select().from(researchItems).where(eq(researchItems.leadId, id)).orderBy(desc(researchItems.createdAt)).all();
  const signals = db.select().from(buyingSignals).where(eq(buyingSignals.leadId, id)).orderBy(desc(buyingSignals.createdAt)).all();
  const pains = db.select().from(painHypotheses).where(eq(painHypotheses.leadId, id)).orderBy(desc(painHypotheses.createdAt)).all();
  const messageRows = db.select().from(messages).where(eq(messages.leadId, id)).orderBy(desc(messages.createdAt)).all();
  const conversation = db.select().from(conversations).where(eq(conversations.leadId, id)).orderBy(desc(conversations.startedAt)).get() ?? null;
  const entries = conversation
    ? db.select().from(conversationEntries).where(eq(conversationEntries.conversationId, conversation.id)).orderBy(asc(conversationEntries.occurredAt)).all()
    : [];
  const analyses = db.select().from(replyAnalyses).where(eq(replyAnalyses.leadId, id)).orderBy(desc(replyAnalyses.createdAt)).all();
  const discovery = db.select().from(discoveries).where(eq(discoveries.leadId, id)).orderBy(desc(discoveries.updatedAt)).get() ?? null;
  const autoOpps = db.select().from(automationOpportunities).where(eq(automationOpportunities.leadId, id)).orderBy(desc(automationOpportunities.updatedAt)).all();
  const oppIds = autoOpps.map((o) => o.id);
  const wfNodes = oppIds.length
    ? db.select().from(workflowNodes).all().filter((n) => oppIds.includes(n.opportunityId))
    : [];
  const wfEdges = oppIds.length
    ? db.select().from(workflowEdges).all().filter((e) => oppIds.includes(e.opportunityId))
    : [];
  const opps = db.select().from(opportunities).where(eq(opportunities.leadId, id)).orderBy(desc(opportunities.updatedAt)).all();
  const caseStudy = db.select().from(caseStudies).where(eq(caseStudies.leadId, id)).orderBy(desc(caseStudies.updatedAt)).get() ?? null;
  const taskRows = db.select().from(tasks).where(eq(tasks.leadId, id)).orderBy(asc(tasks.dueAt)).all();
  const activityRows = db.select().from(activities).where(eq(activities.leadId, id)).orderBy(desc(activities.createdAt)).limit(200).all();
  const stageChanges = db
    .select()
    .from(stageHistory)
    .where(eq(stageHistory.leadId, id))
    .orderBy(desc(stageHistory.createdAt))
    .limit(100)
    .all()
    .map((s) => ({ id: s.id, fromStage: s.fromStage, toStage: s.toStage, reason: s.reason, createdAt: s.createdAt, entity: s.entity }));

  return {
    lead,
    company,
    scores: scoreRows,
    research,
    signals,
    pains,
    messages: messageRows,
    conversation,
    entries,
    analyses,
    discovery,
    autoOpps,
    workflowNodes: wfNodes,
    workflowEdges: wfEdges,
    opportunities: opps,
    caseStudy,
    tasks: taskRows,
    activities: activityRows,
    stageChanges,
  };
}
