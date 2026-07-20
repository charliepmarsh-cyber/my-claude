import "server-only";
import { getDb } from "@/db";
import { activities } from "@/db/schema";
import { newId } from "@/lib/ids";

export function logActivity(input: {
  leadId?: string | null;
  entity: string;
  entityId?: string | null;
  action: string;
  detail?: string;
  actor?: "user" | "system" | "ai";
}): void {
  const db = getDb();
  db.insert(activities)
    .values({
      id: newId("act"),
      leadId: input.leadId ?? null,
      entity: input.entity,
      entityId: input.entityId ?? null,
      action: input.action,
      detail: input.detail ?? null,
      actor: input.actor ?? "user",
    })
    .run();
}
