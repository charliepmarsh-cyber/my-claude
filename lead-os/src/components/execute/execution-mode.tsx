"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MessageCircleReply,
  Microscope,
  RefreshCw,
  Send,
  SkipForward,
  Target,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, DemoBadge, Field, ProgressBar, ScoreChip, SectionTitle, Textarea, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { ExecutionItem, ExecutionQueue } from "@/server/execution";
import { ICP_CATEGORY_LABELS, MESSAGE_TYPE_LABELS } from "@/lib/constants";
import { markSentAction } from "@/server/actions/messages";
import { moveStageAction, setDncAction, setPriorityAction } from "@/server/actions/leads";
import { snoozeTaskAction } from "@/server/actions/tasks";

const kindMeta: Record<ExecutionItem["kind"], { label: string; icon: React.ReactNode; tone: "coral" | "amber" | "blue" | "cyan" }> = {
  respond: { label: "Respond to reply", icon: <MessageCircleReply className="h-4 w-4" />, tone: "coral" },
  overdue_follow_up: { label: "Overdue follow-up", icon: <Clock className="h-4 w-4" />, tone: "amber" },
  follow_up_due: { label: "Follow-up due", icon: <Clock className="h-4 w-4" />, tone: "amber" },
  contact: { label: "Contact", icon: <Target className="h-4 w-4" />, tone: "blue" },
  research: { label: "Research", icon: <Microscope className="h-4 w-4" />, tone: "cyan" },
};

