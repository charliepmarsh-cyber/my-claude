"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { conversationEntries, conversations, leads, replyAnalyses, tasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { analyseReply } from "@/lib/reply-analysis";
import { isPeerCategory } from "@/lib/pain-suggestions";
import { CONVERSATION_STAGES, REPLY_CLASSIFICATIONS, type ReplyClassification } from "@/lib/constants";
import { recomputeLead } from "@/server/lead-service";
import { runStructured } from "@/lib/ai";

function ensureConversation(leadId: string, channel: "linkedin" | "email" | "phone" | "in_person" | "other") {
  const db = getDb();
  let conv = db.select().from(conversations).where(eq(conversations.leadId, leadId)).get();
  if (!conv) {
    const id = newId("cnv");
    db.insert(conversations).values({ id, leadId, channel }).run();
    conv = db.select().from(conversations).where(eq(conversations.id, id)).get()!;
  }
  return conv;
}

/* ------------------------------------------------------------------ */
/* Record a reply (+ conservative analysis)                            */
/* ------------------------------------------------------------------ */

const replySchema = z.object({
  leadId: z.string().min(1),
  text: z.string().trim().min(1, "Paste their reply").max(8000),
  occurredAt: z.string().optional(),
});

const aiAnalysisSchema = z.object({
  classification: z.enum(REPLY_CLASSIFICATIONS),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string(),
  explicitProblem: z.string().nullable(),
  impliedPain: z.string().nullable(),
  currentProcess: z.string().nullable(),
  frequency: z.string().nullable(),
  consequence: z.string().nullable(),
  toolsMentioned: z.array(z.string()),
  authoritySignal: z.string().nullable(),
  interestLevel: z.enum(["none", "low", "medium", "high", "unclear"]),
  techSophistication: z.string().nullable(),
  humanJudgementAreas: z.string().nullable(),
  possibleObjections: z.array(z.string()),
  recommendedNextQuestion: z.string().nullable(),
  nextQuestionReason: z.string().nullable(),
  recommendation: z.enum(["continue_discovery", "propose_action", "nurture", "close_politely", "treat_as_peer", "await_reply"]),
});

