"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { importRows, imports, leads, tasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import {
  classifyContact,
  mapChannel,
  mapPriority,
  mapStatus,
  parseLooseDate,
  splitBusinessRole,
  type ImportTargetKey,
} from "@/lib/import-mapping";
import { findDuplicates, findOrCreateCompany, isSuppressed, recomputeLead } from "@/server/lead-service";

const MAX_ROWS = 500;

const analyzeSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1).max(MAX_ROWS),
  mapping: z.record(z.string(), z.string()),
});

type MappedLead = {
  fullName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  source: string | null;
  channel: "linkedin" | "email" | "phone" | "in_person" | "other" | null;
  workEmail: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  location: string | null;
  howKnown: string | null;
  lastInteractionAt: Date | null;
  priorityLabel: ReturnType<typeof mapPriority>;
  stage: ReturnType<typeof mapStatus>;
  nextAction: string | null;
  followUpDate: Date | null;
  notes: string[];
};

function interpretRow(raw: Record<string, string>, mapping: Record<string, ImportTargetKey>): MappedLead {
  const get = (target: ImportTargetKey): string => {
    for (const [col, t] of Object.entries(mapping)) {
      if (t === target && raw[col] !== undefined && raw[col] !== null && String(raw[col]).trim() !== "")
        return String(raw[col]).trim();
    }
    return "";
  };

  const notes: string[] = [];
  const combined = get("businessRole");
  const split = combined ? splitBusinessRole(combined) : { jobTitle: null, companyName: null };
  const contactRaw = get("contact");
  const contact = contactRaw ? classifyContact(contactRaw) : {};
  if (contactRaw && !contact.email && !contact.linkedinUrl && !contact.phone) {
    notes.push(`Contact (unrecognised format): ${contactRaw}`);
  }

  const lastRaw = get("lastInteraction");
  const lastDate = lastRaw ? parseLooseDate(lastRaw) : null;
  if (lastRaw && !lastDate) notes.push(`Last interaction: ${lastRaw}`);

  const followRaw = get("followUpDate");
  const followDate = followRaw ? parseLooseDate(followRaw) : null;
  if (followRaw && !followDate) notes.push(`Follow-up date (unparsed): ${followRaw}`);

  const statusRaw = get("status");
  const stage = mapStatus(statusRaw);
  if (stage.note) notes.push(stage.note);

  const noteRaw = get("notes");
  if (noteRaw) notes.push(noteRaw);

  return {
    fullName: get("fullName") || null,
    jobTitle: get("jobTitle") || split.jobTitle,
    companyName: get("companyName") || split.companyName,
    source: get("source") || null,
    channel: mapChannel(get("reachVia")) ?? (contact.linkedinUrl ? "linkedin" : contact.email ? "email" : null),
    workEmail: get("email") || contact.email || null,
    linkedinUrl: get("linkedinUrl") || contact.linkedinUrl || null,
    phone: get("phone") || contact.phone || null,
    location: get("location") || null,
    howKnown: get("howKnown") || null,
    lastInteractionAt: lastDate,
    priorityLabel: mapPriority(get("priority")),
    stage,
    nextAction: get("nextAction") || null,
    followUpDate: followDate,
    notes,
  };
}

export type AnalyzedRow = {
  rowNum: number;
  fullName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  problems: string[];
  duplicates: Array<{ leadId: string; fullName: string; matchedOn: string }>;
  suppressed: string | null;
};

export async function analyzeImportAction(
  input: z.infer<typeof analyzeSchema>,
): Promise<{ ok: true; rows: AnalyzedRow[] } | { ok: false; error: string }> {
  await requireUser();
  const parsed = analyzeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: `Invalid rows (max ${MAX_ROWS}).` };
  const mapping = parsed.data.mapping as Record<string, ImportTargetKey>;

  const out: AnalyzedRow[] = parsed.data.rows.map((raw, i) => {
    const m = interpretRow(raw, mapping);
    const problems: string[] = [];
    if (!m.fullName) problems.push("Missing name");
    if (!m.workEmail && !m.linkedinUrl && !m.phone && !m.companyName && !m.jobTitle)
      problems.push("No contact route or role/company — record would be nearly empty");
    const duplicates = m.fullName
      ? findDuplicates({
          fullName: m.fullName,
          workEmail: m.workEmail,
          linkedinUrl: m.linkedinUrl,
          companyName: m.companyName,
        })
      : [];
    const suppressed = isSuppressed({ email: m.workEmail, linkedinUrl: m.linkedinUrl, fullName: m.fullName });
    return {
      rowNum: i + 1,
      fullName: m.fullName,
      jobTitle: m.jobTitle,
      companyName: m.companyName,
      problems,
      duplicates,
      suppressed,
    };
  });

  return { ok: true, rows: out };
}

