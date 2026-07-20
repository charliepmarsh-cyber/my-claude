"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, ChevronDown, Plus, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, SectionTitle, Select, SourceTag, Textarea, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { AutomationOpportunity, Lead, Opportunity, PainHypothesis, WorkflowEdge, WorkflowNode } from "@/db/schema";
import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_CATEGORY_LABELS,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STAGE_LABELS,
  type OpportunityCategory,
  type OpportunityStage,
} from "@/lib/constants";
import { opportunityCategoryForPain } from "@/lib/opportunity-templates";
import { WorkflowDiagram } from "@/components/workflow-diagram";
import { fmtMoney } from "@/lib/format";
import {
  createDesignAction,
  createOpportunityAction,
  deleteDesignAction,
  moveOpportunityStageAction,
  updateDesignAction,
} from "@/server/actions/opportunities";

export function OpportunityPanels({
  lead,
  autoOpps,
  nodes,
  edges,
  opportunities,
  gateOk,
  gateMissing,
  pains,
}: {
  lead: Lead;
  autoOpps: AutomationOpportunity[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  opportunities: Opportunity[];
  gateOk: boolean;
  gateMissing: Array<{ label: string; why: string }>;
  pains: PainHypothesis[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const confirmedPain = pains.find((p) => p.status === "confirmed");
  const suggestedCategory: OpportunityCategory = confirmedPain ? opportunityCategoryForPain(confirmedPain.category) : "other";
  const [category, setCategory] = useState<OpportunityCategory>(suggestedCategory);
  const [gateModal, setGateModal] = useState<Array<{ label: string; why: string }> | null>(null);
  const [commercialFor, setCommercialFor] = useState<AutomationOpportunity | null>(null);
  const [commercialForm, setCommercialForm] = useState({ title: "", stage: "case_study_candidate" as OpportunityStage, value: "", proposedService: "" });

  const createDesign = (acknowledge = false) =>
    startTransition(async () => {
      const res = await createDesignAction({ leadId: lead.id, category, acknowledgeGate: acknowledge });
      if (res.ok) {
        toast("Automation design generated — review and edit every section.");
        setGateModal(null);
        router.refresh();
      } else if (res.missing) {
        setGateModal(res.missing);
      } else {
        toast(res.error, "error");
      }
    });

  return (
    <div className="space-y-5">
      {/* Designer header */}
      <Card>
        <CardHeader
          title="Design an automation opportunity"
          subtitle={
            gateOk
              ? "Discovery has met the minimum bar — designs generated here start from the discovery record."
              : "Discovery is below the minimum bar. You can still generate a draft design, but the gaps are shown and the design is not proposal-ready."
          }
        />
        <div className="flex flex-wrap items-end gap-3 p-5">
          <Field label="Opportunity category" hint={confirmedPain ? `Suggested from confirmed pain: ${confirmedPain.category}` : "Pick the closest match"} className="min-w-64">
            <Select value={category} onChange={(e) => setCategory(e.target.value as OpportunityCategory)}>
              {OPPORTUNITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {OPPORTUNITY_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="primary" size="md" disabled={pending} onClick={() => createDesign(false)}>
            <WorkflowIcon className="h-4 w-4" /> Generate design
          </Button>
          {!gateOk ? (
            <Link href={`/leads/${lead.id}?tab=discovery`} className="text-[12.5px] font-medium text-warn hover:underline">
              {gateMissing.length} discovery requirement{gateMissing.length === 1 ? "" : "s"} missing →
            </Link>
          ) : null}
        </div>
      </Card>

      {/* Designs */}
      {autoOpps.length === 0 ? (
        <Card>
          <EmptyState
            icon={<WorkflowIcon />}
            title="No automation designs yet"
            body="Generate one from a category — you'll get the full spec: current/future state, step split, integrations, risks, MVP scope and a workflow diagram with human checkpoints."
          />
        </Card>
      ) : (
        autoOpps.map((o) => (
          <DesignCard
            key={o.id}
            design={o}
            nodes={nodes.filter((n) => n.opportunityId === o.id)}
            edges={edges.filter((e) => e.opportunityId === o.id)}
            onDelete={() =>
              startTransition(async () => {
                await deleteDesignAction({ id: o.id, leadId: lead.id });
                toast("Design deleted.");
                router.refresh();
              })
            }
            onCreateCommercial={() => {
              setCommercialFor(o);
              setCommercialForm({
                title: o.title,
                stage: o.commercialModel === "free_case_study" ? "case_study_candidate" : "qualified",
                value: "",
                proposedService: o.title,
              });
            }}
            pending={pending}
          />
        ))
      )}

      {/* Commercial opportunities */}
      <Card>
        <CardHeader title="Commercial opportunities" subtitle="The sales-pipeline records for this lead." />
        {opportunities.length === 0 ? (
          <EmptyState icon={<Briefcase />} title="No commercial opportunities" body="Create one from an automation design above, or from the Opportunities page." className="py-8" />
        ) : (
          <ul className="divide-y divide-line/60">
            {opportunities.map((opp) => (
              <li key={opp.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-text">{opp.title}</p>
                  <p className="mt-0.5 text-[12px] text-dim">
                    {fmtMoney(opp.value)} · {Math.round((opp.probability ?? 0.5) * 100)}% · {opp.proposedService ?? "service TBC"}
                    {opp.stage === "lost" && opp.lostReason ? ` · lost: ${opp.lostReason}` : ""}
                  </p>
                </div>
                <OppStageControl opp={opp} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Gate modal */}
      <Modal open={!!gateModal} onClose={() => setGateModal(null)} title="Discovery gate not met" wide>
        <p className="text-[13px] text-muted">
          The system won&apos;t recommend a build to a lead on this little information. Missing minimums:
        </p>
        <ul className="mt-3 space-y-1.5">
          {(gateModal ?? []).map((m) => (
            <li key={m.label} className="text-[12.5px] text-warn">
              <span className="font-medium">{m.label}</span> <span className="text-muted">— {m.why}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] text-muted">
          You can generate an internal draft anyway (marked not proposal-ready), or go back and finish discovery.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Link href={`/leads/${lead.id}?tab=discovery`} className="inline-flex h-8 items-center rounded-(--radius-control) border border-line-strong bg-raised px-3 text-[12.5px] font-medium text-text hover:bg-overlay">
            Finish discovery
          </Link>
          <Button variant="secondary" disabled={pending} onClick={() => createDesign(true)}>
            Generate internal draft anyway
          </Button>
        </div>
      </Modal>

      {/* Commercial create modal */}
      <Modal open={!!commercialFor} onClose={() => setCommercialFor(null)} title="Create commercial opportunity">
        <div className="space-y-3">
          <Field label="Title" required>
            <Input value={commercialForm.title} onChange={(e) => setCommercialForm({ ...commercialForm, title: e.target.value })} />
          </Field>
          <Field label="Starting stage">
            <Select value={commercialForm.stage} onChange={(e) => setCommercialForm({ ...commercialForm, stage: e.target.value as OpportunityStage })}>
              {OPPORTUNITY_STAGES.filter((s) => !["won", "lost", "on_hold"].includes(s)).map((s) => (
                <option key={s} value={s}>
                  {OPPORTUNITY_STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value (£)" hint="0 for a free case-study build">
              <Input type="number" min={0} step={50} value={commercialForm.value} onChange={(e) => setCommercialForm({ ...commercialForm, value: e.target.value })} />
            </Field>
            <Field label="Proposed service">
              <Input value={commercialForm.proposedService} onChange={(e) => setCommercialForm({ ...commercialForm, proposedService: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setCommercialFor(null)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={commercialForm.title.trim().length < 2 || pending}
            onClick={() => {
              const src = commercialFor!;
              setCommercialFor(null);
              startTransition(async () => {
                const res = await createOpportunityAction({
                  leadId: lead.id,
                  automationOpportunityId: src.id,
                  title: commercialForm.title.trim(),
                  stage: commercialForm.stage,
                  value: commercialForm.value ? Number(commercialForm.value) : null,
                  proposedService: commercialForm.proposedService.trim() || undefined,
                });
                if (res.ok) {
                  toast("Commercial opportunity created.");
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

function OppStageControl({ opp }: { opp: Opportunity }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [lostModal, setLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const move = (stage: OpportunityStage, extra?: { lostReason?: string }) =>
    startTransition(async () => {
      const res = await moveOpportunityStageAction({ id: opp.id, stage, ...extra });
      if (res.ok) {
        toast(`Moved to ${OPPORTUNITY_STAGE_LABELS[stage]}.`);
        router.refresh();
      } else if (res.missing) {
        setBlocked(res.missing);
      } else toast(res.error ?? "Couldn't move", "error");
    });

  return (
    <>
      <Select
        aria-label="Opportunity stage"
        className="h-8 w-auto px-2 pr-7 text-[12px]"
        value={opp.stage}
        disabled={pending}
        onChange={(e) => {
          const stage = e.target.value as OpportunityStage;
          if (stage === "lost") {
            setLostModal(true);
            return;
          }
          move(stage);
        }}
      >
        {OPPORTUNITY_STAGES.map((s) => (
          <option key={s} value={s}>
            {OPPORTUNITY_STAGE_LABELS[s]}
          </option>
        ))}
      </Select>

      <Modal open={!!blocked} onClose={() => setBlocked(null)} title="Stage requirements not met">
        <ul className="list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {(blocked ?? []).map((m) => <li key={m}>{m}</li>)}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setBlocked(null)}>OK</Button>
        </div>
      </Modal>

      <Modal open={lostModal} onClose={() => setLostModal(false)} title="Mark as lost">
        <Field label="Lost reason" hint="Honest reasons power the learning loop." required>
          <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={2} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setLostModal(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={lostReason.trim().length < 3 || pending}
            onClick={() => {
              setLostModal(false);
              move("lost", { lostReason: lostReason.trim() });
            }}
          >
            Mark lost
          </Button>
        </div>
      </Modal>
    </>
  );
}

function DesignCard({
  design: o,
  nodes,
  edges,
  onDelete,
  onCreateCommercial,
  pending,
}: {
  design: AutomationOpportunity;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onDelete: () => void;
  onCreateCommercial: () => void;
  pending: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [estimates, setEstimates] = useState({
    timeSaved: o.timeSavedHoursMonth?.toString() ?? "",
    revenueImpact: o.revenueImpact ?? "",
    errorReduction: o.errorReduction ?? "",
    commercialModel: o.commercialModel,
  });

  const saveEstimates = () =>
    startTransition(async () => {
      const res = await updateDesignAction({
        id: o.id,
        leadId: o.leadId,
        timeSavedHoursMonth: estimates.timeSaved ? Number(estimates.timeSaved) : null,
        revenueImpact: estimates.revenueImpact,
        errorReduction: estimates.errorReduction,
        commercialModel: estimates.commercialModel,
      });
      if (res.ok) {
        toast("Design updated.");
        router.refresh();
      } else toast(res.error ?? "Couldn't save", "error");
    });

  const listBlock = (title: string, items: string[] | null, tone: "blue" | "violet" | "amber") => (
    <div>
      <SectionTitle className="mb-1.5">{title}</SectionTitle>
      {(items ?? []).length === 0 ? (
        <p className="text-[12px] text-dim">None specified.</p>
      ) : (
        <ul className="space-y-1">
          {(items ?? []).map((s, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-muted">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone === "blue" ? "bg-accent-bright" : tone === "violet" ? "bg-violet-400" : "bg-warn")} />
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const textBlock = (title: string, text: string | null) =>
    text ? (
      <div>
        <SectionTitle className="mb-1.5">{title}</SectionTitle>
        <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-muted">{text}</p>
      </div>
    ) : null;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className="font-display text-[14px] font-semibold text-text">{o.title}</span>
        <Badge tone="blue">{OPPORTUNITY_CATEGORY_LABELS[o.category]}</Badge>
        <Badge tone="grey">Complexity {o.complexity}</Badge>
        <SourceTag source={o.generationSource} />
        <Badge tone={o.status === "accepted" ? "green" : o.status === "declined" ? "red" : "amber"}>{o.status}</Badge>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="xs" onClick={onCreateCommercial}>
            <Plus className="h-3 w-3" /> Commercial opportunity
          </Button>
          <Button size="xs" variant="ghost" disabled={pending} onClick={onDelete} aria-label="Delete design">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <SectionTitle className="mb-1.5">Business problem</SectionTitle>
          <p className="text-[13px] leading-relaxed text-text">{o.businessProblem}</p>
        </div>

        <div>
          <SectionTitle className="mb-2">Proposed workflow (human checkpoints highlighted)</SectionTitle>
          <WorkflowDiagram nodes={nodes} edges={edges} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {listBlock("Deterministic steps", o.deterministicSteps, "blue")}
          {listBlock("AI-assisted steps", o.aiSteps, "violet")}
          {listBlock("Human approval steps", o.humanSteps, "amber")}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex cursor-pointer items-center gap-1 text-[12.5px] font-medium text-accent-bright hover:underline"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !expanded && "-rotate-90")} />
          {expanded ? "Hide" : "Show"} full specification
        </button>

        {expanded ? (
          <div className="grid grid-cols-1 gap-4 rounded-(--radius-control) border border-line bg-raised/40 p-4 md:grid-cols-2">
            {textBlock("Current state", o.currentState)}
            {textBlock("Future state", o.futureState)}
            {listBlock("Integrations", o.integrations, "blue")}
            {listBlock("Credentials needed", o.credentialsNeeded, "amber")}
            {textBlock("Data model", o.dataModel)}
            {textBlock("Exception handling", o.exceptionHandling)}
            {textBlock("Security considerations", o.securityConsiderations)}
            {textBlock("Risks", o.risks)}
            {textBlock("Measurement plan", o.measurementPlan)}
            {textBlock("MVP scope", o.mvpScope)}
            {textBlock("Phase two", o.phase2Scope)}
            {listBlock("Recommended stack", o.recommendedStack, "blue")}
            <div>
              <SectionTitle className="mb-1.5">Delivery readiness</SectionTitle>
              <p className="text-[12.5px] text-muted">
                {o.deliverableNow ? "CPM can deliver this now." : "Dependencies exist before CPM can deliver."}
                {o.missingSkills ? ` Missing: ${o.missingSkills}` : ""}
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                Case-study suitable: {o.caseStudySuitable ? "yes" : "not yet"}.
              </p>
            </div>
          </div>
        ) : null}

        {/* Estimates & commercial model */}
        <div className="grid grid-cols-1 items-end gap-3 border-t border-line pt-4 sm:grid-cols-4">
          <Field label="Time saved (hrs/month)">
            <Input type="number" min={0} value={estimates.timeSaved} onChange={(e) => setEstimates({ ...estimates, timeSaved: e.target.value })} />
          </Field>
          <Field label="Revenue impact">
            <Input value={estimates.revenueImpact} onChange={(e) => setEstimates({ ...estimates, revenueImpact: e.target.value })} placeholder="e.g. Faster quotes → more wins" />
          </Field>
          <Field label="Commercial model">
            <Select value={estimates.commercialModel} onChange={(e) => setEstimates({ ...estimates, commercialModel: e.target.value as never })}>
              <option value="undecided">Undecided</option>
              <option value="free_case_study">Free case-study build</option>
              <option value="paid_discovery">Paid discovery</option>
              <option value="paid_project">Paid project</option>
              <option value="retainer">Retainer</option>
            </Select>
          </Field>
          <Button variant="primary" size="md" disabled={pending} onClick={saveEstimates}>
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
