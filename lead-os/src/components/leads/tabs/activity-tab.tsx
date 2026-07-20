import { Activity as ActivityIcon, ArrowRightLeft, Bot, User } from "lucide-react";
import type { LeadDetail } from "@/server/lead-detail";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  created: "Lead created",
  updated: "Lead updated",
  deleted: "Lead deleted",
  stage_changed: "Stage changed",
  priority_set: "Priority set",
  do_not_contact_set: "Do-not-contact enabled",
  do_not_contact_cleared: "Do-not-contact cleared",
  score_overridden: "Score manually overridden",
  score_override_cleared: "Score override cleared",
  research_added: "Research added",
  signal_added: "Buying signal recorded",
  pain_added: "Pain hypothesis added",
  pain_updated: "Pain hypothesis updated",
  message_generated: "Message drafted",
  message_edited: "Message edited",
  message_sent: "Message marked as sent",
  reply_recorded: "Reply recorded",
  reply_analysed: "Reply analysed",
  note_added: "Note added",
  call_logged: "Call logged",
  meeting_logged: "Meeting logged",
  task_created: "Task created",
  task_completed: "Task completed",
  task_snoozed: "Task snoozed",
  discovery_updated: "Discovery updated",
  opportunity_created: "Automation opportunity created",
  opportunity_updated: "Automation opportunity updated",
  case_study_updated: "Case study updated",
  exported_csv: "Data exported",
};

export function ActivityTab({ detail }: { detail: LeadDetail }) {
  const items = detail.activities;

  return (
    <Card>
      <CardHeader
        title="Activity log"
        subtitle="Every change to this lead, oldest at the bottom. System and AI actions are labelled."
      />
      {items.length === 0 ? (
        <EmptyState icon={<ActivityIcon />} title="No activity yet" body="Actions on this lead will appear here with timestamps." />
      ) : (
        <ol className="divide-y divide-line/60">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3">
              <span className="mt-0.5 shrink-0 rounded-md border border-line-strong bg-raised p-1.5">
                {a.actor === "ai" ? (
                  <Bot className="h-3.5 w-3.5 text-violet-300" />
                ) : a.actor === "system" ? (
                  <ArrowRightLeft className="h-3.5 w-3.5 text-cyan" />
                ) : (
                  <User className="h-3.5 w-3.5 text-muted" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-text">
                  {ACTION_LABELS[a.action] ?? a.action}
                  <span className="ml-2 text-[11px] font-normal text-dim capitalize">{a.actor}</span>
                </p>
                {a.detail ? <p className="mt-0.5 text-[12.5px] leading-relaxed break-words text-muted">{a.detail}</p> : null}
              </div>
              <time className="shrink-0 text-[11px] whitespace-nowrap text-dim">{fmtDateTime(a.createdAt)}</time>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
