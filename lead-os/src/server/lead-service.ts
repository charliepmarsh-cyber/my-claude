import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  buyingSignals,
  companies,
  conversations,
  discoveries,
  leads,
  painHypotheses,
  researchItems,
  scores,
  stageHistory,
  suppressionRecords,
  type Company,
} from "@/db/schema";
import { newId } from "@/lib/ids";
import { getSettings } from "@/lib/settings";
import { computeCompleteness, computeScoreSet, suggestPriority, type ScoringInput } from "@/lib/scoring";
import { LEAD_STAGE_LABELS, type LeadStage } from "@/lib/constants";
import { logActivity } from "@/lib/audit";

/* ------------------------------------------------------------------ */
/* Bundles                                                             */
/* ------------------------------------------------------------------ */

export function loadScoringInput(leadId: string): ScoringInput | null {
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return null;
  const company = lead.companyId ? (db.select().from(companies).where(eq(companies.id, lead.companyId)).get() ?? null) : null;
  const research = db.select().from(researchItems).where(eq(researchItems.leadId, leadId)).all();
  const signals = db.select().from(buyingSignals).where(eq(buyingSignals.leadId, leadId)).all();
  const pains = db.select().from(painHypotheses).where(eq(painHypotheses.leadId, leadId)).all();
  const discovery =
    db.select().from(discoveries).where(eq(discoveries.leadId, leadId)).orderBy(desc(discoveries.updatedAt)).get() ?? null;
  return { lead, company, research, signals, pains, discovery };
}

/**
 * Recompute completeness + all score dimensions for a lead and persist them.
 * Manual score overrides (calculated_by = 'manual') are preserved.
 */
export function recomputeLead(leadId: string): void {
  const db = getDb();
  const input = loadScoringInput(leadId);
  if (!input) return;

  const completeness = computeCompleteness(input.lead, input.company);
  input.lead = { ...input.lead, completeness };

  const settings = getSettings();
  const set = computeScoreSet(input, settings.scoreWeights);

  const existing = db.select().from(scores).where(eq(scores.leadId, leadId)).all();
  const manual = new Map(existing.filter((s) => s.calculatedBy === "manual").map((s) => [s.dimension, s]));

  const dimensions = [...(Object.keys(set) as Array<keyof typeof set>)];
  for (const dim of dimensions) {
    if (manual.has(dim)) continue; // human override wins until cleared
    const { value, breakdown } = set[dim];
    const row = existing.find((s) => s.dimension === dim);
    if (row) {
      db.update(scores)
        .set({ value, breakdown, calculatedBy: "rules", manualReason: null, computedAt: new Date() })
        .where(eq(scores.id, row.id))
        .run();
    } else {
      db.insert(scores)
        .values({ id: newId("scr"), leadId, dimension: dim, value, breakdown, calculatedBy: "rules" })
        .run();
    }
  }

  const overallManual = manual.get("overall");
  const overall = overallManual ? overallManual.value : set.overall.value;
  db.update(leads).set({ completeness, overallScore: overall }).where(eq(leads.id, leadId)).run();
}

export function getSuggestedPriority(leadId: string) {
  const input = loadScoringInput(leadId);
  if (!input) return null;
  const settings = getSettings();
  const set = computeScoreSet(input, settings.scoreWeights);
  return suggestPriority(input, set);
}

/* ------------------------------------------------------------------ */
/* Suppression                                                         */
/* ------------------------------------------------------------------ */

export function isSuppressed(input: { email?: string | null; linkedinUrl?: string | null; fullName?: string | null }): string | null {
  const db = getDb();
  const checks: Array<{ kind: "email" | "linkedin" | "name"; value: string }> = [];
  if (input.email) checks.push({ kind: "email", value: input.email.trim().toLowerCase() });
  if (input.linkedinUrl) checks.push({ kind: "linkedin", value: normaliseLinkedIn(input.linkedinUrl) });
  if (input.fullName) checks.push({ kind: "name", value: input.fullName.trim().toLowerCase() });
  for (const c of checks) {
    const hit = db
      .select()
      .from(suppressionRecords)
      .where(and(eq(suppressionRecords.kind, c.kind), eq(suppressionRecords.value, c.value)))
      .get();
    if (hit) return hit.reason ?? `${c.kind} is on the suppression list`;
  }
  return null;
}

