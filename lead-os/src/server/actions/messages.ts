"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { conversationEntries, conversations, leads, messages, tasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { getSettings } from "@/lib/settings";
import { MESSAGE_TYPES, MESSAGE_TYPE_LABELS } from "@/lib/constants";
import { loadScoringInput } from "@/server/lead-service";
import {
  DEFAULT_CONTROLS,
  PROMPT_VERSION,
  generateMessage,
  type GenerationControls,
} from "@/lib/messages/generator";
import { canSendOutbound, suggestFollowUp } from "@/lib/followups";
import { runStructured } from "@/lib/ai";

/* ------------------------------------------------------------------ */
/* Generate                                                            */
/* ------------------------------------------------------------------ */

const controlsSchema = z.object({
  tone: z.enum(["warm", "neutral", "professional"]),
  length: z.enum(["short", "medium"]),
  directness: z.enum(["gentle", "direct"]),
  techDepth: z.enum(["plain", "technical"]),
  ctaStrength: z.enum(["soft", "clear"]),
});

const generateSchema = z.object({
  leadId: z.string().min(1),
  msgType: z.enum(MESSAGE_TYPES),
  controls: controlsSchema.partial().optional(),
  useAi: z.boolean().optional(),
});

export type GenerateResult =
  | { ok: true; messageId: string; body: string; evidenceUsed: string[]; notes: string[]; source: "rules" | "ai" }
  | { ok: false; error: string; missing?: string[]; suggestion?: string };

const aiPolishSchema = z.object({ body: z.string().min(10) });

export async function generateMessageAction(input: z.infer<typeof generateSchema>): Promise<GenerateResult> {
  const user = await requireUser();
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid generation request." };
  const { leadId, msgType } = parsed.data;
  const controls: GenerationControls = { ...DEFAULT_CONTROLS, ...(parsed.data.controls ?? {}) };

  const scoringInput = loadScoringInput(leadId);
  if (!scoringInput) return { ok: false, error: "Lead not found." };

  const db = getDb();
  const lastOutboundMsg = db
    .select()
    .from(messages)
    .where(and(eq(messages.leadId, leadId), eq(messages.status, "sent")))
    .orderBy(desc(messages.sentAt))
    .get();
  const lastInbound = db
    .select()
    .from(conversationEntries)
    .where(and(eq(conversationEntries.leadId, leadId), eq(conversationEntries.direction, "inbound")))
    .orderBy(desc(conversationEntries.occurredAt))
    .get();

  const result = generateMessage(msgType, {
    input: scoringInput,
    controls,
    lastInboundText: lastInbound?.content ?? null,
    lastOutbound: lastOutboundMsg ?? null,
    followUpCount: scoringInput.lead.followUpCount,
    senderName: user.name,
  });

  if (!result.ok) {
    return { ok: false, error: "Can't draft this yet.", missing: result.missing, suggestion: result.suggestion };
  }

  let body = result.body;
  let source: "rules" | "ai" = "rules";

  if (parsed.data.useAi) {
    const polished = await runStructured({
      purpose: `message_polish:${msgType}`,
      promptVersion: `${PROMPT_VERSION}+polish-v1`,
      leadId,
      system: [
        "You polish outreach drafts for Charlie, a UK automation consultant.",
        "Rewrite the draft to flow more naturally in British English while keeping his approachable, direct tone.",
        "HARD RULES: Do not add any facts, claims, names, achievements or familiarity not present in the draft.",
        "Do not add urgency or salesy language. Keep it the same length or shorter. Keep the same single question.",
        "Keep the same greeting name and sign-off name.",
      ].join(" "),
      user: `Draft to polish:\n\n${body}`,
      schema: aiPolishSchema,
      jsonSchema: {
        type: "object",
        properties: { body: { type: "string", description: "The polished message, plain text." } },
        required: ["body"],
      },
    });
    if (polished) {
      body = polished.body;
      source = "ai";
    }
  }

  const version =
    (db
      .select({ v: messages.versionNum })
      .from(messages)
      .where(and(eq(messages.leadId, leadId), eq(messages.msgType, msgType)))
      .orderBy(desc(messages.versionNum))
      .get()?.v ?? 0) + 1;

  const id = newId("msg");
  db.insert(messages)
    .values({
      id,
      leadId,
      msgType,
      channel: scoringInput.lead.channel ?? "linkedin",
      subject: result.subject,
      body,
      evidenceUsed: result.evidenceUsed,
      generationSource: source,
      generationControls: controls as unknown as Record<string, string>,
      promptVersion: source === "ai" ? `${PROMPT_VERSION}+polish-v1` : PROMPT_VERSION,
      status: "draft",
      versionNum: version,
    })
    .run();

  logActivity({
    leadId,
    entity: "message",
    entityId: id,
    action: "message_generated",
    detail: `${MESSAGE_TYPE_LABELS[msgType]} v${version} (${source === "ai" ? "rules + AI polish" : "rules engine"})`,
    actor: source === "ai" ? "ai" : "system",
  });
  revalidatePath(`/leads/${leadId}`);
  return { ok: true, messageId: id, body, evidenceUsed: result.evidenceUsed, notes: result.notes, source };
}

