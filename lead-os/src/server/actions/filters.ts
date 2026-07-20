"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { savedFilters } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/ids";

const saveSchema = z.object({
  name: z.string().trim().min(1, "Name the filter").max(60),
  params: z.record(z.string(), z.string()),
});

export async function saveFilterAction(input: { name: string; params: Record<string, string> }) {
  await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const db = getDb();
  db.insert(savedFilters).values({ id: newId("flt"), name: parsed.data.name, params: parsed.data.params }).run();
  revalidatePath("/leads");
  return { ok: true as const };
}

export async function deleteFilterAction(input: { id: string }) {
  await requireUser();
  const db = getDb();
  db.delete(savedFilters).where(eq(savedFilters.id, input.id)).run();
  revalidatePath("/leads");
  return { ok: true as const };
}