export function addSuppression(kind: "email" | "linkedin" | "name" | "domain", value: string, reason: string): void {
  const db = getDb();
  const v = kind === "linkedin" ? normaliseLinkedIn(value) : value.trim().toLowerCase();
  db.insert(suppressionRecords)
    .values({ id: newId("sup"), kind, value: v, reason })
    .onConflictDoNothing()
    .run();
}

export function normaliseLinkedIn(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/+$/, "");
}

/* ------------------------------------------------------------------ */
/* Duplicate detection                                                 */
/* ------------------------------------------------------------------ */

export type DuplicateMatch = { leadId: string; fullName: string; matchedOn: string };

export function findDuplicates(candidate: {
  fullName?: string | null;
  workEmail?: string | null;
  personalEmail?: string | null;
  linkedinUrl?: string | null;
  companyName?: string | null;
  excludeId?: string;
}): DuplicateMatch[] {
  const db = getDb();
  const matches: DuplicateMatch[] = [];
  const seen = new Set<string>();

  const rows = db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      workEmail: leads.workEmail,
      personalEmail: leads.personalEmail,
      linkedinUrl: leads.linkedinUrl,
      companyId: leads.companyId,
      companyName: companies.name,
    })
    .from(leads)
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(isNull(leads.deletedAt))
    .all();

  const emailOf = (s: string | null | undefined) => s?.trim().toLowerCase() || null;
  const cEmails = [emailOf(candidate.workEmail), emailOf(candidate.personalEmail)].filter(Boolean) as string[];
  const cLinked = candidate.linkedinUrl ? normaliseLinkedIn(candidate.linkedinUrl) : null;
  const cName = candidate.fullName?.trim().toLowerCase() ?? null;
  const cCompany = candidate.companyName?.trim().toLowerCase() ?? null;

  for (const row of rows) {
    if (candidate.excludeId && row.id === candidate.excludeId) continue;
    if (seen.has(row.id)) continue;
    const rEmails = [emailOf(row.workEmail), emailOf(row.personalEmail)].filter(Boolean) as string[];
    if (cEmails.length && rEmails.some((e) => cEmails.includes(e))) {
      matches.push({ leadId: row.id, fullName: row.fullName, matchedOn: "email address" });
      seen.add(row.id);
      continue;
    }
    if (cLinked && row.linkedinUrl && normaliseLinkedIn(row.linkedinUrl) === cLinked) {
      matches.push({ leadId: row.id, fullName: row.fullName, matchedOn: "LinkedIn profile" });
      seen.add(row.id);
      continue;
    }
    if (cName && row.fullName.trim().toLowerCase() === cName) {
      const sameCompany = cCompany && row.companyName && row.companyName.trim().toLowerCase() === cCompany;
      matches.push({
        leadId: row.id,
        fullName: row.fullName,
        matchedOn: sameCompany ? "name + company" : "exact name",
      });
      seen.add(row.id);
    }
  }
  return matches;
}

/* ------------------------------------------------------------------ */
/* Company helpers                                                     */
/* ------------------------------------------------------------------ */

export function findOrCreateCompany(name: string, dataSource: Company["dataSource"]): string {
  const db = getDb();
  const trimmed = name.trim();
  const existing = db
    .select()
    .from(companies)
    .where(and(isNull(companies.deletedAt), eq(companies.name, trimmed)))
    .get();
  if (existing) return existing.id;
  const id = newId("com");
  db.insert(companies).values({ id, name: trimmed, dataSource }).run();
  return id;
}

