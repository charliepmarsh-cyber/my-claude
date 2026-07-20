import { and, asc, eq, isNull, lte, or, gt } from "drizzle-orm";
import { endOfDay, startOfDay } from "date-fns";
import { CheckSquare } from "lucide-react";
import { getDb } from "@/db";
import { leads, tasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { TaskList, NewTaskButton } from "@/components/tasks/task-list";

export const metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireUser();
  const { filter } = await searchParams;
  const db = getDb();
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const open = and(eq(tasks.status, "open"), or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, now)));

  const all = db
    .select({
      id: tasks.id,
      leadId: tasks.leadId,
      kind: tasks.kind,
      title: tasks.title,
      detail: tasks.detail,
      dueAt: tasks.dueAt,
      snoozedUntil: tasks.snoozedUntil,
      status: tasks.status,
      leadName: leads.fullName,
      leadDnc: leads.doNotContact,
    })
    .from(tasks)
    .leftJoin(leads, eq(tasks.leadId, leads.id))
    .where(open)
    .orderBy(asc(tasks.dueAt))
    .all();

  const snoozed = db
    .select({
      id: tasks.id,
      leadId: tasks.leadId,
      kind: tasks.kind,
      title: tasks.title,
      detail: tasks.detail,
      dueAt: tasks.dueAt,
      snoozedUntil: tasks.snoozedUntil,
      status: tasks.status,
      leadName: leads.fullName,
      leadDnc: leads.doNotContact,
    })
    .from(tasks)
    .leftJoin(leads, eq(tasks.leadId, leads.id))
    .where(and(eq(tasks.status, "open"), gt(tasks.snoozedUntil, now)))
    .orderBy(asc(tasks.snoozedUntil))
    .all();

  const overdue = all.filter((t) => t.dueAt && t.dueAt < dayStart);
  const dueToday = all.filter((t) => t.dueAt && t.dueAt >= dayStart && t.dueAt <= dayEnd);
  const upcoming = all.filter((t) => !t.dueAt || t.dueAt > dayEnd);

  const sections =
    filter === "overdue"
      ? [{ title: "Overdue", subtitle: "Clear these first — they escalate silently otherwise.", items: overdue }]
      : filter === "due"
        ? [
            { title: "Overdue", subtitle: "Escalated — these were due before today.", items: overdue },
            { title: "Due today", subtitle: "", items: dueToday },
          ]
        : [
            { title: "Overdue", subtitle: "Escalated — these were due before today.", items: overdue },
            { title: "Due today", subtitle: "", items: dueToday },
            { title: "Upcoming", subtitle: "Scheduled ahead or undated.", items: upcoming },
            { title: "Snoozed", subtitle: "Hidden from queues until their snooze expires.", items: snoozed },
          ];

  const total = all.length + snoozed.length;

  return (
    <div>
      <PageHeader
        title="Tasks & follow-ups"
        subtitle={`${total} open task${total === 1 ? "" : "s"}. Follow-ups created when you mark messages sent land here automatically and cancel themselves when the lead replies.`}
        actions={<NewTaskButton />}
      />
      {total === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckSquare />}
            title="Nothing due"
            body="Follow-up tasks are created automatically when you mark outreach as sent. You can also add tasks manually."
            action={<NewTaskButton />}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {sections
            .filter((s) => s.items.length > 0)
            .map((s) => (
              <Card key={s.title}>
                <CardHeader title={`${s.title} (${s.items.length})`} subtitle={s.subtitle || undefined} />
                <TaskList items={s.items} overdue={s.title === "Overdue"} />
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