const executeSchema = analyzeSchema.extend({
  filename: z.string().trim().min(1).max(200),
  duplicatePolicy: z.enum(["skip", "fill_empty", "create_anyway"]),
  defaultWarmth: z.enum(["warm", "cold"]),
});

export type ImportReport = {
  importId: string;
  created: number;
  updated: number;
  duplicates: number;
  skipped: number;
  errors: number;
  details: Array<{ rowNum: number; name: string; outcome: string; message: string }>;
};

export async function executeImportAction(
  input: z.infer<typeof executeSchema>,
): Promise<{ ok: true; report: ImportReport } | { ok: false; error: string }> {
  await requireUser();
  const parsed = executeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid import request." };
  const { rows, filename, duplicatePolicy, defaultWarmth } = parsed.data;
  const mapping = parsed.data.mapping as Record<string, ImportTargetKey>;

  const db = getDb();
  const importId = newId("imp");
  db.insert(imports).values({ id: importId, filename, rowCount: rows.length, mapping }).run();

  let created = 0;
  let updated = 0;
  let duplicates = 0;
  let skipped = 0;
  let errors = 0;
  const details: ImportReport["details"] = [];

  const recordRow = (
    rowNum: number,
    raw: Record<string, string>,
    outcome: "created" | "updated" | "skipped" | "duplicate" | "error",
    leadId: string | null,
    message: string,
    priorSnapshot: Record<string, unknown> | null = null,
  ) => {
    db.insert(importRows)
      .values({ id: newId("irw"), importId, rowNum, raw, outcome, leadId, message, priorSnapshot })
      .run();
    details.push({ rowNum, name: raw[Object.keys(raw)[0] ?? ""] ?? "", outcome, message });
  };

  rows.forEach((raw, i) => {
    const rowNum = i + 1;
    const m = interpretRow(raw, mapping);
    try {
      if (!m.fullName) {
        errors++;
        recordRow(rowNum, raw, "error", null, "Missing name — row skipped");
        return;
      }
      const suppressed = isSuppressed({ email: m.workEmail, linkedinUrl: m.linkedinUrl, fullName: m.fullName });
      if (suppressed) {
        skipped++;
        recordRow(rowNum, raw, "skipped", null, `On suppression list (${suppressed})`);
        return;
      }

      const dupes = findDuplicates({
        fullName: m.fullName,
        workEmail: m.workEmail,
        linkedinUrl: m.linkedinUrl,
        companyName: m.companyName,
      });

      if (dupes.length > 0 && duplicatePolicy === "skip") {
        duplicates++;
        recordRow(rowNum, raw, "duplicate", dupes[0]!.leadId, `Matches ${dupes[0]!.fullName} on ${dupes[0]!.matchedOn} — skipped`);
        return;
      }

      if (dupes.length > 0 && duplicatePolicy === "fill_empty") {
        const existing = db.select().from(leads).where(eq(leads.id, dupes[0]!.leadId)).get();
        if (existing) {
          const prior = { ...existing } as Record<string, unknown>;
          const fill: Partial<typeof existing> = {};
          if (!existing.jobTitle && m.jobTitle) fill.jobTitle = m.jobTitle;
          if (!existing.workEmail && m.workEmail) fill.workEmail = m.workEmail;
          if (!existing.linkedinUrl && m.linkedinUrl) fill.linkedinUrl = m.linkedinUrl;
          if (!existing.phone && m.phone) fill.phone = m.phone;
          if (!existing.location && m.location) fill.location = m.location;
          if (!existing.howKnown && m.howKnown) fill.howKnown = m.howKnown;
          if (!existing.source && m.source) fill.source = m.source;
          if (!existing.nextAction && m.nextAction) fill.nextAction = m.nextAction;
          if (!existing.companyId && m.companyName) fill.companyId = findOrCreateCompany(m.companyName, "import");
          if (!existing.lastInteractionAt && m.lastInteractionAt) fill.lastInteractionAt = m.lastInteractionAt;
          if (m.notes.length) fill.notes = [existing.notes, ...m.notes].filter(Boolean).join("\n");
          if (Object.keys(fill).length > 0) {
            db.update(leads).set(fill).where(eq(leads.id, existing.id)).run();
            recomputeLead(existing.id);
            updated++;
            recordRow(rowNum, raw, "updated", existing.id, `Filled ${Object.keys(fill).length} empty field(s) on ${existing.fullName} — existing data never overwritten`, prior);
          } else {
            duplicates++;
            recordRow(rowNum, raw, "duplicate", existing.id, `Matches ${existing.fullName} — nothing new to add`);
          }
          return;
        }
      }

      // Create (also the create_anyway path for duplicates).
      const id = newId("led");
      const companyId = m.companyName ? findOrCreateCompany(m.companyName, "import") : null;
      db.insert(leads)
        .values({
          id,
          fullName: m.fullName,
          jobTitle: m.jobTitle,
          companyId,
          source: m.source ?? "Warm list import",
          warmth: defaultWarmth,
          howKnown: m.howKnown,
          workEmail: m.workEmail,
          linkedinUrl: m.linkedinUrl,
          phone: m.phone,
          location: m.location,
          channel: m.channel ?? "linkedin",
          lastInteractionAt: m.lastInteractionAt,
          priorityLabel: m.priorityLabel,
          status: m.stage.stage,
          nextAction: m.nextAction,
          nextActionDue: m.followUpDate,
          notes: m.notes.length ? m.notes.join("\n") : null,
          dataSource: "import",
          duplicateOfId: dupes.length > 0 ? dupes[0]!.leadId : null,
          connectionDegree: m.channel === "linkedin" || m.linkedinUrl ? "1st" : "unknown",
        })
        .run();

      if (m.followUpDate || m.nextAction) {
        db.insert(tasks)
          .values({
            id: newId("tsk"),
            leadId: id,
            kind: "follow_up",
            title: `${m.nextAction ?? "Follow up"}: ${m.fullName}`,
            detail: "Imported from warm list",
            dueAt: m.followUpDate ?? null,
          })
          .run();
      }

      recomputeLead(id);
      created++;
      recordRow(
        rowNum,
        raw,
        "created",
        id,
        dupes.length > 0 ? `Created despite match with ${dupes[0]!.fullName} (your choice)` : "Created",
      );
    } catch (err) {
      errors++;
      recordRow(rowNum, raw, "error", null, err instanceof Error ? err.message : "Unknown error");
    }
  });

  db.update(imports)
    .set({ createdCount: created, updatedCount: updated, duplicateCount: duplicates, skippedCount: skipped, errorCount: errors })
    .where(eq(imports.id, importId))
    .run();
  logActivity({
    entity: "import",
    entityId: importId,
    action: "import_completed",
    detail: `${filename}: ${created} created, ${updated} updated, ${duplicates} duplicates, ${skipped} suppressed, ${errors} errors`,
  });

  revalidatePath("/leads");
  revalidatePath("/imports");
  revalidatePath("/");
  return { ok: true, report: { importId, created, updated, duplicates, skipped, errors, details } };
}

