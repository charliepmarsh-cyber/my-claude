"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { addBusinessDays } from "date-fns";
import { getDb } from "@/db";
import { tasks, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { TASK_KINDS } from "@/lib/constants";

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/");
  revalidatePath("/execute");
}

const createSchema = z.object({
  leadId: z.string().optional(),
  kind: z.enum(TASK_KINDS).default("custom"),
  title: z.string().trim().min(1, "Title required").max(300),
  detail: z.string().trim().max(1000).optional(),
  dueAt: z.string().optional(),
});

export async function createTaskAction(input: z.infer<typeof createSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = getDb();
  if (parsed.data.leadId) {
    const lead = db.select({ id: leads.id }).from(leads).where(eq(leads.id, parsed.data.leadId)).get();
    if (!lead) return { ok: false, error: "Lead not found." };
  }
  db.insert(tasks)
    .values({
      id: newId("tsk"),
      leadId: parsed.data.leadId ?? null,
      kind: parsed.data.kind,
      title: parsed.data.title,
      detail: parsed.data.detail || null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    })
    .run();
  logActivity({ leadId: parsed.data.leadId ?? null, entity: "task", action: "task_created", detail: parsed.data.title });
  refresh();
  return { ok: true };
}

export async function completeTaskAction(input: { taskId: string }): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, input.taskId)).get();
  if (!task) return { ok: false, error: "Task not found." };
  db.update(tasks).set({ status: "done", completedAt: new Date() }).where(eq(tasks.id, task.id)).run();
  logActivity({ leadId: task.leadId, entity: "task", entityId: task.id, action: "task_completed", detail: task.title });
  if (task.leadId) revalidatePath(`/leads/${task.leadId}`);
  refresh();
  return { ok: true };
}

const snoozeSchema = z.object({ taskId: z.string().min(1), businessDays: z.number().int().min(1).max(30) });

export async function snoozeTaskAction(input: z.infer<typeof snoozeSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const parsed = snoozeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid snooze." };
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, parsed.data.taskId)).get();
  if (!task) return { ok: false, error: "Task not found." };
  const until = addBusinessDays(new Date(), parsed.data.businessDays);
  db.update(tasks).set({ snoozedUntil: until, dueAt: until }).where(eq(tasks.id, task.id)).run();
  logActivity({ leadId: task.leadId, entity: "task", entityId: task.id, action: "task_snoozed", detail: `${task.title} → ${until.toDateString()}` });
  if (task.leadId) revalidatePath(`/leads/${task.leadId}`);
  refresh();
  return { ok: true };
}

export async function cancelTaskAction(input: { taskId: string }): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, input.taskId)).get();
  if (!task) return { ok: false, error: "Task not found." };
  db.update(tasks).set({ status: "cancelled" }).where(eq(tasks.id, task.id)).run();
  logActivity({ leadId: task.leadId, entity: "task", entityId: task.id, action: "task_created", detail: `Cancelled: ${task.title}` });
  if (task.leadId) revalidatePath(`/leads/${task.leadId}`);
  refresh();
  return { ok: true };
}
