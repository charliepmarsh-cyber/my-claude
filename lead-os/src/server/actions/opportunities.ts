"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  automationOpportunities,
  discoveries,
  leads,
  opportunities,
  stageHistory,
  workflowEdges,
  workflowNodes,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { OPPORTUNITY_CATEGORIES, OPPORTUNITY_STAGES, OPPORTUNITY_STAGE_LABELS, DELIVERY_STAGES, type OpportunityStage } from "@/lib/constants";
import { canRecommendBuild } from "@/lib/discovery";
import { buildOpportunityTemplate } from "@/lib/opportunity-templates";

/* ------------------------------------------------------------------ */
/* Automation opportunity designs                                      */
/* ------------------------------------------------------------------ */

const designSchema = z.object({
  leadId: z.string().min(1),
  category: z.enum(OPPORTUNITY_CATEGORIES),
  acknowledgeGate: z.boolean().optional(),
});

export type DesignResult = { ok: true; id: string } | { ok: false; error: string; missing?: Array<{ label: string; why: string }> };

export async function createDesignAction(input: z.infer<typeof designSchema>): Promise<DesignResult> {
  await requireUser();
  const parsed = designSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { leadId, category } = parsed.data;

  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };
  const discovery = db.select().from(discoveries).where(eq(discoveries.leadId, leadId)).orderBy(desc(discoveries.updatedAt)).get() ?? null;

  const gate = canRecommendBuild(discovery ?? {});
  if (!gate.ok && !parsed.data.acknowledgeGate) {
    return {
      ok: false,
      error: "Discovery hasn't met the minimum bar for recommending a build.",
      missing: gate.missing,
    };
  }

  const t = buildOpportunityTemplate(category, discovery);
  const id = newId("aop");
  db.insert(automationOpportunities)
    .values({
      id,
      leadId,
      discoveryId: discovery?.id ?? null,
      title: t.title,
      category,
      businessProblem: t.businessProblem,
      currentState: t.currentState,
      futureState: t.futureState,
      deterministicSteps: t.deterministicSteps,
      aiSteps: t.aiSteps,
      humanSteps: t.humanSteps,
      integrations: t.integrations,
      credentialsNeeded: t.credentialsNeeded,
      dataModel: t.dataModel,
      exceptionHandling: t.exceptionHandling,
      securityConsiderations: t.securityConsiderations,
      risks: t.risks,
      complexity: t.complexity,
      measurementPlan: t.measurementPlan,
      mvpScope: t.mvpScope,
      phase2Scope: t.phase2Scope,
      recommendedStack: t.recommendedStack,
      deliverableNow: true,
      caseStudySuitable: (lead.caseStudySuitability ?? 0) >= 3,
      commercialModel: "undecided",
      status: "draft",
      generationSource: "rules",
    })
    .run();

  t.nodes.forEach((n, i) => {
    db.insert(workflowNodes)
      .values({ id: newId("wfn"), opportunityId: id, nodeKey: n.key, label: n.label, kind: n.kind, description: n.description, sortOrder: i })
      .run();
  });
  t.edges.forEach((e) => {
    db.insert(workflowEdges)
      .values({ id: newId("wfe"), opportunityId: id, fromKey: e.from, toKey: e.to, label: e.label ?? null, kind: e.kind })
      .run();
  });

  logActivity({
    leadId,
    entity: "automation_opportunity",
    entityId: id,
    action: "opportunity_created",
    detail: `${t.title} (${gate.ok ? "discovery gate met" : "gate acknowledged as not met"})`,
    actor: "system",
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/automations");
  return { ok: true, id };
}

const designUpdateSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  businessProblem: z.string().trim().max(4000).optional(),
  currentState: z.string().trim().max(4000).optional(),
  futureState: z.string().trim().max(4000).optional(),
  dataModel: z.string().trim().max(2000).optional(),
  exceptionHandling: z.string().trim().max(2000).optional(),
  securityConsiderations: z.string().trim().max(2000).optional(),
  risks: z.string().trim().max(2000).optional(),
  complexity: z.enum(["S", "M", "L", "XL"]).optional(),
  timeSavedHoursMonth: z.number().min(0).max(2000).nullable().optional(),
  revenueImpact: z.string().trim().max(1000).optional(),
  errorReduction: z.string().trim().max(1000).optional(),
  measurementPlan: z.string().trim().max(2000).optional(),
  mvpScope: z.string().trim().max(2000).optional(),
  phase2Scope: z.string().trim().max(2000).optional(),
  missingSkills: z.string().trim().max(1000).optional(),
  deliverableNow: z.boolean().optional(),
  caseStudySuitable: z.boolean().optional(),
  commercialModel: z.enum(["free_case_study", "paid_project", "retainer", "paid_discovery", "undecided"]).optional(),
  status: z.enum(["draft", "proposed", "accepted", "declined", "delivered"]).optional(),
});

