"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { caseStudies, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";

const upsertSchema = z.object({
  id: z.string().optional(),
  leadId: z.string().optional(),
  companyName: z.string().trim().min(1, "Company name required").max(200),
  problem: z.string().trim().max(2000).optional(),
  baseline: z.string().trim().max(2000).optional(),
  proposedBuild: z.string().trim().max(2000).optional(),
  successMetric: z.string().trim().max(1000).optional(),
  dataRequired: z.string().trim().max(1000).optional(),
  approvalStatus: z.enum(["not_asked", "asked", "approved", "declined"]).optional(),
  buildStatus: z.enum(["not_started", "scoping", "building", "testing", "live", "measuring", "complete"]).optional(),
  beforeEvidence: z.string().trim().max(2000).optional(),
  afterEvidence: z.string().trim().max(2000).optional(),
  timeSaved: z.string().trim().max(300).optional(),
  revenueInfluenced: z.string().trim().max(300).optional(),
  errorReduction: z.string().trim().max(300).optional(),
  qualitativeFeedback: z.string().trim().max(2000).optional(),
  testimonialStatus: z.enum(["not_asked", "asked", "received", "declined"]).optional(),
  permissionToPublish: z.boolean().optional(),
  redactionRequirements: z.string().trim().max(500).optional(),
  referralRequested: z.boolean().optional(),
  paidFollowOn: z.string().trim().max(1000).optional(),
});

export async function upsertCaseStudyAction(
  input: z.infer<typeof upsertSchema>,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireUser();
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, leadId, ...fields } = parsed.data;
  const db = getDb();

  // Outcome integrity: outcome claims require after-evidence.
  const wantsOutcomes = fields.timeSaved || fields.revenueInfluenced || fields.errorReduction;
  if (wantsOutcomes && !fields.afterEvidence) {
    return {
      ok: false,
      error: "Outcome figures need 'after' evidence recorded alongside them — the system never stores claimed results without evidence.",
    };
  }

  const clean = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v === "" ? null : v]));

  if (id) {
    const existing = db.select().from(caseStudies).where(eq(caseStudies.id, id)).get();
    if (!existing) return { ok: false, error: "Case study not found." };
    db.update(caseStudies).set(clean).where(eq(caseStudies.id, id)).run();
    logActivity({ leadId: existing.leadId, entity: "case_study", entityId: id, action: "case_study_updated", detail: fields.companyName });
    revalidatePath("/case-studies");
    if (existing.leadId) revalidatePath(`/leads/${existing.leadId}`);
    return { ok: true, id };
  }

  if (leadId) {
    const lead = db.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId)).get();
    if (!lead) return { ok: false, error: "Lead not found." };
  }
  const newIdVal = newId("cst");
  db.insert(caseStudies)
    .values({ id: newIdVal, leadId: leadId ?? null, ...clean, companyName: parsed.data.companyName })
    .run();
  logActivity({ leadId: leadId ?? null, entity: "case_study", entityId: newIdVal, action: "case_study_updated", detail: `Created: ${parsed.data.companyName}` });
  revalidatePath("/case-studies");
  revalidatePath("/");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  return { ok: true, id: newIdVal };
}

export async function deleteCaseStudyAction(input: { id: string }): Promise<{ ok: boolean }> {
  await requireUser();
  const db = getDb();
  db.delete(caseStudies).where(eq(caseStudies.id, input.id)).run();
  revalidatePath("/case-studies");
  return { ok: true };
}
