"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { discoveries, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { DISCOVERY_FIELDS, canRecommendBuild, computeDiscoveryCompleteness } from "@/lib/discovery";
import { recomputeLead } from "@/server/lead-service";

const fieldShape = Object.fromEntries(
  DISCOVERY_FIELDS.map((f) => [
    f.key,
    z
      .string()
      .trim()
      .max(4000)
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
  ]),
) as Record<string, z.ZodType<string | null | undefined>>;

const upsertSchema = z.object({ leadId: z.string().min(1), ...fieldShape });

export async function upsertDiscoveryAction(
  input: Record<string, string | null | undefined> & { leadId: string },
): Promise<{ ok: boolean; error?: string; completeness?: number }> {
  await requireUser();
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { leadId, ...fields } = parsed.data;

  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };

  const existing = db.select().from(discoveries).where(eq(discoveries.leadId, leadId)).get();
  const merged = { ...(existing ?? {}), ...fields } as Record<string, string | null>;
  const completeness = computeDiscoveryCompleteness(merged);
  const gate = canRecommendBuild(merged);
  const status = gate.ok ? (completeness >= 90 ? "complete" : "sufficient") : "open";

  if (existing) {
    db.update(discoveries)
      .set({ ...(fields as Record<string, string | null>), completeness, status })
      .where(eq(discoveries.id, existing.id))
      .run();
  } else {
    db.insert(discoveries)
      .values({ id: newId("dsc"), leadId, ...(fields as Record<string, string | null>), completeness, status })
      .run();
  }

  logActivity({ leadId, entity: "discovery", action: "discovery_updated", detail: `Completeness ${completeness}% (${status})` });
  recomputeLead(leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { ok: true, completeness };
}