/* ------------------------------------------------------------------ */
/* Stage transitions with validation                                   */
/* ------------------------------------------------------------------ */

export type StageCheck = { ok: boolean; missing: string[] };

export function canMoveToStage(leadId: string, target: LeadStage): StageCheck {
  const db = getDb();
  const input = loadScoringInput(leadId);
  if (!input) return { ok: false, missing: ["Lead not found"] };
  const { lead, company, research, pains } = input;
  const missing: string[] = [];

  switch (target) {
    case "researched":
      if (research.length === 0 && pains.length === 0)
        missing.push("Add at least one research item or pain hypothesis first");
      break;
    case "ready_to_contact": {
      if (!lead.icpCategory || lead.icpCategory === "other") missing.push("Assign an ICP category");
      if (!lead.linkedinUrl && !lead.workEmail && !lead.personalEmail)
        missing.push("Add a contact route (LinkedIn URL or email)");
      if (!lead.jobTitle && !company) missing.push("Record their role or company");
      if (lead.doNotContact) missing.push("Lead is marked do-not-contact");
      break;
    }
    case "contacted": {
      const sent = db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.leadId, leadId))
        .get();
      if (!sent && !lead.lastContactedAt) missing.push("Record a sent message first (Outreach tab → mark as sent)");
      if (lead.doNotContact) missing.push("Lead is marked do-not-contact");
      break;
    }
    case "replied": {
      const conv = db.select({ id: conversations.id }).from(conversations).where(eq(conversations.leadId, leadId)).get();
      if (!conv) missing.push("Log their reply in the Conversation tab first");
      break;
    }
    case "closed_unsuitable":
      if (!lead.closedReason) missing.push("Record a closed reason (kept for the learning loop)");
      break;
    default:
      break;
  }
  return { ok: missing.length === 0, missing };
}

export function moveLeadToStage(leadId: string, target: LeadStage, reason?: string): StageCheck {
  const db = getDb();
  const check = canMoveToStage(leadId, target);
  if (!check.ok) return check;
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return { ok: false, missing: ["Lead not found"] };
  if (lead.status === target) return { ok: true, missing: [] };

  db.update(leads).set({ status: target }).where(eq(leads.id, leadId)).run();
  db.insert(stageHistory)
    .values({
      id: newId("stg"),
      entity: "lead",
      entityId: leadId,
      leadId,
      fromStage: lead.status,
      toStage: target,
      reason: reason ?? null,
    })
    .run();
  logActivity({
    leadId,
    entity: "lead",
    entityId: leadId,
    action: "stage_changed",
    detail: `${LEAD_STAGE_LABELS[lead.status]} → ${LEAD_STAGE_LABELS[target]}`,
  });
  return { ok: true, missing: [] };
}

/* ------------------------------------------------------------------ */
/* Do-not-contact                                                      */
/* ------------------------------------------------------------------ */

export function setDoNotContact(leadId: string, on: boolean, reason: string): void {
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return;
  db.update(leads)
    .set({
      doNotContact: on,
      suppressionReason: on ? reason : null,
      priorityLabel: on ? "do_not_contact" : lead.priorityLabel === "do_not_contact" ? null : lead.priorityLabel,
    })
    .where(eq(leads.id, leadId))
    .run();
  if (on) {
    if (lead.workEmail) addSuppression("email", lead.workEmail, reason);
    if (lead.personalEmail) addSuppression("email", lead.personalEmail, reason);
    if (lead.linkedinUrl) addSuppression("linkedin", lead.linkedinUrl, reason);
    // Never contact a suppressed lead: cancel all open tasks for them.
    db.run(sql`update tasks set status = 'cancelled' where lead_id = ${leadId} and status = 'open'`);
  }
  logActivity({
    leadId,
    entity: "lead",
    entityId: leadId,
    action: on ? "do_not_contact_set" : "do_not_contact_cleared",
    detail: reason,
  });
}
