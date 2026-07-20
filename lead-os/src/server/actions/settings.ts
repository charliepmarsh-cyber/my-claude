"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { caseStudies, companies, leads, suppressionRecords } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { getSettings, saveSettings } from "@/lib/settings";
import { SCORE_DIMENSIONS } from "@/lib/constants";
import { addSuppression } from "@/server/lead-service";

const numberField = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const settingsSchema = z.object({
  followUp1Days: numberField(1, 30),
  followUp2Days: numberField(1, 30),
  finalCloseDays: numberField(1, 30),
  maxFollowUps: numberField(1, 6),
  minDaysBetweenOutbound: numberField(0, 30),
  dailyOutreachTarget: numberField(1, 100),
  weeklyReplyGoal: numberField(1, 100),
  warmListTarget: numberField(1, 1000),
  discoveryConversationTarget: numberField(1, 100),
  caseStudyTarget: numberField(1, 50),
  paidClientTarget: numberField(1, 50),
  dailyResearchTarget: numberField(1, 50),
  scoreWeights: z.record(z.enum(SCORE_DIMENSIONS), z.coerce.number().int().min(0).max(100)),
});

export async function saveSettingsAction(
  input: z.infer<typeof settingsSchema>,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  const weightSum = Object.values(parsed.data.scoreWeights).reduce((a, b) => a + b, 0);
  if (weightSum === 0) return { ok: false, error: "Score weights can't all be zero." };
  const current = getSettings();
  saveSettings({ ...current, ...parsed.data, scoreWeights: { ...current.scoreWeights, ...parsed.data.scoreWeights } });
  logActivity({ entity: "settings", action: "settings_updated", detail: "Targets, cadence or weights changed" });
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

/* Suppression list */

const suppressionSchema = z.object({
  kind: z.enum(["email", "linkedin", "name", "domain"]),
  value: z.string().trim().min(2).max(300),
  reason: z.string().trim().min(3, "A reason is required").max(300),
});

export async function addSuppressionAction(input: z.infer<typeof suppressionSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = suppressionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  addSuppression(parsed.data.kind, parsed.data.value, parsed.data.reason);
  logActivity({ entity: "suppression", action: "suppression_added", detail: `${parsed.data.kind}: ${parsed.data.value}` });
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeSuppressionAction(input: { id: string }): Promise<{ ok: boolean }> {
  await requireUser();
  const db = getDb();
  const row = db.select().from(suppressionRecords).where(eq(suppressionRecords.id, input.id)).get();
  if (row) {
    db.delete(suppressionRecords).where(eq(suppressionRecords.id, input.id)).run();
    logActivity({ entity: "suppression", action: "suppression_removed", detail: `${row.kind}: ${row.value}` });
  }
  revalidatePath("/settings");
  return { ok: true };
}

/* Demo data — load and purge (one action each). */

export async function loadDemoDataAction(): Promise<{ ok: boolean; error?: string; created?: number }> {
  await requireUser();
  const db = getDb();
  const { loadDemoData, hasDemoData } = await import("@/server/demo-data");
  if (hasDemoData(db)) return { ok: false, error: "Demo data is already loaded — delete it first if you want a fresh copy." };
  const { created } = loadDemoData(db);
  logActivity({ entity: "system", action: "demo_data_loaded", detail: `${created} demo leads created` });
  revalidatePath("/", "layout");
  return { ok: true, created };
}


export async function purgeDemoDataAction(): Promise<{ ok: boolean; removed: number }> {
  await requireUser();
  const db = getDb();
  const demoLeads = db.select({ id: leads.id }).from(leads).where(eq(leads.dataSource, "demo")).all();
  const ids = demoLeads.map((l) => l.id);
  let removed = 0;
  if (ids.length) {
    db.delete(caseStudies).where(inArray(caseStudies.leadId, ids)).run();
    db.delete(leads).where(inArray(leads.id, ids)).run(); // cascades to research, messages, conversations, tasks, etc.
    removed += ids.length;
  }
  db.delete(companies).where(eq(companies.dataSource, "demo")).run();
  logActivity({ entity: "system", action: "demo_data_purged", detail: `${removed} demo leads removed with all related records` });
  revalidatePath("/", "layout");
  return { ok: true, removed };
}
