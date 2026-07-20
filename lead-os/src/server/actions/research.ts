"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { buyingSignals, companies, leads, painHypotheses, researchItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { PAIN_CATEGORIES, SIGNAL_TYPES } from "@/lib/constants";
import { moveLeadToStage, recomputeLead } from "@/server/lead-service";
import { suggestPains } from "@/lib/pain-suggestions";
import type { ActionResult } from "@/server/actions/leads";

function touch(leadId: string) {
  recomputeLead(leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/research");
}

/* ------------------------------------------------------------------ */
/* Research items                                                      */
/* ------------------------------------------------------------------ */

const researchSchema = z.object({
  leadId: z.string().min(1),
  kind: z.enum(["note", "company_snapshot", "website", "linkedin", "news", "tech_stack", "trigger_event"]),
  title: z.string().trim().min(1, "Give the research item a title").max(200),
  content: z.string().trim().min(1, "Add the research content").max(8000),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  confidence: z.enum(["low", "medium", "high"]),
});

export async function addResearchAction(input: z.infer<typeof researchSchema>): Promise<ActionResult> {
  await requireUser();
  const parsed = researchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = getDb();
  const v = parsed.data;
  db.insert(researchItems)
    .values({
      id: newId("res"),
      leadId: v.leadId,
      kind: v.kind,
      title: v.title,
      content: v.content,
      sourceUrl: v.sourceUrl ?? null,
      confidence: v.confidence,
    })
    .run();
  logActivity({ leadId: v.leadId, entity: "research", action: "research_added", detail: v.title });
  touch(v.leadId);
  return { ok: true };
}

export async function deleteResearchAction(input: { id: string; leadId: string }): Promise<ActionResult> {
  await requireUser();
  const db = getDb();
  db.delete(researchItems).where(eq(researchItems.id, input.id)).run();
  logActivity({ leadId: input.leadId, entity: "research", action: "research_removed" });
  touch(input.leadId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Buying signals                                                      */
/* ------------------------------------------------------------------ */

const signalSchema = z.object({
  leadId: z.string().min(1),
  signalType: z.enum(SIGNAL_TYPES),
  description: z.string().trim().min(1, "Describe the signal").max(1000),
  evidenceUrl: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  strength: z.enum(["weak", "moderate", "strong"]),
  observedAt: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
});

export async function addSignalAction(input: {
  leadId: string;
  signalType: (typeof SIGNAL_TYPES)[number];
  description: string;
  evidenceUrl?: string | null;
  strength: "weak" | "moderate" | "strong";
  observedAt?: string;
}): Promise<ActionResult> {
  await requireUser();
  const parsed = signalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = getDb();
  const v = parsed.data;
  db.insert(buyingSignals)
    .values({
      id: newId("sig"),
      leadId: v.leadId,
      signalType: v.signalType,
      description: v.description,
      evidenceUrl: v.evidenceUrl ?? null,
      strength: v.strength,
      observedAt: v.observedAt,
    })
    .run();
  logActivity({ leadId: v.leadId, entity: "signal", action: "signal_added", detail: `${v.signalType}: ${v.description.slice(0, 120)}` });
  touch(v.leadId);
  return { ok: true };
}

export async function deleteSignalAction(input: { id: string; leadId: string }): Promise<ActionResult> {
  await requireUser();
  const db = getDb();
  db.delete(buyingSignals).where(eq(buyingSignals.id, input.id)).run();
  touch(input.leadId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Pain hypotheses                                                     */
/* ------------------------------------------------------------------ */

const painSchema = z.object({
  leadId: z.string().min(1),
  category: z.enum(PAIN_CATEGORIES),
  hypothesis: z.string().trim().min(1, "State the hypothesis").max(1000),
  evidence: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  evidenceUrl: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  confidence: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  discoveryQuestion: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  automationDirection: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  humanJudgementNote: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export async function addPainAction(input: z.infer<typeof painSchema>): Promise<ActionResult> {
  await requireUser();
  const parsed = painSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = getDb();
  const v = parsed.data;
  db.insert(painHypotheses)
    .values({
      id: newId("pn"),
      leadId: v.leadId,
      category: v.category,
      hypothesis: v.hypothesis,
      evidence: v.evidence ?? null,
      evidenceUrl: v.evidenceUrl ?? null,
      confidence: v.confidence,
      impact: v.impact,
      discoveryQuestion: v.discoveryQuestion ?? null,
      automationDirection: v.automationDirection ?? null,
      humanJudgementNote: v.humanJudgementNote ?? null,
      status: "proposed",
      source: "human",
    })
    .run();
  logActivity({ leadId: v.leadId, entity: "pain", action: "pain_added", detail: v.hypothesis.slice(0, 140) });
  touch(v.leadId);
  return { ok: true };
}

/** Insert the rules-engine suggestions for this lead's category (skips ones already present). */
export async function suggestPainsAction(input: { leadId: string }): Promise<ActionResult & { added?: number }> {
  await requireUser();
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, input.leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found" };
  const suggestions = suggestPains(lead.icpCategory);
  if (suggestions.length === 0)
    return {
      ok: false,
      error: "No suggestions for this category — AI specialists are peers; ask about their client patterns instead.",
    };
  const existing = db.select().from(painHypotheses).where(eq(painHypotheses.leadId, input.leadId)).all();
  const existingKeys = new Set(existing.map((p) => `${p.category}|${p.hypothesis}`));
  let added = 0;
  for (const s of suggestions) {
    if (existingKeys.has(`${s.category}|${s.hypothesis}`)) continue;
    db.insert(painHypotheses)
      .values({
        id: newId("pn"),
        leadId: input.leadId,
        category: s.category,
        hypothesis: s.hypothesis,
        confidence: "low",
        impact: "medium",
        discoveryQuestion: s.discoveryQuestion,
        automationDirection: s.automationDirection,
        humanJudgementNote: s.humanJudgementNote,
        status: "proposed",
        source: "rules",
      })
      .run();
    added++;
  }
  logActivity({
    leadId: input.leadId,
    entity: "pain",
    action: "pain_added",
    detail: `${added} rules-based hypotheses suggested (unverified, low confidence)`,
    actor: "system",
  });
  touch(input.leadId);
  return { ok: true, added };
}

const painUpdateSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  status: z.enum(["proposed", "confirmed", "rejected"]).optional(),
  evidence: z.string().trim().max(2000).optional(),
  evidenceUrl: z.string().trim().max(500).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
});

export async function updatePainAction(input: z.infer<typeof painUpdateSchema>): Promise<ActionResult> {
  await requireUser();
  const parsed = painUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const v = parsed.data;
  const db = getDb();
  const row = db.select().from(painHypotheses).where(and(eq(painHypotheses.id, v.id), eq(painHypotheses.leadId, v.leadId))).get();
  if (!row) return { ok: false, error: "Hypothesis not found" };

  if (v.status === "confirmed" && !(v.evidence || row.evidence || v.evidenceUrl || row.evidenceUrl)) {
    return { ok: false, error: "Attach evidence before confirming — confirmations must be backed by something real." };
  }

  db.update(painHypotheses)
    .set({
      status: v.status ?? row.status,
      evidence: v.evidence !== undefined ? v.evidence || null : row.evidence,
      evidenceUrl: v.evidenceUrl !== undefined ? v.evidenceUrl || null : row.evidenceUrl,
      confidence: v.confidence ?? row.confidence,
    })
    .where(eq(painHypotheses.id, v.id))
    .run();
  logActivity({
    leadId: v.leadId,
    entity: "pain",
    action: "pain_updated",
    detail: v.status ? `${row.hypothesis.slice(0, 80)} → ${v.status}` : `Evidence updated on: ${row.hypothesis.slice(0, 80)}`,
  });
  touch(v.leadId);
  return { ok: true };
}

export async function deletePainAction(input: { id: string; leadId: string }): Promise<ActionResult> {
  await requireUser();
  const db = getDb();
  db.delete(painHypotheses).where(eq(painHypotheses.id, input.id)).run();
  touch(input.leadId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Company snapshot                                                    */
/* ------------------------------------------------------------------ */

const companySchema = z.object({
  leadId: z.string().min(1),
  name: z.string().trim().min(1, "Company name is required").max(200),
  website: z.string().trim().max(300).transform((v) => v || null).nullable().optional(),
  linkedinUrl: z.string().trim().max(300).transform((v) => v || null).nullable().optional(),
  description: z.string().trim().max(2000).transform((v) => v || null).nullable().optional(),
  industry: z.string().trim().max(120).transform((v) => v || null).nullable().optional(),
  subIndustry: z.string().trim().max(120).transform((v) => v || null).nullable().optional(),
  employeeRange: z.string().trim().max(40).transform((v) => v || null).nullable().optional(),
  revenueRange: z.string().trim().max(60).transform((v) => v || null).nullable().optional(),
  ecommercePlatform: z.string().trim().max(80).transform((v) => v || null).nullable().optional(),
  shopifyStatus: z.enum(["none", "shopify", "shopify_plus", "unknown"]),
  businessModel: z.enum(["b2b", "b2c", "dtc", "mixed", "unknown"]),
  otherTechnologies: z.string().trim().max(500).optional(),
  salesChannels: z.string().trim().max(500).optional(),
  markets: z.string().trim().max(500).optional(),
});

function csvList(v: string | undefined): string[] | null {
  if (!v) return null;
  const arr = v
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

export async function updateCompanyAction(input: z.infer<typeof companySchema>): Promise<ActionResult> {
  await requireUser();
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, v.leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found" };

  const values = {
    name: v.name,
    website: v.website ?? null,
    linkedinUrl: v.linkedinUrl ?? null,
    description: v.description ?? null,
    industry: v.industry ?? null,
    subIndustry: v.subIndustry ?? null,
    employeeRange: v.employeeRange ?? null,
    revenueRange: v.revenueRange ?? null,
    ecommercePlatform: v.ecommercePlatform ?? null,
    shopifyStatus: v.shopifyStatus,
    businessModel: v.businessModel,
    otherTechnologies: csvList(v.otherTechnologies),
    salesChannels: csvList(v.salesChannels),
    markets: csvList(v.markets),
  };

  if (lead.companyId) {
    db.update(companies).set(values).where(eq(companies.id, lead.companyId)).run();
  } else {
    const id = newId("com");
    db.insert(companies).values({ id, ...values, dataSource: lead.dataSource }).run();
    db.update(leads).set({ companyId: id }).where(eq(leads.id, v.leadId)).run();
  }
  logActivity({ leadId: v.leadId, entity: "company", action: "research_added", detail: `Company snapshot updated: ${v.name}` });
  touch(v.leadId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Mark researched                                                     */
/* ------------------------------------------------------------------ */

export async function markResearchedAction(input: { leadId: string }): Promise<ActionResult & { missing?: string[] }> {
  await requireUser();
  const res = moveLeadToStage(input.leadId, "researched");
  if (!res.ok) return { ok: false, error: "Not enough research recorded yet.", missing: res.missing };
  touch(input.leadId);
  revalidatePath("/");
  return { ok: true };
}
