"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, leads, scores } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import {
  CHANNELS,
  ICP_CATEGORIES,
  LEAD_STAGES,
  PRIORITY_LABELS,
  SCORE_DIMENSIONS,
  SENIORITIES,
  WARMTH,
  type LeadStage,
} from "@/lib/constants";
import {
  canMoveToStage,
  findDuplicates,
  findOrCreateCompany,
  isSuppressed,
  moveLeadToStage,
  recomputeLead,
  setDoNotContact,
} from "@/server/lead-service";

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

const optional = (max = 300) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || /^https?:\/\/|^www\.|^[a-z0-9-]+\.[a-z]{2,}/i.test(v), "Enter a valid URL");

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email");

const intRange = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(min).max(max).nullable(),
  );

const leadSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  preferredName: optional(100),
  pronouns: optional(50),
  linkedinUrl: optionalUrl,
  workEmail: optionalEmail,
  personalEmail: optionalEmail,
  phone: optional(50),
  location: optional(200),
  timezone: optional(80),
  jobTitle: optional(200),
  seniority: z.enum(SENIORITIES).default("unknown"),
  department: optional(120),
  decisionAuthority: z.enum(["decision_maker", "influencer", "user", "unknown"]).default("unknown"),
  isFounder: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
  yearsInRole: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(80).nullable()),
  previousRoles: optional(500),
  companyName: optional(200),
  source: optional(200),
  warmth: z.enum(WARMTH).default("cold"),
  connectionDegree: z.enum(["1st", "2nd", "3rd", "none", "unknown"]).default("unknown"),
  howKnown: optional(500),
  relationshipStrength: intRange(1, 5),
  referrer: optional(200),
  sharedConnections: optional(300),
  sharedGroups: optional(300),
  trustIndicators: optional(300),
  icpCategory: z.enum(ICP_CATEGORIES).default("other"),
  recommendedAngle: optional(500),
  notes: z
    .string()
    .trim()
    .max(5000)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  currentTools: optional(500),
  channel: z.enum(CHANNELS).default("linkedin"),
  caseStudySuitability: intRange(1, 5),
  paidSuitability: intRange(1, 5),
  retainerSuitability: intRange(1, 5),
  referralPotential: intRange(1, 5),
  strategicValue: optional(300),
  opportunityValue: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).nullable()),
});

function parseLeadForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(leadSchema.shape)) raw[key] = formData.get(key) ?? undefined;
  return leadSchema.safeParse(raw);
}

export type LeadFormState = { error?: string; fieldErrors?: Record<string, string>; duplicates?: Array<{ leadId: string; fullName: string; matchedOn: string }> } | undefined;

function toFieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function toolsArray(v: string | null | undefined): string[] | null {
  if (!v) return null;
  const arr = v
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

/* ------------------------------------------------------------------ */
/* Create / update                                                     */
/* ------------------------------------------------------------------ */

export async function createLeadAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  await requireUser();
  const parsed = parseLeadForm(formData);
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  const v = parsed.data;

  const suppressed = isSuppressed({ email: v.workEmail, linkedinUrl: v.linkedinUrl, fullName: v.fullName });
  if (suppressed) return { error: `This contact is on the suppression list (${suppressed}). Remove the suppression in Settings first.` };

  const allowDuplicate = formData.get("allowDuplicate") === "1";
  const dupes = findDuplicates({
    fullName: v.fullName,
    workEmail: v.workEmail,
    personalEmail: v.personalEmail,
    linkedinUrl: v.linkedinUrl,
    companyName: v.companyName,
  });
  if (dupes.length > 0 && !allowDuplicate) {
    return { error: "Possible duplicate found. Review below, then save again to confirm.", duplicates: dupes };
  }

  const db = getDb();
  const id = newId("led");
  const companyId = v.companyName ? findOrCreateCompany(v.companyName, "manual") : null;

  db.insert(leads)
    .values({
      id,
      fullName: v.fullName,
      preferredName: v.preferredName ?? null,
      pronouns: v.pronouns ?? null,
      linkedinUrl: v.linkedinUrl ?? null,
      workEmail: v.workEmail ?? null,
      personalEmail: v.personalEmail ?? null,
      phone: v.phone ?? null,
      location: v.location ?? null,
      timezone: v.timezone ?? null,
      jobTitle: v.jobTitle ?? null,
      seniority: v.seniority,
      department: v.department ?? null,
      decisionAuthority: v.decisionAuthority,
      isFounder: v.isFounder,
      yearsInRole: v.yearsInRole ?? null,
      previousRoles: v.previousRoles ?? null,
      companyId,
      source: v.source ?? null,
      warmth: v.warmth,
      connectionDegree: v.connectionDegree,
      howKnown: v.howKnown ?? null,
      relationshipStrength: v.relationshipStrength ?? null,
      referrer: v.referrer ?? null,
      sharedConnections: v.sharedConnections ?? null,
      sharedGroups: v.sharedGroups ?? null,
      trustIndicators: v.trustIndicators ?? null,
      icpCategory: v.icpCategory,
      recommendedAngle: v.recommendedAngle ?? null,
      notes: v.notes ?? null,
      currentTools: toolsArray(v.currentTools),
      channel: v.channel,
      caseStudySuitability: v.caseStudySuitability ?? null,
      paidSuitability: v.paidSuitability ?? null,
      retainerSuitability: v.retainerSuitability ?? null,
      referralPotential: v.referralPotential ?? null,
      strategicValue: v.strategicValue ?? null,
      opportunityValue: v.opportunityValue ?? null,
      status: "imported",
      dataSource: "manual",
      duplicateOfId: dupes.length > 0 ? dupes[0]!.leadId : null,
    })
    .run();

  recomputeLead(id);
  logActivity({ leadId: id, entity: "lead", entityId: id, action: "created", detail: v.fullName });
  revalidatePath("/leads");
  redirect(`/leads/${id}`);
}

export async function updateLeadAction(leadId: string, _prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  await requireUser();
  const db = getDb();
  const existing = db.select().from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).get();
  if (!existing) return { error: "Lead not found." };

  const parsed = parseLeadForm(formData);
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  const v = parsed.data;

  const companyId = v.companyName ? findOrCreateCompany(v.companyName, existing.dataSource) : null;

  db.update(leads)
    .set({
      fullName: v.fullName,
      preferredName: v.preferredName ?? null,
      pronouns: v.pronouns ?? null,
      linkedinUrl: v.linkedinUrl ?? null,
      workEmail: v.workEmail ?? null,
      personalEmail: v.personalEmail ?? null,
      phone: v.phone ?? null,
      location: v.location ?? null,
      timezone: v.timezone ?? null,
      jobTitle: v.jobTitle ?? null,
      seniority: v.seniority,
      department: v.department ?? null,
      decisionAuthority: v.decisionAuthority,
      isFounder: v.isFounder,
      yearsInRole: v.yearsInRole ?? null,
      previousRoles: v.previousRoles ?? null,
      companyId,
      source: v.source ?? null,
      warmth: v.warmth,
      connectionDegree: v.connectionDegree,
      howKnown: v.howKnown ?? null,
      relationshipStrength: v.relationshipStrength ?? null,
      referrer: v.referrer ?? null,
      sharedConnections: v.sharedConnections ?? null,
      sharedGroups: v.sharedGroups ?? null,
      trustIndicators: v.trustIndicators ?? null,
      icpCategory: v.icpCategory,
      recommendedAngle: v.recommendedAngle ?? null,
      notes: v.notes ?? null,
      currentTools: toolsArray(v.currentTools),
      channel: v.channel,
      caseStudySuitability: v.caseStudySuitability ?? null,
      paidSuitability: v.paidSuitability ?? null,
      retainerSuitability: v.retainerSuitability ?? null,
      referralPotential: v.referralPotential ?? null,
      strategicValue: v.strategicValue ?? null,
      opportunityValue: v.opportunityValue ?? null,
    })
    .where(eq(leads.id, leadId))
    .run();

  recomputeLead(leadId);
  logActivity({ leadId, entity: "lead", entityId: leadId, action: "updated", detail: "Lead details edited" });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  redirect(`/leads/${leadId}`);
}