export async function updateDesignAction(input: z.infer<typeof designUpdateSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = designUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, leadId, ...fields } = parsed.data;
  const db = getDb();
  const row = db.select().from(automationOpportunities).where(eq(automationOpportunities.id, id)).get();
  if (!row) return { ok: false, error: "Design not found." };
  db.update(automationOpportunities).set(fields).where(eq(automationOpportunities.id, id)).run();
  logActivity({ leadId, entity: "automation_opportunity", entityId: id, action: "opportunity_updated", detail: Object.keys(fields).join(", ") });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/automations");
  return { ok: true };
}

export async function deleteDesignAction(input: { id: string; leadId: string }): Promise<{ ok: boolean }> {
  await requireUser();
  const db = getDb();
  db.delete(automationOpportunities).where(eq(automationOpportunities.id, input.id)).run();
  revalidatePath(`/leads/${input.leadId}`);
  revalidatePath("/automations");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Commercial opportunities                                            */
/* ------------------------------------------------------------------ */

const commercialSchema = z.object({
  leadId: z.string().min(1),
  automationOpportunityId: z.string().optional(),
  title: z.string().trim().min(1, "Title required").max(200),
  stage: z.enum(OPPORTUNITY_STAGES).default("qualified"),
  value: z.number().min(0).nullable().optional(),
  probability: z.number().min(0).max(1).nullable().optional(),
  proposedService: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export async function createOpportunityAction(input: z.infer<typeof commercialSchema>): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireUser();
  const parsed = commercialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, v.leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };
  const id = newId("opp");
  db.insert(opportunities)
    .values({
      id,
      leadId: v.leadId,
      automationOpportunityId: v.automationOpportunityId ?? null,
      title: v.title,
      stage: v.stage,
      value: v.value ?? null,
      probability: v.probability ?? 0.5,
      proposedService: v.proposedService || null,
      notes: v.notes || null,
    })
    .run();
  db.insert(stageHistory)
    .values({ id: newId("stg"), entity: "opportunity", entityId: id, leadId: v.leadId, fromStage: null, toStage: v.stage })
    .run();
  logActivity({ leadId: v.leadId, entity: "opportunity", entityId: id, action: "opportunity_created", detail: v.title });
  revalidatePath(`/leads/${v.leadId}`);
  revalidatePath("/opportunities");
  revalidatePath("/");
  return { ok: true, id };
}

/** Stage requirements for commercial opportunities — deterministic gate. */
function opportunityStageGate(
  db: ReturnType<typeof getDb>,
  opp: typeof opportunities.$inferSelect,
  target: OpportunityStage,
): string[] {
  const missing: string[] = [];
  if (["free_build_proposed", "paid_discovery", "proposal_drafted", "proposal_sent"].includes(target)) {
    const discovery = db.select().from(discoveries).where(eq(discoveries.leadId, opp.leadId)).get();
    const gate = canRecommendBuild(discovery ?? {});
    if (!gate.ok)
      missing.push(`Discovery is incomplete (${gate.missing.length} minimum requirement${gate.missing.length === 1 ? "" : "s"} missing) — finish it before proposing.`);
  }
  if (["proposal_sent", "negotiation", "won"].includes(target) && !opp.value) {
    missing.push("Set an opportunity value first — even a rough estimate.");
  }
  if (target === "won" && !opp.proposedService) {
    missing.push("Record the proposed service so delivery knows what was agreed.");
  }
  return missing;
}

const oppStageSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(OPPORTUNITY_STAGES),
  lostReason: z.string().trim().max(500).optional(),
  onHoldReason: z.string().trim().max(500).optional(),
});

