"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookMarked, ChevronDown, Copy, FileText, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { CaseStudy } from "@/db/schema";
import { CASE_STUDY_DOC_LABELS, generateCaseStudyDoc, type CaseStudyDocKind } from "@/lib/case-study-docs";
import { deleteCaseStudyAction, upsertCaseStudyAction } from "@/server/actions/case-studies";

const BUILD_LABELS: Record<CaseStudy["buildStatus"], string> = {
  not_started: "Not started",
  scoping: "Scoping",
  building: "Building",
  testing: "Testing",
  live: "Live",
  measuring: "Measuring",
  complete: "Complete",
};

export function CaseStudyBoard({ items }: { items: CaseStudy[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [newCompany, setNewCompany] = useState("");

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New case study
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookMarked />}
            title="No case studies yet"
            body="When a lead agrees to a free build, track it here: baseline, success metric, evidence, testimonial and publishing permission."
            action={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                Start tracking one
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((cs) => (
            <CaseStudyCard key={cs.id} cs={cs} />
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New case study">
        <Field label="Company / client name" required>
          <Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={newCompany.trim().length < 1 || pending}
            onClick={() => {
              setCreateOpen(false);
              startTransition(async () => {
                const res = await upsertCaseStudyAction({ companyName: newCompany.trim() });
                if (res.ok) {
                  toast("Case study created — fill in the details.");
                  setNewCompany("");
                  router.refresh();
                } else toast(res.error ?? "Couldn't create", "error");
              });
            }}
          >
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CaseStudyCard({ cs }: { cs: CaseStudy }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [doc, setDoc] = useState<{ kind: CaseStudyDocKind; title: string; body: string; warnings: string[] } | null>(null);
  const [docBlocked, setDocBlocked] = useState<{ kind: CaseStudyDocKind; missing: string[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    problem: cs.problem ?? "",
    baseline: cs.baseline ?? "",
    proposedBuild: cs.proposedBuild ?? "",
    successMetric: cs.successMetric ?? "",
    dataRequired: cs.dataRequired ?? "",
    approvalStatus: cs.approvalStatus,
    buildStatus: cs.buildStatus,
    beforeEvidence: cs.beforeEvidence ?? "",
    afterEvidence: cs.afterEvidence ?? "",
    timeSaved: cs.timeSaved ?? "",
    revenueInfluenced: cs.revenueInfluenced ?? "",
    errorReduction: cs.errorReduction ?? "",
    qualitativeFeedback: cs.qualitativeFeedback ?? "",
    testimonialStatus: cs.testimonialStatus,
    permissionToPublish: cs.permissionToPublish,
    redactionRequirements: cs.redactionRequirements ?? "",
    referralRequested: cs.referralRequested,
    paidFollowOn: cs.paidFollowOn ?? "",
  });

  const save = () =>
    startTransition(async () => {
      const res = await upsertCaseStudyAction({ id: cs.id, companyName: cs.companyName, ...form });
      if (res.ok) {
        toast("Case study saved.");
        router.refresh();
      } else toast(res.error ?? "Couldn't save", "error");
    });

  const generate = (kind: CaseStudyDocKind) => {
    const merged: CaseStudy = { ...cs, ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])) } as CaseStudy;
    const result = generateCaseStudyDoc(kind, merged);
    if (result.ok) setDoc({ kind, ...result });
    else setDocBlocked({ kind, missing: result.missing });
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className="font-display text-[14.5px] font-semibold text-text">{cs.companyName}</span>
        <Badge tone={cs.approvalStatus === "approved" ? "green" : cs.approvalStatus === "declined" ? "red" : "amber"}>
          Offer: {cs.approvalStatus.replaceAll("_", " ")}
        </Badge>
        <Badge tone={cs.buildStatus === "complete" ? "green" : "blue"}>Build: {BUILD_LABELS[cs.buildStatus]}</Badge>
        {cs.permissionToPublish ? <Badge tone="green">Publishable</Badge> : <Badge tone="grey">Not publishable yet</Badge>}
        {cs.leadId ? (
          <Link href={`/leads/${cs.leadId}`} className="text-[12px] font-medium text-accent-bright hover:underline">
            Open lead →
          </Link>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="xs" variant="ghost" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !expanded && "-rotate-90")} />
            {expanded ? "Collapse" : "Edit details"}
          </Button>
          <Button size="xs" variant="ghost" aria-label="Delete case study" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Doc generator strip */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-raised/40 px-5 py-2.5">
        <FileText className="h-3.5 w-3.5 text-dim" />
        <span className="mr-1 text-[11.5px] text-dim">Generate:</span>
        {(Object.keys(CASE_STUDY_DOC_LABELS) as CaseStudyDocKind[]).map((k) => (
          <Button key={k} size="xs" variant="ghost" onClick={() => generate(k)}>
            {CASE_STUDY_DOC_LABELS[k]}
          </Button>
        ))}
      </div>

      {expanded ? (
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Problem" className="sm:col-span-2">
              <Textarea rows={2} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} />
            </Field>
            <Field label="Baseline (before)">
              <Textarea rows={2} value={form.baseline} onChange={(e) => setForm({ ...form, baseline: e.target.value })} />
            </Field>
            <Field label="Proposed build">
              <Textarea rows={2} value={form.proposedBuild} onChange={(e) => setForm({ ...form, proposedBuild: e.target.value })} />
            </Field>
            <Field label="Success metric (agreed up front)">
              <Input value={form.successMetric} onChange={(e) => setForm({ ...form, successMetric: e.target.value })} />
            </Field>
            <Field label="Data / access required">
              <Input value={form.dataRequired} onChange={(e) => setForm({ ...form, dataRequired: e.target.value })} />
            </Field>
            <Field label="Offer status">
              <Select value={form.approvalStatus} onChange={(e) => setForm({ ...form, approvalStatus: e.target.value as never })}>
                <option value="not_asked">Not asked</option>
                <option value="asked">Asked</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </Select>
            </Field>
            <Field label="Build status">
              <Select value={form.buildStatus} onChange={(e) => setForm({ ...form, buildStatus: e.target.value as never })}>
                {Object.entries(BUILD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Before evidence" hint="Screenshots, timings, exports — where the baseline is proven.">
              <Textarea rows={2} value={form.beforeEvidence} onChange={(e) => setForm({ ...form, beforeEvidence: e.target.value })} />
            </Field>
            <Field label="After evidence" hint="Required before any outcome figures can be saved.">
              <Textarea rows={2} value={form.afterEvidence} onChange={(e) => setForm({ ...form, afterEvidence: e.target.value })} />
            </Field>
            <Field label="Time saved (measured)">
              <Input value={form.timeSaved} onChange={(e) => setForm({ ...form, timeSaved: e.target.value })} placeholder="e.g. 6 hrs/week" />
            </Field>
            <Field label="Revenue influenced (measured)">
              <Input value={form.revenueInfluenced} onChange={(e) => setForm({ ...form, revenueInfluenced: e.target.value })} />
            </Field>
            <Field label="Error reduction (measured)">
              <Input value={form.errorReduction} onChange={(e) => setForm({ ...form, errorReduction: e.target.value })} />
            </Field>
            <Field label="Qualitative feedback (their words)">
              <Textarea rows={2} value={form.qualitativeFeedback} onChange={(e) => setForm({ ...form, qualitativeFeedback: e.target.value })} />
            </Field>
            <Field label="Testimonial status">
              <Select value={form.testimonialStatus} onChange={(e) => setForm({ ...form, testimonialStatus: e.target.value as never })}>
                <option value="not_asked">Not asked</option>
                <option value="asked">Asked</option>
                <option value="received">Received</option>
                <option value="declined">Declined</option>
              </Select>
            </Field>
            <Field label="Redaction requirements">
              <Input value={form.redactionRequirements} onChange={(e) => setForm({ ...form, redactionRequirements: e.target.value })} placeholder="e.g. Don't use company name" />
            </Field>
            <Field label="Paid follow-on opportunity" className="sm:col-span-2">
              <Input value={form.paidFollowOn} onChange={(e) => setForm({ ...form, paidFollowOn: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-text select-none">
              <input type="checkbox" checked={form.permissionToPublish} onChange={(e) => setForm({ ...form, permissionToPublish: e.target.checked })} className="h-4 w-4 accent-[#2563eb]" />
              Written permission to publish received
            </label>
            <label className="flex items-center gap-2 text-[13px] text-text select-none">
              <input type="checkbox" checked={form.referralRequested} onChange={(e) => setForm({ ...form, referralRequested: e.target.checked })} className="h-4 w-4 accent-[#2563eb]" />
              Referral requested
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save case study"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3.5">
          <p className="text-[12.5px] leading-relaxed text-muted">
            {cs.problem ?? "No problem recorded yet — expand to fill in the details."}
          </p>
        </div>
      )}

      {/* Generated doc modal */}
      <Modal open={!!doc} onClose={() => setDoc(null)} title={doc ? CASE_STUDY_DOC_LABELS[doc.kind] : ""} wide>
        {doc?.warnings.map((w) => (
          <p key={w} className="mb-3 rounded-(--radius-control) border border-warn/30 bg-warn-soft px-3 py-2 text-[12px] text-warn">
            {w}
          </p>
        ))}
        <pre className="max-h-[50vh] overflow-y-auto rounded-(--radius-control) bg-raised/70 px-4 py-3 font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap text-text">
          {doc?.body}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(doc?.body ?? "");
              toast("Copied to clipboard.");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="primary" onClick={() => setDoc(null)}>
            Done
          </Button>
        </div>
      </Modal>

      {/* Doc blocked modal */}
      <Modal open={!!docBlocked} onClose={() => setDocBlocked(null)} title="Missing information for this document">
        <p className="text-[13px] text-muted">
          {docBlocked ? CASE_STUDY_DOC_LABELS[docBlocked.kind] : ""} needs the following recorded first:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {docBlocked?.missing.map((m) => <li key={m}>{m}</li>)}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setDocBlocked(null)}>OK</Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this case study?">
        <p className="text-[13px] text-muted">This removes the tracking record permanently. The lead record is unaffected.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              setConfirmDelete(false);
              startTransition(async () => {
                await deleteCaseStudyAction({ id: cs.id });
                toast("Case study deleted.");
                router.refresh();
              });
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