export async function recordReplyAction(input: z.infer<typeof replySchema>): Promise<{ ok: boolean; error?: string; classification?: string }> {
  await requireUser();
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { leadId, text } = parsed.data;

  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };

  const occurredAt = parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date();
  const conv = ensureConversation(leadId, lead.channel ?? "linkedin");

  const entryId = newId("ent");
  db.insert(conversationEntries)
    .values({
      id: entryId,
      conversationId: conv.id,
      leadId,
      direction: "inbound",
      entryType: "reply_received",
      content: text,
      occurredAt,
    })
    .run();
  db.update(conversations).set({ lastEntryAt: occurredAt }).where(eq(conversations.id, conv.id)).run();
  logActivity({ leadId, entity: "conversation", entityId: entryId, action: "reply_recorded", detail: text.slice(0, 140) });

  /* Rules analysis (always) */
  const peer = isPeerCategory(lead.icpCategory);
  const rules = analyseReply(text, { isPeer: peer });

  /* Optional AI enhancement — instructed to stay conservative */
  type FullAnalysis = Omit<ReturnType<typeof analyseReply>, "confidence"> & {
    confidence: "low" | "medium" | "high";
    recommendedNextQuestion: string | null;
    nextQuestionReason: string | null;
  };
  let analysis: FullAnalysis = { ...rules, recommendedNextQuestion: null, nextQuestionReason: null };
  let analysisSource: "rules" | "ai" = "rules";
  const ai = await runStructured({
    purpose: "reply_analysis",
    promptVersion: "reply-v1",
    leadId,
    system: [
      "You analyse replies to consultative outreach for a UK automation consultant.",
      "Be CONSERVATIVE: politeness is not buying intent; a friendly thanks is 'neutral'.",
      "Only classify 'qualified_problem' when they describe a specific problem in their own words.",
      "If the person appears to be a fellow AI/automation practitioner, classify 'peer_discussion' and recommend 'treat_as_peer'.",
      "Never invent facts. Fields you can't ground in the text must be null.",
      "recommendedNextQuestion must come from consultative discovery (how handled, frequency, owner, time cost, failure modes, tools, judgement, ideal outcome, commercial importance) — one question only.",
    ].join(" "),
    user: `Lead category: ${lead.icpCategory ?? "unknown"}${peer ? " (peer category)" : ""}\n\nTheir reply:\n"""${text}"""`,
    schema: aiAnalysisSchema,
    jsonSchema: {
      type: "object",
      properties: {
        classification: { type: "string", enum: [...REPLY_CLASSIFICATIONS] },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        rationale: { type: "string" },
        explicitProblem: { type: ["string", "null"] },
        impliedPain: { type: ["string", "null"] },
        currentProcess: { type: ["string", "null"] },
        frequency: { type: ["string", "null"] },
        consequence: { type: ["string", "null"] },
        toolsMentioned: { type: "array", items: { type: "string" } },
        authoritySignal: { type: ["string", "null"] },
        interestLevel: { type: "string", enum: ["none", "low", "medium", "high", "unclear"] },
        techSophistication: { type: ["string", "null"] },
        humanJudgementAreas: { type: ["string", "null"] },
        possibleObjections: { type: "array", items: { type: "string" } },
        recommendedNextQuestion: { type: ["string", "null"] },
        nextQuestionReason: { type: ["string", "null"] },
        recommendation: {
          type: "string",
          enum: ["continue_discovery", "propose_action", "nurture", "close_politely", "treat_as_peer", "await_reply"],
        },
      },
      required: ["classification", "confidence", "rationale", "toolsMentioned", "possibleObjections", "interestLevel", "recommendation"],
    },
  });

  if (ai) {
    // AI must not upgrade beyond what rules + text support: cap qualified_problem→ keep, but
    // never let AI turn a rules-neutral short reply into meeting_ready/qualified.
    const upgrade = ["qualified_problem", "meeting_ready", "positive"].includes(ai.classification);
    const rulesWeak = ["neutral", "vague"].includes(rules.classification) && text.trim().length < 80;
    if (!(upgrade && rulesWeak)) {
      analysis = { ...ai, recommendedNextQuestion: ai.recommendedNextQuestion, nextQuestionReason: ai.nextQuestionReason };
      analysisSource = "ai";
    }
  }

  db.insert(replyAnalyses)
    .values({
      id: newId("ran"),
      entryId,
      leadId,
      classification: analysis.classification,
      confidence: analysis.confidence,
      explicitProblem: analysis.explicitProblem,
      impliedPain: analysis.impliedPain,
      currentProcess: analysis.currentProcess,
      frequency: analysis.frequency,
      consequence: analysis.consequence,
      toolsMentioned: analysis.toolsMentioned,
      authoritySignal: analysis.authoritySignal,
      interestLevel: analysis.interestLevel,
      techSophistication: analysis.techSophistication,
      humanJudgementAreas: analysis.humanJudgementAreas,
      possibleObjections: analysis.possibleObjections,
      recommendedNextQuestion: analysis.recommendedNextQuestion,
      nextQuestionReason: analysis.nextQuestionReason,
      recommendation: analysis.recommendation,
      analysisSource,
      rationale: analysis.rationale,
    })
    .run();
  logActivity({
    leadId,
    entity: "conversation",
    entityId: entryId,
    action: "reply_analysed",
    detail: `${analysis.classification} (${analysis.confidence} confidence, ${analysisSource})`,
    actor: analysisSource === "ai" ? "ai" : "system",
  });

  /* Lead bookkeeping — deterministic */
  const isPeerConv = analysis.classification === "peer_discussion";
  if (isPeerConv) {
    db.update(conversations).set({ isPeerConversation: true }).where(eq(conversations.id, conv.id)).run();
  }
  db.update(leads)
    .set({
      status: "replied",
      replySentiment: analysis.classification,
      lastInteractionAt: occurredAt,
      interactionCount: lead.interactionCount + 1,
      conversationStage:
        lead.conversationStage ??
        (["qualified_problem", "positive", "curious", "meeting_ready"].includes(analysis.classification)
          ? "discovery_started"
          : lead.conversationStage),
      nextAction:
        analysis.recommendation === "close_politely"
          ? "Send a polite close — they've declined"
          : analysis.recommendation === "treat_as_peer"
            ? "Respond as a peer — no pitching"
            : analysis.recommendation === "nurture"
              ? "Schedule a nurture check-in"
              : "Respond to their reply",
      nextActionDue: new Date(),
    })
    .where(eq(leads.id, leadId))
    .run();

  // They replied — cancel pending no-reply follow-up tasks.
  db.update(tasks)
    .set({ status: "cancelled" })
    .where(and(eq(tasks.leadId, leadId), eq(tasks.kind, "follow_up"), eq(tasks.status, "open")))
    .run();

  recomputeLead(leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/conversations");
  revalidatePath("/");
  return { ok: true, classification: analysis.classification };
}