export function ExecutionMode({ initialQueue }: { initialQueue: ExecutionQueue }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [sentToday, setSentToday] = useState(initialQueue.sentToday);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [dncModal, setDncModal] = useState(false);
  const [dncReason, setDncReason] = useState("");
  const [notRelevantModal, setNotRelevantModal] = useState(false);
  const [notRelevantReason, setNotRelevantReason] = useState("");
  const [sendBlocked, setSendBlocked] = useState<string[] | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const queue = useMemo(
    () => initialQueue.items.filter((i) => !doneIds.has(i.leadId)),
    [initialQueue.items, doneIds],
  );
  const remaining = queue.filter((i) => !skippedIds.has(i.leadId));
  const current = remaining[Math.min(index, Math.max(0, remaining.length - 1))];

  const advance = (leadId: string, wasCompleted: boolean) => {
    if (wasCompleted) {
      setCompleted((c) => c + 1);
      setDoneIds((s) => new Set(s).add(leadId));
    } else {
      setSkippedIds((s) => new Set(s).add(leadId));
    }
    setIndex(0);
  };

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  if (!current) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <h1 className="mt-4 font-display text-[20px] font-bold text-text">
          {initialQueue.items.length === 0 ? "Nothing in the queue" : "Session complete"}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {initialQueue.items.length === 0
            ? "No priority actions right now. Import leads, or check the Command Centre for what to set up next."
            : `${completed} action${completed === 1 ? "" : "s"} completed in ${mins}:${secs}. The queue rebuilds as replies and follow-ups come in.`}
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={() => router.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" /> Rebuild queue
          </Button>
          <Link href="/" className="inline-flex h-8 items-center rounded-(--radius-control) border border-line-strong bg-raised px-3 text-[12.5px] font-medium text-text hover:bg-overlay">
            Command Centre
          </Link>
        </div>
      </div>
    );
  }

  const meta = kindMeta[current.kind];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Session bar */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-(--radius-card) border border-line bg-surface px-4 py-3">
        <span className="text-[12px] text-muted">
          Session <span className="font-display font-semibold text-text tabular-nums">{mins}:{secs}</span>
        </span>
        <span className="text-[12px] text-muted">
          Completed <span className="font-display font-semibold text-success tabular-nums">{completed}</span>
        </span>
        <span className="text-[12px] text-muted">
          Remaining <span className="font-display font-semibold text-text tabular-nums">{remaining.length}</span>
        </span>
        <div className="ml-auto flex min-w-40 items-center gap-2">
          <span className="text-[11px] whitespace-nowrap text-dim">
            Outreach {sentToday}/{initialQueue.dailyTarget}
          </span>
          <ProgressBar value={sentToday} max={initialQueue.dailyTarget} tone="cyan" className="w-24" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Why this lead */}
        <div className={cn("border-b px-5 py-4", meta.tone === "coral" ? "border-coral/30 bg-coral/5" : meta.tone === "amber" ? "border-warn/30 bg-warn-soft" : meta.tone === "cyan" ? "border-cyan/30 bg-cyan/5" : "border-accent/30 bg-accent-soft")}>
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.icon} {meta.label}</Badge>
            {current.taskTitle ? <span className="text-[11.5px] text-dim">{current.taskTitle}</span> : null}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-text">{current.reason}</p>
        </div>

        {/* Lead summary */}
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[17px] font-bold text-text">{current.fullName}</h2>
            {current.dataSource === "demo" ? <DemoBadge /> : null}
            <ScoreChip value={current.overallScore} label="Score" />
            <Badge tone={current.warmth === "warm" ? "green" : "grey"} className="capitalize">{current.warmth}</Badge>
            {current.icpCategory ? <Badge tone="blue">{ICP_CATEGORY_LABELS[current.icpCategory]}</Badge> : null}
            <Link href={`/leads/${current.leadId}`} target="_blank" className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-accent-bright hover:underline">
              Open full profile <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            {[current.jobTitle, current.companyName].filter(Boolean).join(" · ") || "Role not recorded"}
          </p>

          {current.confirmedPains.length > 0 ? (
            <div className="mt-3">
              <SectionTitle className="mb-1">Confirmed pains</SectionTitle>
              <ul className="space-y-1">
                {current.confirmedPains.map((p) => (
                  <li key={p} className="text-[12.5px] text-text">• {p}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {current.researchHighlights.length > 0 ? (
            <div className="mt-3">
              <SectionTitle className="mb-1">Research highlights</SectionTitle>
              <ul className="space-y-1">
                {current.researchHighlights.map((r) => (
                  <li key={r} className="text-[12px] text-muted">• {r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {current.lastInbound ? (
            <div className="mt-3 rounded-(--radius-control) border border-success/25 bg-success-soft px-3.5 py-2.5">
              <SectionTitle className="mb-1">Their last reply{current.lastInbound.classification ? ` (${current.lastInbound.classification.replaceAll("_", " ")})` : ""}</SectionTitle>
              <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-text">{current.lastInbound.content}</p>
              {current.lastInbound.recommendedNextQuestion ? (
                <p className="mt-2 text-[12px] text-cyan">Ask next: “{current.lastInbound.recommendedNextQuestion}”</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Recommended message */}
        <div className="border-b border-line px-5 py-4">
          <SectionTitle className="mb-2">Recommended message</SectionTitle>
          {current.latestDraft ? (
            <>
              <p className="mb-1.5 text-[11.5px] text-dim">
                Draft on file: {MESSAGE_TYPE_LABELS[current.latestDraft.msgType]} — review it, copy it into{" "}
                {current.warmth === "warm" ? "LinkedIn" : "the channel"}, then mark it sent.
              </p>
              <div className="rounded-(--radius-control) bg-raised/70 px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-text">
                {current.latestDraft.body}
              </div>
            </>
          ) : (
            <p className="rounded-(--radius-control) border border-line bg-raised/40 px-3.5 py-3 text-[12.5px] text-muted">
              No draft yet.{" "}
              <Link href={`/leads/${current.leadId}?tab=outreach`} className="font-medium text-accent-bright hover:underline">
                Open the Outreach tab
              </Link>{" "}
              to generate one from this lead&apos;s actual data{current.kind === "research" ? " — after research" : ""}.
            </p>
          )}
          {current.evidence.length > 0 ? (
            <details className="mt-2.5">
              <summary className="cursor-pointer text-[12px] font-medium text-cyan hover:underline">
                Why this recommendation ({current.evidence.length} evidence points)
              </summary>
              <ul className="mt-1.5 space-y-1 rounded-(--radius-control) border border-cyan/20 bg-cyan/5 px-3.5 py-2.5">
                {current.evidence.map((e) => (
                  <li key={e} className="text-[12px] text-muted">• {e}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
          {current.latestDraft ? (
            <>
              <Button
                variant="primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(current.latestDraft!.body);
                  toast("Copied — paste it into the channel, then hit Mark sent.");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy message
              </Button>
              <Button
                variant="success"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await markSentAction({ messageId: current.latestDraft!.id });
                    if (res.ok) {
                      toast("Marked sent — follow-up scheduled.");
                      setSentToday((s) => s + 1);
                      advance(current.leadId, true);
                    } else if (res.blocked) {
                      setSendBlocked(res.blocked);
                    } else toast(res.error, "error");
                  })
                }
              >
                <Send className="h-3.5 w-3.5" /> Mark sent
              </Button>
            </>
          ) : null}
          <Link
            href={`/leads/${current.leadId}?tab=${current.kind === "respond" ? "conversation" : current.kind === "research" ? "intelligence" : "outreach"}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-(--radius-control) border border-line-strong bg-raised px-3 text-[12.5px] font-medium text-text hover:bg-overlay"
          >
            {current.kind === "respond" ? "Open conversation" : current.kind === "research" ? "Open research" : "Edit / generate"}
          </Link>
          <Button variant="ghost" onClick={() => advance(current.leadId, false)}>
            <SkipForward className="h-3.5 w-3.5" /> Skip
          </Button>
          {current.taskId ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await snoozeTaskAction({ taskId: current.taskId!, businessDays: 2 });
                  if (res.ok) {
                    toast("Snoozed 2 business days.");
                    advance(current.leadId, true);
                  } else toast(res.error ?? "Couldn't snooze", "error");
                })
              }
            >
              Snooze 2 days
            </Button>
          ) : null}
          {current.kind !== "research" ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await moveStageAction({ leadId: current.leadId, stage: "needs_research" });
                  if (res.ok) {
                    toast("Sent back to the research queue.");
                    advance(current.leadId, true);
                  } else toast(res.error, "error");
                })
              }
            >
              <Microscope className="h-3.5 w-3.5" /> Needs research
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => setNotRelevantModal(true)}>
            <XCircle className="h-3.5 w-3.5" /> Not relevant
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDncModal(true)}>
            <Ban className="h-3.5 w-3.5" /> Do not contact
          </Button>
        </div>
      </Card>

      <p className="mt-3 text-center text-[11.5px] text-dim">
        One action at a time. Completing or resolving a lead advances automatically to the next priority.
      </p>

      {/* Send guard */}
      <Modal open={!!sendBlocked} onClose={() => setSendBlocked(null)} title="Outreach guard">
        <ul className="list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {(sendBlocked ?? []).map((r) => <li key={r}>{r}</li>)}
        </ul>
        <p className="mt-3 text-[12.5px] text-muted">Adjust on the lead&apos;s Outreach tab if you need to override.</p>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setSendBlocked(null)}>OK</Button>
        </div>
      </Modal>

      {/* Not relevant */}
      <Modal open={notRelevantModal} onClose={() => setNotRelevantModal(false)} title="Mark as not relevant">
        <Field label="Why isn't this lead relevant?" hint="Sets priority to P4 and records the reason for the learning loop." required>
          <Textarea value={notRelevantReason} onChange={(e) => setNotRelevantReason(e.target.value)} rows={2} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setNotRelevantModal(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={notRelevantReason.trim().length < 3 || pending}
            onClick={() => {
              setNotRelevantModal(false);
              startTransition(async () => {
                const res = await setPriorityAction({ leadId: current.leadId, priority: "p4_low", reason: notRelevantReason.trim() });
                if (res.ok) {
                  toast("Deprioritised.");
                  setNotRelevantReason("");
                  advance(current.leadId, true);
                } else toast(res.error, "error");
              });
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>

      {/* DNC */}
      <Modal open={dncModal} onClose={() => setDncModal(false)} title="Do not contact">
        <Field label="Reason" hint="Suppresses their contact details across the whole system." required>
          <Textarea value={dncReason} onChange={(e) => setDncReason(e.target.value)} rows={2} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDncModal(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={dncReason.trim().length < 3 || pending}
            onClick={() => {
              setDncModal(false);
              startTransition(async () => {
                const res = await setDncAction({ leadId: current.leadId, on: true, reason: dncReason.trim() });
                if (res.ok) {
                  toast("Suppressed — no further outreach.");
                  setDncReason("");
                  advance(current.leadId, true);
                } else toast(res.error, "error");
              });
            }}
          >
            Suppress lead
          </Button>
        </div>
      </Modal>
    </div>
  );
}