/* ------------------------------------------------------------------ */
/* Stage moves, priority, DNC, delete, bulk                            */
/* ------------------------------------------------------------------ */

export type ActionResult = { ok: true } | { ok: false; error: string; missing?: string[] };

const stageSchema = z.object({ leadId: z.string().min(1), stage: z.enum(LEAD_STAGES), reason: z.string().max(500).optional() });

export async function moveStageAction(input: { leadId: string; stage: LeadStage; reason?: string }): Promise<ActionResult> {
  await requireUser();
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid stage change." };
  const result = moveLeadToStage(parsed.data.leadId, parsed.data.stage, parsed.data.reason);
  if (!result.ok) return { ok: false, error: "This stage needs more information first.", missing: result.missing };
  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/pipeline");
  revalidatePath("/");
  return { ok: true };
}

export async function checkStageAction(input: { leadId: string; stage: LeadStage }): Promise<{ ok: boolean; missing: string[] }> {
  await requireUser();
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, missing: ["Invalid request"] };
  return canMoveToStage(parsed.data.leadId, parsed.data.stage);
}

const prioritySchema = z.object({
  leadId: z.string().min(1),
  priority: z.enum(PRIORITY_LABELS),
  reason: z.string().trim().min(3, "Give a short reason — it feeds the learning loop").max(500),
});

export async function setPriorityAction(input: { leadId: string; priority: (typeof PRIORITY_LABELS)[number]; reason: string }): Promise<ActionResult> {
  await requireUser();
  const parsed = prioritySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = getDb();
  db.update(leads).set({ priorityLabel: parsed.data.priority }).where(eq(leads.id, parsed.data.leadId)).run();
  logActivity({
    leadId: parsed.data.leadId,
    entity: "lead",
    entityId: parsed.data.leadId,
    action: "priority_set",
    detail: `${parsed.data.priority}: ${parsed.data.reason}`,
  });
  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}

const dncSchema = z.object({
  leadId: z.string().min(1),
  on: z.boolean(),
  reason: z.string().trim().min(3, "A reason is required — it is kept on the suppression record").max(500),
});

export async function setDncAction(input: { leadId: string; on: boolean; reason: string }): Promise<ActionResult> {
  await requireUser();
  const parsed = dncSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  setDoNotContact(parsed.data.leadId, parsed.data.on, parsed.data.reason);
  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteLeadAction(input: { leadId: string }): Promise<ActionResult> {
  await requireUser();
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, input.leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };
  db.update(leads).set({ deletedAt: new Date() }).where(eq(leads.id, input.leadId)).run();
  logActivity({ leadId: input.leadId, entity: "lead", entityId: input.leadId, action: "deleted", detail: lead.fullName });
  revalidatePath("/leads");
  return { ok: true };
}

const bulkSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(["stage", "priority", "delete", "needs_research"]),
  stage: z.enum(LEAD_STAGES).optional(),
  priority: z.enum(PRIORITY_LABELS).optional(),
  reason: z.string().max(500).optional(),
});

