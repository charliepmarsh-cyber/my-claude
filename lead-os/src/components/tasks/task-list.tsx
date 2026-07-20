"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { Badge, Button, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { TASK_KINDS, TASK_KIND_LABELS, type TaskKind } from "@/lib/constants";
import { fmtDue } from "@/lib/format";
import { cancelTaskAction, completeTaskAction, createTaskAction, snoozeTaskAction } from "@/server/actions/tasks";

type Item = {
  id: string;
  leadId: string | null;
  kind: TaskKind;
  title: string;
  detail: string | null;
  dueAt: Date | null;
  snoozedUntil: Date | null;
  leadName: string | null;
  leadDnc: boolean | null;
};

export function TaskList({ items, overdue }: { items: Item[]; overdue?: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast(okMsg);
        router.refresh();
      } else toast(res.error ?? "Something went wrong", "error");
    });

  return (
    <ul className="divide-y divide-line/60">
      {items.map((t) => {
        const due = fmtDue(t.snoozedUntil && t.snoozedUntil > new Date() ? t.snoozedUntil : t.dueAt);
        return (
          <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-text">
                {t.title}
                {t.leadDnc ? <Badge tone="red" className="ml-2">Lead is DNC</Badge> : null}
              </p>
              <p className="mt-0.5 text-[11.5px] text-dim">
                <Badge tone="grey" className="mr-1.5">{TASK_KIND_LABELS[t.kind]}</Badge>
                {t.leadId && t.leadName ? (
                  <>
                    <Link href={`/leads/${t.leadId}`} className="text-accent-bright hover:underline">
                      {t.leadName}
                    </Link>
                    {" · "}
                  </>
                ) : null}
                <span className={cn(overdue || due.overdue ? "font-medium text-danger" : "")}>
                  {t.snoozedUntil && t.snoozedUntil > new Date() ? `snoozed until ${due.text}` : t.dueAt ? `due ${due.text}` : "no due date"}
                </span>
                {t.detail ? <span className="text-dim"> · {t.detail}</span> : null}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button size="xs" variant="success" disabled={pending} onClick={() => act(() => completeTaskAction({ taskId: t.id }), "Task completed.")}>
                <Check className="h-3 w-3" /> Done
              </Button>
              <Select
                aria-label="Snooze task"
                className="h-6.5 w-auto px-1.5 pr-6 text-[11px]"
                value=""
                disabled={pending}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  if (days) act(() => snoozeTaskAction({ taskId: t.id, businessDays: days }), `Snoozed ${days} business day${days === 1 ? "" : "s"}.`);
                  e.target.value = "";
                }}
              >
                <option value="">
                  Snooze…
                </option>
                <option value="1">1 business day</option>
                <option value="2">2 business days</option>
                <option value="5">1 week</option>
                <option value="10">2 weeks</option>
              </Select>
              <Button size="xs" variant="ghost" disabled={pending} aria-label="Cancel task" onClick={() => act(() => cancelTaskAction({ taskId: t.id }), "Task cancelled.")}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function NewTaskButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", kind: "custom" as TaskKind, detail: "", dueAt: "" });

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> New task
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New task">
        <div className="space-y-3">
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as TaskKind })}>
                {TASK_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {TASK_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due date">
              <Input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            </Field>
          </div>
          <Field label="Detail">
            <Textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={2} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={form.title.trim().length < 2 || pending}
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                const res = await createTaskAction({ title: form.title.trim(), kind: form.kind, detail: form.detail.trim() || undefined, dueAt: form.dueAt || undefined });
                if (res.ok) {
                  toast("Task created.");
                  setForm({ title: "", kind: "custom", detail: "", dueAt: "" });
                  router.refresh();
                } else toast(res.error ?? "Couldn't create task", "error");
              });
            }}
          >
            Create task
          </Button>
        </div>
      </Modal>
    </>
  );
}