/* ------------------------------------------------------------------ */
/* Edit / discard                                                      */
/* ------------------------------------------------------------------ */

const editSchema = z.object({
  messageId: z.string().min(1),
  body: z.string().trim().min(5, "The message is empty").max(4000),
  subject: z.string().trim().max(200).optional(),
});

export async function editMessageAction(input: z.infer<typeof editSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = getDb();
  const msg = db.select().from(messages).where(eq(messages.id, parsed.data.messageId)).get();
  if (!msg) return { ok: false, error: "Message not found." };
  if (msg.status === "sent") return { ok: false, error: "Sent messages are immutable — generate a new draft instead." };
  db.update(messages)
    .set({ body: parsed.data.body, subject: parsed.data.subject || msg.subject, generationSource: "human" })
    .where(eq(messages.id, msg.id))
    .run();
  logActivity({ leadId: msg.leadId, entity: "message", entityId: msg.id, action: "message_edited", detail: `${MESSAGE_TYPE_LABELS[msg.msgType]} v${msg.versionNum} edited by hand` });
  revalidatePath(`/leads/${msg.leadId}`);
  return { ok: true };
}

export async function discardMessageAction(input: { messageId: string }): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const db = getDb();
  const msg = db.select().from(messages).where(eq(messages.id, input.messageId)).get();
  if (!msg) return { ok: false, error: "Message not found." };
  if (msg.status === "sent") return { ok: false, error: "Sent messages can't be discarded — they're part of the record." };
  db.update(messages).set({ status: "discarded" }).where(eq(messages.id, msg.id)).run();
  revalidatePath(`/leads/${msg.leadId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Mark sent (the human approval step)                                 */
/* ------------------------------------------------------------------ */

export type MarkSentResult =
  | { ok: true }
  | { ok: false; error: string; blocked?: string[] };

export async function markSentAction(input: { messageId: string; overrideGuard?: boolean }): Promise<MarkSentResult> {
  await requireUser();
  const db = getDb();
  const msg = db.select().from(messages).where(eq(messages.id, input.messageId)).get();
  if (!msg) return { ok: false, error: "Message not found." };
  if (msg.status === "sent") return { ok: false, error: "Already marked as sent." };

  const lead = db.select().from(leads).where(eq(leads.id, msg.leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };

  const settings = getSettings();
  const lastOutbound = db
    .select()
    .from(conversationEntries)
    .where(and(eq(conversationEntries.leadId, lead.id), eq(conversationEntries.direction, "outbound")))
    .orderBy(desc(conversationEntries.occurredAt))
    .get();
  const repliedSince = lastOutbound
    ? !!db
        .select({ id: conversationEntries.id })
        .from(conversationEntries)
        .where(
          and(
            eq(conversationEntries.leadId, lead.id),
            eq(conversationEntries.direction, "inbound"),
            gt(conversationEntries.occurredAt, lastOutbound.occurredAt),
          ),
        )
        .get()
    : false;

  const guard = canSendOutbound(lead, lastOutbound?.occurredAt ?? null, repliedSince, settings);
  if (!guard.allowed) {
    if (lead.doNotContact) return { ok: false, error: "Blocked: this lead is do-not-contact.", blocked: guard.reasons };
    if (!input.overrideGuard) return { ok: false, error: "Outreach guard triggered.", blocked: guard.reasons };
    logActivity({ leadId: lead.id, entity: "message", entityId: msg.id, action: "message_sent", detail: `Guard overridden by user: ${guard.reasons.join(" | ")}` });
  }

  const now = new Date();

  // Ensure a conversation exists and log the outbound entry.
  let conv = db.select().from(conversations).where(eq(conversations.leadId, lead.id)).get();
  if (!conv) {
    const convId = newId("cnv");
    db.insert(conversations).values({ id: convId, leadId: lead.id, channel: msg.channel }).run();
    conv = db.select().from(conversations).where(eq(conversations.id, convId)).get()!;
  }
  db.insert(conversationEntries)
    .values({
      id: newId("ent"),
      conversationId: conv.id,
      leadId: lead.id,
      direction: "outbound",
      entryType: "message_sent",
      content: msg.body,
      messageId: msg.id,
      occurredAt: now,
    })
    .run();
  db.update(conversations).set({ lastEntryAt: now }).where(eq(conversations.id, conv.id)).run();

  db.update(messages).set({ status: "sent", sentAt: now }).where(eq(messages.id, msg.id)).run();

  // Lead bookkeeping.
  const isFollowUp = msg.msgType === "follow_up_1" || msg.msgType === "follow_up_2" || msg.msgType === "final_close";
  const newFollowUpCount = isFollowUp ? lead.followUpCount + 1 : lead.followUpCount;

  // Schedule the next follow-up unless the thread is closed or this was a reply.
  const isReplyType = ["reply_positive", "reply_vague", "reply_objection"].includes(msg.msgType);
  let nextAction: string | null = null;
  let nextActionDue: Date | null = null;
  if (msg.msgType !== "final_close" && !isReplyType) {
    const next = suggestFollowUp(newFollowUpCount, settings, now);
    if (next) {
      nextAction = `${next.label} if no reply`;
      nextActionDue = next.dueAt;
      db.insert(tasks)
        .values({
          id: newId("tsk"),
          leadId: lead.id,
          kind: "follow_up",
          title: `${next.label}: ${lead.fullName}`,
          detail: `No-reply follow-up after "${MESSAGE_TYPE_LABELS[msg.msgType]}". Cancelled automatically if they reply.`,
          dueAt: next.dueAt,
        })
        .run();
      logActivity({ leadId: lead.id, entity: "task", action: "task_created", detail: `${next.label} scheduled for ${next.dueAt.toDateString()}`, actor: "system" });
    } else {
      nextAction = "Follow-up limit reached — move to nurture or close politely";
    }
  } else if (isReplyType) {
    nextAction = "Await their response";
  }

  db.update(leads)
    .set({
      status: "contacted",
      lastContactedAt: now,
      lastInteractionAt: now,
      interactionCount: lead.interactionCount + 1,
      followUpCount: newFollowUpCount,
      nextAction,
      nextActionDue,
      channel: msg.channel,
    })
    .where(eq(leads.id, lead.id))
    .run();

  logActivity({ leadId: lead.id, entity: "message", entityId: msg.id, action: "message_sent", detail: `${MESSAGE_TYPE_LABELS[msg.msgType]} v${msg.versionNum} marked as sent (${msg.channel})` });
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true };
}