/* ------------------------------------------------------------------ */
/* Notes, calls, meetings                                              */
/* ------------------------------------------------------------------ */

const entrySchema = z.object({
  leadId: z.string().min(1),
  entryType: z.enum(["note", "call", "meeting", "file"]),
  content: z.string().trim().min(1, "Add some content").max(8000),
  attachmentName: z.string().trim().max(200).optional(),
  occurredAt: z.string().optional(),
});

export async function addEntryAction(input: z.infer<typeof entrySchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { leadId, entryType, content } = parsed.data;
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };
  const conv = ensureConversation(leadId, lead.channel ?? "linkedin");
  const occurredAt = parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date();

  db.insert(conversationEntries)
    .values({
      id: newId("ent"),
      conversationId: conv.id,
      leadId,
      direction: "internal",
      entryType,
      content,
      attachmentName: parsed.data.attachmentName || null,
      occurredAt,
    })
    .run();
  db.update(conversations).set({ lastEntryAt: occurredAt }).where(eq(conversations.id, conv.id)).run();

  if (entryType === "meeting") {
    db.update(leads).set({ meetingStatus: "held", lastInteractionAt: occurredAt, interactionCount: lead.interactionCount + 1 }).where(eq(leads.id, leadId)).run();
  } else if (entryType === "call") {
    db.update(leads).set({ lastInteractionAt: occurredAt, interactionCount: lead.interactionCount + 1 }).where(eq(leads.id, leadId)).run();
  }

  logActivity({
    leadId,
    entity: "conversation",
    action: entryType === "call" ? "call_logged" : entryType === "meeting" ? "meeting_logged" : "note_added",
    detail: content.slice(0, 140),
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/conversations");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Reclassify + stage                                                  */
/* ------------------------------------------------------------------ */

const reclassifySchema = z.object({
  analysisId: z.string().min(1),
  leadId: z.string().min(1),
  classification: z.enum(REPLY_CLASSIFICATIONS),
  reason: z.string().trim().min(3, "Give a short reason").max(400),
});

export async function reclassifyReplyAction(input: z.infer<typeof reclassifySchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = reclassifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = getDb();
  const row = db.select().from(replyAnalyses).where(eq(replyAnalyses.id, parsed.data.analysisId)).get();
  if (!row) return { ok: false, error: "Analysis not found." };
  db.update(replyAnalyses)
    .set({
      classification: parsed.data.classification as ReplyClassification,
      confidence: "high",
      analysisSource: "rules",
      rationale: `Human override: ${parsed.data.reason}`,
    })
    .where(eq(replyAnalyses.id, row.id))
    .run();
  db.update(leads).set({ replySentiment: parsed.data.classification as ReplyClassification }).where(eq(leads.id, parsed.data.leadId)).run();
  logActivity({ leadId: parsed.data.leadId, entity: "conversation", action: "reply_analysed", detail: `Reclassified to ${parsed.data.classification}: ${parsed.data.reason}` });
  recomputeLead(parsed.data.leadId);
  revalidatePath(`/leads/${parsed.data.leadId}`);
  return { ok: true };
}

const stageSchema = z.object({ leadId: z.string().min(1), stage: z.enum(CONVERSATION_STAGES) });

export async function setConversationStageAction(input: z.infer<typeof stageSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid stage" };
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, parsed.data.leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };
  db.update(leads).set({ conversationStage: parsed.data.stage }).where(eq(leads.id, lead.id)).run();
  const conv = db.select().from(conversations).where(eq(conversations.leadId, lead.id)).get();
  if (conv) db.update(conversations).set({ stage: parsed.data.stage }).where(eq(conversations.id, conv.id)).run();
  logActivity({ leadId: lead.id, entity: "conversation", action: "stage_changed", detail: `Conversation stage → ${parsed.data.stage}` });
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/conversations");
  return { ok: true };
}