export async function undoImportAction(input: { importId: string }): Promise<{ ok: boolean; error?: string; restored?: number; removed?: number }> {
  await requireUser();
  const db = getDb();
  const imp = db.select().from(imports).where(eq(imports.id, input.importId)).get();
  if (!imp) return { ok: false, error: "Import not found." };
  if (imp.status === "undone") return { ok: false, error: "Already undone." };

  const rows = db.select().from(importRows).where(eq(importRows.importId, imp.id)).all();
  let removed = 0;
  let restored = 0;
  for (const row of rows) {
    if (row.outcome === "created" && row.leadId) {
      db.update(leads).set({ deletedAt: new Date() }).where(eq(leads.id, row.leadId)).run();
      db.update(tasks).set({ status: "cancelled" }).where(eq(tasks.leadId, row.leadId)).run();
      removed++;
    } else if (row.outcome === "updated" && row.leadId && row.priorSnapshot) {
      const prior = row.priorSnapshot as Record<string, unknown>;
      db.update(leads)
        .set({
          jobTitle: (prior.jobTitle as string | null) ?? null,
          workEmail: (prior.workEmail as string | null) ?? null,
          linkedinUrl: (prior.linkedinUrl as string | null) ?? null,
          phone: (prior.phone as string | null) ?? null,
          location: (prior.location as string | null) ?? null,
          howKnown: (prior.howKnown as string | null) ?? null,
          source: (prior.source as string | null) ?? null,
          nextAction: (prior.nextAction as string | null) ?? null,
          notes: (prior.notes as string | null) ?? null,
          companyId: (prior.companyId as string | null) ?? null,
          lastInteractionAt: prior.lastInteractionAt ? new Date(prior.lastInteractionAt as number) : null,
        })
        .where(eq(leads.id, row.leadId))
        .run();
      recomputeLead(row.leadId);
      restored++;
    }
  }
  db.update(imports).set({ status: "undone", undoneAt: new Date() }).where(eq(imports.id, imp.id)).run();
  logActivity({ entity: "import", entityId: imp.id, action: "import_undone", detail: `${removed} created leads removed, ${restored} updates reverted` });
  revalidatePath("/leads");
  revalidatePath("/imports");
  return { ok: true, removed, restored };
}
