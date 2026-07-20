"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { deleteLeadAction, moveStageAction, setDncAction, setPriorityAction } from "@/server/actions/leads";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_LABEL_TEXT,
  type LeadStage,
  type PriorityLabel,
} from "@/lib/constants";

export function LeadActions({
  leadId,
  status,
  priority,
  doNotContact,
  suggestedPriority,
}: {
  leadId: string;
  status: LeadStage;
  priority: PriorityLabel | null;
  doNotContact: boolean;
  suggestedPriority: { label: PriorityLabel; reason: string } | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [stageBlock, setStageBlock] = useState<{ target: LeadStage; missing: string[] } | null>(null);
  const [priorityModal, setPriorityModal] = useState(false);
  const [priorityChoice, setPriorityChoice] = useState<PriorityLabel>(priority ?? suggestedPriority?.label ?? "p2_research_first");
  const [priorityReason, setPriorityReason] = useState("");
  const [dncModal, setDncModal] = useState(false);
  const [dncReason, setDncReason] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closeModal, setCloseModal] = useState<LeadStage | null>(null);

  const changeStage = (target: LeadStage, reason?: string) => {
    startTransition(async () => {
      const res = await moveStageAction({ leadId, stage: target, reason });
      if (res.ok) {
        toast(`Stage set to ${LEAD_STAGE_LABELS[target]}.`);
        router.refresh();
      } else if (res.missing?.length) {
        setStageBlock({ target, missing: res.missing });
      } else {
        toast(res.error, "error");
      }
    });
  };

  const onStageSelect = (target: LeadStage) => {
    if (target === "closed_unsuitable") {
      setCloseModal(target);
      return;
    }
    changeStage(target);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-[12px] text-dim">
        Stage
        <Select
          aria-label="Change stage"
          className="h-8 w-auto px-2 pr-7 text-[12.5px]"
          value={status}
          disabled={pending}
          onChange={(e) => onStageSelect(e.target.value as LeadStage)}
        >
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </Select>
      </label>

      <Button size="sm" onClick={() => setPriorityModal(true)} disabled={pending}>
        Set priority
      </Button>

      {doNotContact ? (
        <Button size="sm" variant="success" onClick={() => setDncModal(true)} disabled={pending}>
          <ShieldCheck className="h-3.5 w-3.5" /> Clear do-not-contact
        </Button>
      ) : (
        <Button size="sm" variant="danger" onClick={() => setDncModal(true)} disabled={pending}>
          <Ban className="h-3.5 w-3.5" /> Do not contact
        </Button>
      )}

      <Link
        href={`/leads/${leadId}/edit`}
        className="inline-flex h-8 items-center gap-1.5 rounded-(--radius-control) border border-line-strong bg-raised px-3 text-[12.5px] font-medium text-text hover:bg-overlay"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Link>

      <Button size="sm" variant="ghost" onClick={() => setDeleteModal(true)} disabled={pending} aria-label="Delete lead">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      {/* Stage blocked modal */}
      <Modal open={!!stageBlock} onClose={() => setStageBlock(null)} title="That stage needs more information">
        <p className="text-[13px] text-muted">
          Before moving to <strong className="text-text">{stageBlock ? LEAD_STAGE_LABELS[stageBlock.target] : ""}</strong>:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {stageBlock?.missing.map((m) => <li key={m}>{m}</li>)}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setStageBlock(null)}>Understood</Button>
        </div>
      </Modal>

      {/* Close-reason modal */}
      <Modal open={!!closeModal} onClose={() => setCloseModal(null)} title="Close this lead">
        <Field label="Why is this lead unsuitable?" hint="Kept for the learning loop — honest reasons make future targeting better." required>
          <Textarea value={closeReason} onChange={(e) => setCloseReason(e.target.value)} rows={3} placeholder="e.g. No operational pain — happy with current setup" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setCloseModal(null)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={closeReason.trim().length < 3 || pending}
            onClick={() => {
              const target = closeModal!;
              setCloseModal(null);
              startTransition(async () => {
                const { setCloseReasonAction } = await import("@/server/actions/lead-misc");
                await setCloseReasonAction({ leadId, reason: closeReason.trim() });
                changeStage(target, closeReason.trim());
              });
            }}
          >
            Close lead
          </Button>
        </div>
      </Modal>

      {/* Priority modal */}
      <Modal open={priorityModal} onClose={() => setPriorityModal(false)} title="Set priority">
        {suggestedPriority ? (
          <div className="mb-4 rounded-(--radius-control) border border-accent/30 bg-accent-soft px-3.5 py-3">
            <p className="text-[12.5px] font-medium text-accent-bright">
              Suggested: {PRIORITY_LABEL_TEXT[suggestedPriority.label]}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{suggestedPriority.reason}</p>
          </div>
        ) : null}
        <Field label="Priority">
          <Select value={priorityChoice} onChange={(e) => setPriorityChoice(e.target.value as PriorityLabel)}>
            {PRIORITY_LABELS.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL_TEXT[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason" hint="Required. Shown in the activity log so future-you knows why." className="mt-3" required>
          <Textarea value={priorityReason} onChange={(e) => setPriorityReason(e.target.value)} rows={2} placeholder="e.g. Accepting suggestion — warm, high fit, reachable" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setPriorityModal(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={priorityReason.trim().length < 3 || pending}
            onClick={() => {
              setPriorityModal(false);
              startTransition(async () => {
                const res = await setPriorityAction({ leadId, priority: priorityChoice, reason: priorityReason.trim() });
                if (res.ok) {
                  toast("Priority updated.");
                  setPriorityReason("");
                  router.refresh();
                } else toast(res.error, "error");
              });
            }}
          >
            Save priority
          </Button>
        </div>
      </Modal>

      {/* DNC modal */}
      <Modal open={dncModal} onClose={() => setDncModal(false)} title={doNotContact ? "Clear do-not-contact" : "Mark as do-not-contact"}>
        {!doNotContact ? (
          <p className="mb-3 text-[13px] leading-relaxed text-muted">
            This suppresses their email and LinkedIn across the whole system, cancels open tasks, and blocks outreach
            until cleared. Use it the moment someone asks not to be contacted.
          </p>
        ) : (
          <p className="mb-3 text-[13px] leading-relaxed text-muted">
            This re-enables outreach for this lead. Suppression-list entries for their email/LinkedIn are kept —
            remove those in Settings if you are certain.
          </p>
        )}
        <Field label="Reason" required>
          <Textarea value={dncReason} onChange={(e) => setDncReason(e.target.value)} rows={2} placeholder={doNotContact ? "e.g. They invited a follow-up next quarter" : "e.g. Asked not to be messaged"} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDncModal(false)}>Cancel</Button>
          <Button
            variant={doNotContact ? "success" : "danger"}
            disabled={dncReason.trim().length < 3 || pending}
            onClick={() => {
              setDncModal(false);
              startTransition(async () => {
                const res = await setDncAction({ leadId, on: !doNotContact, reason: dncReason.trim() });
                if (res.ok) {
                  toast(doNotContact ? "Do-not-contact cleared." : "Lead suppressed — no further outreach.");
                  setDncReason("");
                  router.refresh();
                } else toast(res.error, "error");
              });
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete this lead?">
        <p className="text-[13px] leading-relaxed text-muted">
          Soft delete — the record is hidden everywhere but kept in the database for audit history.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDeleteModal(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              setDeleteModal(false);
              startTransition(async () => {
                const res = await deleteLeadAction({ leadId });
                if (res.ok) {
                  toast("Lead deleted.");
                  router.push("/leads");
                } else toast(res.error, "error");
              });
            }}
          >
            Delete lead
          </Button>
        </div>
      </Modal>
    </div>
  );
}