export async function moveOpportunityStageAction(
  input: z.infer<typeof oppStageSchema>,
): Promise<{ ok: boolean; error?: string; missing?: string[] }> {
  await requireUser();
  const parsed = oppStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const db = getDb();
  const opp = db.select().from(opportunities).where(eq(opportunities.id, parsed.data.id)).get();
  if (!opp) return { ok: false, error: "Opportunity not found." };
  const target = parsed.data.stage;

  if (target === "lost" && !parsed.data.lostReason) {
    return { ok: false, error: "A lost reason is required — it feeds the learning loop.", missing: ["Lost reason"] };
  }
  const missing = opportunityStageGate(db, opp, target);
  if (missing.length) return { ok: false, error: "Stage requirements not met.", missing };

  db.update(opportunities)
    .set({
      stage: target,
      wonAt: target === "won" ? new Date() : opp.wonAt,
      lostAt: target === "lost" ? new Date() : opp.lostAt,
      lostReason: target === "lost" ? (parsed.data.lostReason ?? null) : opp.lostReason,
      onHoldReason: target === "on_hold" ? (parsed.data.onHoldReason ?? null) : null,
      deliveryStage: target === "won" && !opp.deliveryStage ? "scoping" : opp.deliveryStage,
    })
    .where(eq(opportunities.id, opp.id))
    .run();
  db.insert(stageHistory)
    .values({ id: newId("stg"), entity: "opportunity", entityId: opp.id, leadId: opp.leadId, fromStage: opp.stage, toStage: target, reason: parsed.data.lostReason ?? parsed.data.onHoldReason ?? null })
    .run();
  logActivity({ leadId: opp.leadId, entity: "opportunity", entityId: opp.id, action: "stage_changed", detail: `${OPPORTUNITY_STAGE_LABELS[opp.stage]} → ${OPPORTUNITY_STAGE_LABELS[target]}` });
  revalidatePath("/opportunities");
  revalidatePath(`/leads/${opp.leadId}`);
  revalidatePath("/");
  return { ok: true };
}

const deliverySchema = z.object({ id: z.string().min(1), deliveryStage: z.enum(DELIVERY_STAGES) });

export async function setDeliveryStageAction(input: z.infer<typeof deliverySchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const db = getDb();
  const opp = db.select().from(opportunities).where(eq(opportunities.id, parsed.data.id)).get();
  if (!opp) return { ok: false, error: "Opportunity not found." };
  if (opp.stage !== "won") return { ok: false, error: "Delivery stages apply to won opportunities only." };
  db.update(opportunities).set({ deliveryStage: parsed.data.deliveryStage }).where(eq(opportunities.id, opp.id)).run();
  db.insert(stageHistory)
    .values({ id: newId("stg"), entity: "delivery", entityId: opp.id, leadId: opp.leadId, fromStage: opp.deliveryStage, toStage: parsed.data.deliveryStage })
    .run();
  logActivity({ leadId: opp.leadId, entity: "opportunity", entityId: opp.id, action: "stage_changed", detail: `Delivery → ${parsed.data.deliveryStage}` });
  revalidatePath("/opportunities");
  revalidatePath(`/leads/${opp.leadId}`);
  return { ok: true };
}

const oppUpdateSchema = z.object({
  id: z.string().min(1),
  value: z.number().min(0).nullable().optional(),
  probability: z.number().min(0).max(1).nullable().optional(),
  proposedService: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export async function updateOpportunityAction(input: z.infer<typeof oppUpdateSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = oppUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { id, ...fields } = parsed.data;
  const db = getDb();
  const opp = db.select().from(opportunities).where(eq(opportunities.id, id)).get();
  if (!opp) return { ok: false, error: "Opportunity not found." };
  db.update(opportunities)
    .set({ ...fields, proposedService: fields.proposedService ?? opp.proposedService, notes: fields.notes ?? opp.notes })
    .where(eq(opportunities.id, id))
    .run();
  logActivity({ leadId: opp.leadId, entity: "opportunity", entityId: id, action: "opportunity_updated" });
  revalidatePath("/opportunities");
  revalidatePath(`/leads/${opp.leadId}`);
  return { ok: true };
}