export async function bulkLeadAction(input: z.infer<typeof bulkSchema>): Promise<ActionResult & { applied?: number; skipped?: Array<{ leadId: string; missing: string[] }> }> {
  await requireUser();
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid bulk request." };
  const { leadIds, action, stage, priority, reason } = parsed.data;
  const db = getDb();
  let applied = 0;
  const skipped: Array<{ leadId: string; missing: string[] }> = [];

  for (const id of leadIds) {
    if (action === "delete") {
      db.update(leads).set({ deletedAt: new Date() }).where(eq(leads.id, id)).run();
      applied++;
    } else if (action === "needs_research") {
      const res = moveLeadToStage(id, "needs_research", reason);
      if (res.ok) applied++;
      else skipped.push({ leadId: id, missing: res.missing });
    } else if (action === "stage" && stage) {
      const res = moveLeadToStage(id, stage, reason);
      if (res.ok) applied++;
      else skipped.push({ leadId: id, missing: res.missing });
    } else if (action === "priority" && priority) {
      db.update(leads).set({ priorityLabel: priority }).where(eq(leads.id, id)).run();
      logActivity({ leadId: id, entity: "lead", entityId: id, action: "priority_set", detail: `${priority} (bulk): ${reason ?? "no reason given"}` });
      applied++;
    }
  }
  if (action === "delete")
    logActivity({ entity: "lead", action: "bulk_deleted", detail: `${applied} leads deleted` });
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { ok: true, applied, skipped };
}

/* ------------------------------------------------------------------ */
/* Score overrides                                                     */
/* ------------------------------------------------------------------ */

const overrideSchema = z.object({
  leadId: z.string().min(1),
  dimension: z.enum([...SCORE_DIMENSIONS, "overall"]),
  value: z.number().int().min(0).max(100),
  reason: z.string().trim().min(5, "Explain the override — it is shown next to the score").max(500),
});

export async function overrideScoreAction(input: z.infer<typeof overrideSchema>): Promise<ActionResult> {
  await requireUser();
  const parsed = overrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { leadId, dimension, value, reason } = parsed.data;
  const db = getDb();
  const existing = db
    .select()
    .from(scores)
    .where(and(eq(scores.leadId, leadId), eq(scores.dimension, dimension)))
    .get();
  if (existing) {
    db.update(scores)
      .set({ value, calculatedBy: "manual", manualReason: reason, computedAt: new Date() })
      .where(eq(scores.id, existing.id))
      .run();
  } else {
    db.insert(scores)
      .values({ id: newId("scr"), leadId, dimension, value, calculatedBy: "manual", manualReason: reason })
      .run();
  }
  if (dimension === "overall") db.update(leads).set({ overallScore: value }).where(eq(leads.id, leadId)).run();
  logActivity({ leadId, entity: "score", entityId: leadId, action: "score_overridden", detail: `${dimension} → ${value}: ${reason}` });
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function clearScoreOverrideAction(input: { leadId: string; dimension: string }): Promise<ActionResult> {
  await requireUser();
  const db = getDb();
  const row = db
    .select()
    .from(scores)
    .where(and(eq(scores.leadId, input.leadId), eq(scores.dimension, input.dimension as never)))
    .get();
  if (row && row.calculatedBy === "manual") {
    db.delete(scores).where(eq(scores.id, row.id)).run();
  }
  recomputeLead(input.leadId);
  logActivity({ leadId: input.leadId, entity: "score", entityId: input.leadId, action: "score_override_cleared", detail: input.dimension });
  revalidatePath(`/leads/${input.leadId}`);
  return { ok: true };
}

export async function recomputeScoresAction(input: { leadId: string }): Promise<ActionResult> {
  await requireUser();
  recomputeLead(input.leadId);
  revalidatePath(`/leads/${input.leadId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export async function exportLeadsCsv(): Promise<string> {
  await requireUser();
  const db = getDb();
  const rows = db
    .select({
      fullName: leads.fullName,
      jobTitle: leads.jobTitle,
      companyName: companies.name,
      linkedinUrl: leads.linkedinUrl,
      workEmail: leads.workEmail,
      phone: leads.phone,
      location: leads.location,
      icpCategory: leads.icpCategory,
      warmth: leads.warmth,
      source: leads.source,
      howKnown: leads.howKnown,
      status: leads.status,
      priorityLabel: leads.priorityLabel,
      overallScore: leads.overallScore,
      nextAction: leads.nextAction,
      notes: leads.notes,
    })
    .from(leads)
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(isNull(leads.deletedAt))
    .all();

  const headers = Object.keys(rows[0] ?? { fullName: "" });
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(","))].join("\n");
}
