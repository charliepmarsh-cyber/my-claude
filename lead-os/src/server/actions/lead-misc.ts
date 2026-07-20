"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const schema = z.object({ leadId: z.string().min(1), reason: z.string().trim().min(3).max(500) });

/** Stores the closed reason ahead of a closed_unsuitable stage move (which requires it). */
export async function setCloseReasonAction(input: { leadId: string; reason: string }) {
  await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const db = getDb();
  db.update(leads).set({ closedReason: parsed.data.reason }).where(eq(leads.id, parsed.data.leadId)).run();
  return { ok: true as const };
}
