"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Lightbulb, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfidenceTag,
  EmptyState,
  Field,
  Input,
  ScoreChip,
  Select,
  SourceTag,
  Textarea,
  cn,
} from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { BuyingSignal, Company, Lead, PainHypothesis, ResearchItem, Score } from "@/db/schema";
import {
  PAIN_CATEGORIES,
  PAIN_CATEGORY_LABELS,
  SCORE_DIMENSIONS,
  SCORE_DIMENSION_LABELS,
  SIGNAL_TYPES,
  SIGNAL_TYPE_LABELS,
  type ScoreDimension,
} from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import {
  addPainAction,
  addResearchAction,
  addSignalAction,
  deletePainAction,
  deleteResearchAction,
  deleteSignalAction,
  suggestPainsAction,
  updateCompanyAction,
  updatePainAction,
  markResearchedAction,
} from "@/server/actions/research";
import { clearScoreOverrideAction, overrideScoreAction, recomputeScoresAction } from "@/server/actions/leads";

export function IntelligencePanels({
  lead,
  company,
  scores,
  research,
  signals,
  pains,
}: {
  lead: Lead;
  company: Company | null;
  scores: Score[];
  research: ResearchItem[];
  signals: BuyingSignal[];
  pains: PainHypothesis[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        <ScoresPanel leadId={lead.id} scores={scores} />
        <CompanyPanel leadId={lead.id} company={company} />
      </div>
      <div className="space-y-5">
        <PainsPanel leadId={lead.id} pains={pains} />
        <SignalsPanel leadId={lead.id} signals={signals} />
        <ResearchPanel leadId={lead.id} research={research} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scores                                                              */
/* ------------------------------------------------------------------ */

function ScoresPanel({ leadId, scores }: { leadId: string; scores: Score[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>("overall");
  const [overrideDim, setOverrideDim] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState(50);
  const [overrideReason, setOverrideReason] = useState("");

  const byDim = new Map(scores.map((s) => [s.dimension, s]));
  const overall = byDim.get("overall");

  const refresh = () =>
    startTransition(async () => {
      await recomputeScoresAction({ leadId });
      toast("Scores recomputed from current data.");
      router.refresh();
    });

  const dims: Array<ScoreDimension | "overall"> = ["overall", ...SCORE_DIMENSIONS];

  return (
    <Card>
      <CardHeader
        title="Score breakdown"
        subtitle="Deterministic rules — every point is traceable. AI never sets scores."
        actions={
          <Button size="xs" variant="ghost" onClick={refresh} disabled={pending} title="Recompute from current data">
            <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} /> Recompute
          </Button>
        }
      />
      <div className="divide-y divide-line/60">
        {dims.map((dim) => {
          const s = byDim.get(dim);
          const isOpen = open === dim;
          const label = dim === "overall" ? "Overall priority (weighted)" : SCORE_DIMENSION_LABELS[dim];
          return (
            <div key={dim}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : dim)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left hover:bg-raised/60"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-dim transition-transform", !isOpen && "-rotate-90")} />
                <span className={cn("flex-1 text-[13px]", dim === "overall" ? "font-semibold text-text" : "text-muted")}>
                  {label}
                </span>
                {s?.calculatedBy === "manual" ? <SourceTag source="manual" /> : null}
                <ScoreChip value={s?.value ?? null} />
              </button>
              {isOpen ? (
                <div className="px-5 pb-4">
                  {s?.calculatedBy === "manual" ? (
                    <div className="mb-3 rounded-(--radius-control) border border-warn/30 bg-warn-soft px-3 py-2.5">
                      <p className="text-[12px] text-warn">
                        Manually overridden{s.manualReason ? `: ${s.manualReason}` : ""}. The rules engine is paused for
                        this dimension.
                      </p>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="mt-1.5"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await clearScoreOverrideAction({ leadId, dimension: dim });
                            toast("Override cleared — rules restored.");
                            router.refresh();
                          })
                        }
                      >
                        Restore rules-based score
                      </Button>
                    </div>
                  ) : null}
                  {(s?.breakdown ?? []).length === 0 ? (
                    <p className="text-[12.5px] text-dim">No factors recorded yet — recompute after adding data.</p>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10.5px] tracking-wider text-dim uppercase">
                          <th className="py-1 pr-2 font-semibold">Factor</th>
                          <th className="w-16 py-1 pr-2 text-right font-semibold">Points</th>
                          <th className="py-1 pl-3 font-semibold">Evidence / what&apos;s missing</th>
                        </tr>
                      </thead>
                      <tbody className="align-top">
                        {(s?.breakdown ?? []).map((line, i) => (
                          <tr key={i} className="border-t border-line/50">
                            <td className="py-1.5 pr-2 text-[12px] text-text">
                              {dim === "overall" && line.factor in SCORE_DIMENSION_LABELS
                                ? SCORE_DIMENSION_LABELS[line.factor as ScoreDimension]
                                : line.factor}
                            </td>
                            <td className={cn("py-1.5 pr-2 text-right text-[12px] tabular-nums", line.points > 0 ? "text-success" : line.points < 0 ? "text-danger" : "text-dim")}>
                              {line.points > 0 ? "+" : ""}
                              {line.points}
                              <span className="text-dim">/{line.max}</span>
                            </td>
                            <td className="py-1.5 pl-3 text-[12px] leading-snug">
                              {line.evidence ? <span className="text-muted">{line.evidence}</span> : null}
                              {line.missing ? <span className="text-warn">{line.missing}</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-dim">
                      Calculated by {s?.calculatedBy === "manual" ? "manual override" : "rules engine"} ·{" "}
                      {s ? fmtDateTime(s.computedAt) : "never"}
                    </p>
                    {s?.calculatedBy !== "manual" ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setOverrideDim(dim);
                          setOverrideValue(s?.value ?? 50);
                          setOverrideReason("");
                        }}
                      >
                        Override manually
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Modal open={!!overrideDim} onClose={() => setOverrideDim(null)} title={`Override ${overrideDim === "overall" ? "overall score" : overrideDim ? SCORE_DIMENSION_LABELS[overrideDim as ScoreDimension] : ""}`}>
        <Field label={`New value: ${overrideValue}`}>
          <input
            type="range"
            min={0}
            max={100}
            value={overrideValue}
            onChange={(e) => setOverrideValue(Number(e.target.value))}
            className="w-full accent-[#2563eb]"
            aria-label="Score value"
          />
        </Field>
        <Field label="Reason" hint="Required — shown wherever this score appears." required className="mt-3">
          <Textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={2} placeholder="e.g. Spoke to them — pain is bigger than the record shows" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setOverrideDim(null)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={overrideReason.trim().length < 5 || pending}
            onClick={() => {
              const dim = overrideDim!;
              setOverrideDim(null);
              startTransition(async () => {
                const res = await overrideScoreAction({ leadId, dimension: dim as ScoreDimension | "overall", value: overrideValue, reason: overrideReason.trim() });
                if (res.ok) {
                  toast("Score overridden — the reason is on record.");
                  router.refresh();
                } else toast(res.error, "error");
              });
            }}
          >
            Save override
          </Button>
        </div>
      </Modal>

      {!overall ? (
        <div className="border-t border-line px-5 py-3">
          <p className="text-[12px] text-dim">No scores yet — hit Recompute.</p>
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pains                                                               */
/* ------------------------------------------------------------------ */

function PainsPanel({ leadId, pains }: { leadId: string; pains: PainHypothesis[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [evidenceFor, setEvidenceFor] = useState<PainHypothesis | null>(null);
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [confirmAfter, setConfirmAfter] = useState(false);

  const [form, setForm] = useState({
    category: "campaign_reporting" as (typeof PAIN_CATEGORIES)[number],
    hypothesis: "",
    evidence: "",
    evidenceUrl: "",
    confidence: "low" as const,
    impact: "medium" as const,
    discoveryQuestion: "",
    automationDirection: "",
    humanJudgementNote: "",
  });

  const suggest = () =>
    startTransition(async () => {
      const res = await suggestPainsAction({ leadId });
      if (res.ok) {
        toast(`${res.added} hypothesis${res.added === 1 ? "" : "es"} suggested — verify before relying on them.`, "info");
        router.refresh();
      } else toast(res.error, "warn");
    });

  const setStatus = (p: PainHypothesis, status: "confirmed" | "rejected" | "proposed") => {
    if (status === "confirmed" && !p.evidence && !p.evidenceUrl) {
      setEvidenceFor(p);
      setEvidenceText("");
      setEvidenceUrl("");
      setConfirmAfter(true);
      return;
    }
    startTransition(async () => {
      const res = await updatePainAction({ id: p.id, leadId, status });
      if (res.ok) {
        toast(status === "confirmed" ? "Hypothesis confirmed." : status === "rejected" ? "Hypothesis rejected." : "Back to proposed.");
        router.refresh();
      } else toast(res.error, "error");
    });
  };

  return (
    <Card>
      <CardHeader
        title="Pain hypotheses"
        subtitle="Hypotheses to verify — confirming requires evidence."
        actions={
          <>
            <Button size="xs" variant="ghost" onClick={suggest} disabled={pending} title="Rules-based suggestions for this ICP category">
              <Lightbulb className="h-3.5 w-3.5" /> Suggest
            </Button>
            <Button size="xs" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </>
        }
      />
      {pains.length === 0 ? (
        <EmptyState
          title="No pain hypotheses yet"
          body="Add what you suspect their operational pain is, or generate rules-based suggestions for their category. Each needs evidence before it can be confirmed."
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-line/60">
          {pains.map((p) => (
            <li key={p.id} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="blue">{PAIN_CATEGORY_LABELS[p.category]}</Badge>
                    <Badge tone={p.status === "confirmed" ? "green" : p.status === "rejected" ? "red" : "grey"}>
                      {p.status}
                    </Badge>
                    <ConfidenceTag level={p.confidence} />
                    <Badge tone={p.impact === "high" ? "coral" : p.impact === "medium" ? "amber" : "grey"}>
                      {p.impact} impact
                    </Badge>
                    <SourceTag source={p.source} />
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text">{p.hypothesis}</p>
                  {p.evidence ? (
                    <p className="mt-1 text-[12px] leading-relaxed text-muted">
                      <span className="text-dim">Evidence:</span> {p.evidence}
                      {p.evidenceUrl ? (
                        <a href={p.evidenceUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-accent-bright hover:underline">
                          source <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : null}
                    </p>
                  ) : p.evidenceUrl ? (
                    <a href={p.evidenceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent-bright hover:underline">
                      Evidence source <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="mt-1 text-[12px] text-warn">No evidence attached yet.</p>
                  )}
                  {p.discoveryQuestion ? (
                    <p className="mt-1.5 text-[12px] text-cyan">
                      <span className="text-dim">Ask:</span> “{p.discoveryQuestion}”
                    </p>
                  ) : null}
                  {p.automationDirection ? (
                    <p className="mt-1 text-[12px] text-muted">
                      <span className="text-dim">Automation direction:</span> {p.automationDirection}
                    </p>
                  ) : null}
                  {p.humanJudgementNote ? (
                    <p className="mt-1 text-[12px] text-muted">
                      <span className="text-dim">Human judgement:</span> {p.humanJudgementNote}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {p.status !== "confirmed" ? (
                    <Button size="xs" variant="success" disabled={pending} onClick={() => setStatus(p, "confirmed")}>
                      Confirm
                    </Button>
                  ) : null}
                  {p.status !== "rejected" ? (
                    <Button size="xs" variant="ghost" disabled={pending} onClick={() => setStatus(p, "rejected")}>
                      Reject
                    </Button>
                  ) : (
                    <Button size="xs" variant="ghost" disabled={pending} onClick={() => setStatus(p, "proposed")}>
                      Reopen
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label="Add evidence"
                    onClick={() => {
                      setEvidenceFor(p);
                      setEvidenceText(p.evidence ?? "");
                      setEvidenceUrl(p.evidenceUrl ?? "");
                      setConfirmAfter(false);
                    }}
                  >
                    Evidence
                  </Button>
                  <Button size="xs" variant="ghost" aria-label="Delete hypothesis" disabled={pending} onClick={() => startTransition(async () => { await deletePainAction({ id: p.id, leadId }); router.refresh(); })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Evidence modal */}
      <Modal open={!!evidenceFor} onClose={() => setEvidenceFor(null)} title="Attach evidence">
        <p className="mb-3 text-[12.5px] text-muted">“{evidenceFor?.hypothesis}”</p>
        <Field label="What did you actually observe?" required>
          <Textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} rows={3} placeholder="e.g. Their job ad mentions 'manual weekly reporting across 6 clients'" />
        </Field>
        <Field label="Source URL" hint="Where you saw it — lets you re-verify later." className="mt-3">
          <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setEvidenceFor(null)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={evidenceText.trim().length < 3 || pending}
            onClick={() => {
              const p = evidenceFor!;
              setEvidenceFor(null);
              startTransition(async () => {
                const res = await updatePainAction({
                  id: p.id,
                  leadId,
                  evidence: evidenceText.trim(),
                  evidenceUrl: evidenceUrl.trim(),
                  confidence: "medium",
                  status: confirmAfter ? "confirmed" : undefined,
                });
                if (res.ok) {
                  toast(confirmAfter ? "Evidence attached and hypothesis confirmed." : "Evidence attached.");
                  router.refresh();
                } else toast(res.error, "error");
              });
            }}
          >
            {confirmAfter ? "Attach & confirm" : "Attach evidence"}
          </Button>
        </div>
      </Modal>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add pain hypothesis" wide>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as never })}>
              {PAIN_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PAIN_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Confidence">
              <Select value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value as never })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Impact">
              <Select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value as never })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>
          <Field label="Hypothesis" required className="sm:col-span-2">
            <Textarea value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} rows={2} placeholder="Phrase as a testable guess, not a fact" />
          </Field>
          <Field label="Evidence (if any)">
            <Textarea value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} rows={2} />
          </Field>
          <Field label="Evidence URL">
            <Input value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Discovery question" className="sm:col-span-2">
            <Input value={form.discoveryQuestion} onChange={(e) => setForm({ ...form, discoveryQuestion: e.target.value })} placeholder="The question that would confirm or kill this" />
          </Field>
          <Field label="Automation direction">
            <Input value={form.automationDirection} onChange={(e) => setForm({ ...form, automationDirection: e.target.value })} />
          </Field>
          <Field label="Why human judgement is still needed">
            <Input value={form.humanJudgementNote} onChange={(e) => setForm({ ...form, humanJudgementNote: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={form.hypothesis.trim().length < 5 || pending}
            onClick={() => {
              setAddOpen(false);
              startTransition(async () => {
                const res = await addPainAction({ leadId, ...form, hypothesis: form.hypothesis.trim() });
                if (res.ok) {
                  toast("Hypothesis added.");
                  setForm({ ...form, hypothesis: "", evidence: "", evidenceUrl: "" });
                  router.refresh();
                } else toast(res.error, "error");
              });
            }}
          >
            Add hypothesis
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Signals                                                             */
/* ------------------------------------------------------------------ */

function SignalsPanel({ leadId, signals }: { leadId: string; signals: BuyingSignal[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    signalType: "hiring" as (typeof SIGNAL_TYPES)[number],
    description: "",
    evidenceUrl: "",
    strength: "moderate" as const,
    observedAt: "",
  });

  return (
    <Card>
      <CardHeader
        title="Buying signals & triggers"
        subtitle="Observed events that suggest timing — always with a source."
        actions={
          <Button size="xs" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        }
      />
      {signals.length === 0 ? (
        <EmptyState title="No signals recorded" body="Hiring, launches, funding, growth, platform changes, public complaints about manual work…" className="py-8" />
      ) : (
        <ul className="divide-y divide-line/60">
          {signals.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="cyan">{SIGNAL_TYPE_LABELS[s.signalType]}</Badge>
                  <Badge tone={s.strength === "strong" ? "coral" : s.strength === "moderate" ? "amber" : "grey"}>
                    {s.strength}
                  </Badge>
                  {s.observedAt ? <span className="text-[11px] text-dim">observed {fmtDateTime(s.observedAt).split(",")[0]}</span> : null}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-text">{s.description}</p>
                {s.evidenceUrl ? (
                  <a href={s.evidenceUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-accent-bright hover:underline">
                    Evidence <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <Button size="xs" variant="ghost" aria-label="Delete signal" disabled={pending} onClick={() => startTransition(async () => { await deleteSignalAction({ id: s.id, leadId }); router.refresh(); })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record a buying signal">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Signal type">
            <Select value={form.signalType} onChange={(e) => setForm({ ...form, signalType: e.target.value as never })}>
              {SIGNAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SIGNAL_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Strength">
            <Select value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value as never })}>
              <option value="weak">Weak</option>
              <option value="moderate">Moderate</option>
              <option value="strong">Strong</option>
            </Select>
          </Field>
          <Field label="What did you observe?" required className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </Field>
          <Field label="Evidence URL">
            <Input value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Observed on">
            <Input type="date" value={form.observedAt} onChange={(e) => setForm({ ...form, observedAt: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={form.description.trim().length < 3 || pending}
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                const res = await addSignalAction({ leadId, ...form, description: form.description.trim(), observedAt: form.observedAt || undefined });
                if (res.ok) {
                  toast("Signal recorded.");
                  setForm({ ...form, description: "", evidenceUrl: "", observedAt: "" });
                  router.refresh();
                } else toast(res.error, "error");
              });
            }}
          >
            Record signal
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Research items                                                      */
/* ------------------------------------------------------------------ */

const RESEARCH_KINDS = [
  ["note", "Note"],
  ["company_snapshot", "Company snapshot"],
  ["website", "Website analysis"],
  ["linkedin", "LinkedIn (pasted)"],
  ["news", "News"],
  ["tech_stack", "Tech stack"],
  ["trigger_event", "Trigger event"],
] as const;

function ResearchPanel({ leadId, research }: { leadId: string; research: ResearchItem[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [markBlock, setMarkBlock] = useState<string[] | null>(null);
  const [form, setForm] = useState({
    kind: "note" as (typeof RESEARCH_KINDS)[number][0],
    title: "",
    content: "",
    sourceUrl: "",
    confidence: "medium" as const,
  });

  return (
    <Card>
      <CardHeader
        title="Research"
        subtitle="Only record what you actually found — with sources. Nothing is invented."
        actions={
          <>
            <Button
              size="xs"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await markResearchedAction({ leadId });
                  if (res.ok) {
                    toast("Marked as researched.");
                    router.refresh();
                  } else setMarkBlock(res.missing ?? [res.error]);
                })
              }
            >
              Mark researched
            </Button>
            <Button size="xs" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </>
        }
      />
      {research.length === 0 ? (
        <EmptyState title="No research yet" body="Paste LinkedIn details, website observations, news, or notes. Confidence and sources feed the Data Confidence score." className="py-8" />
      ) : (
        <ul className="divide-y divide-line/60">
          {research.map((r) => (
            <li key={r.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="grey">{RESEARCH_KINDS.find(([k]) => k === r.kind)?.[1] ?? r.kind}</Badge>
                    <ConfidenceTag level={r.confidence} />
                    <span className="text-[11px] text-dim">{fmtDateTime(r.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[13px] font-medium text-text">{r.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed whitespace-pre-wrap text-muted">{r.content}</p>
                  {r.sourceUrl ? (
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent-bright hover:underline">
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                <Button size="xs" variant="ghost" aria-label="Delete research item" disabled={pending} onClick={() => startTransition(async () => { await deleteResearchAction({ id: r.id, leadId }); router.refresh(); })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!markBlock} onClose={() => setMarkBlock(null)} title="Can't mark as researched yet">
        <ul className="list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {(markBlock ?? []).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setMarkBlock(null)}>OK</Button>
        </div>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Add research" wide>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kind">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as never })}>
              {RESEARCH_KINDS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Confidence" hint="How sure are you this is accurate and current?">
            <Select value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value as never })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Title" required className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. About page — sells premium dog food DTC" />
          </Field>
          <Field label="Content" required className="sm:col-span-2">
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} placeholder="Paste or write what you found. For LinkedIn: paste the relevant profile sections." />
          </Field>
          <Field label="Source URL" className="sm:col-span-2">
            <Input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://…" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={form.title.trim().length < 2 || form.content.trim().length < 2 || pending}
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                const res = await addResearchAction({ leadId, kind: form.kind, title: form.title.trim(), content: form.content.trim(), sourceUrl: form.sourceUrl.trim() || null, confidence: form.confidence });
                if (res.ok) {
                  toast("Research saved.");
                  setForm({ ...form, title: "", content: "", sourceUrl: "" });
                  router.refresh();
                } else toast(res.error, "error");
              });
            }}
          >
            Save research
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Company snapshot                                                    */
/* ------------------------------------------------------------------ */

function CompanyPanel({ leadId, company }: { leadId: string; company: Company | null }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: company?.name ?? "",
    website: company?.website ?? "",
    linkedinUrl: company?.linkedinUrl ?? "",
    description: company?.description ?? "",
    industry: company?.industry ?? "",
    subIndustry: company?.subIndustry ?? "",
    employeeRange: company?.employeeRange ?? "",
    revenueRange: company?.revenueRange ?? "",
    ecommercePlatform: company?.ecommercePlatform ?? "",
    shopifyStatus: (company?.shopifyStatus ?? "unknown") as "none" | "shopify" | "shopify_plus" | "unknown",
    businessModel: (company?.businessModel ?? "unknown") as "b2b" | "b2c" | "dtc" | "mixed" | "unknown",
    otherTechnologies: (company?.otherTechnologies ?? []).join(", "),
    salesChannels: (company?.salesChannels ?? []).join(", "),
    markets: (company?.markets ?? []).join(", "),
  });

  const save = () =>
    startTransition(async () => {
      const res = await updateCompanyAction({ leadId, ...form });
      if (res.ok) {
        toast("Company snapshot saved — scores recomputed.");
        router.refresh();
      } else toast(res.error, "error");
    });

  return (
    <Card>
      <CardHeader title="Company snapshot" subtitle="What they sell, to whom, and how complex the operation likely is." />
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
        <Field label="Company name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Website">
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="example.com" />
        </Field>
        <Field label="Company LinkedIn">
          <Input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
        </Field>
        <Field label="Industry">
          <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Ecommerce — pet supplies" />
        </Field>
        <Field label="What they sell & to whom" className="sm:col-span-2">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="One or two honest lines from their site — not marketing fluff" />
        </Field>
        <Field label="Employee range">
          <Select value={form.employeeRange} onChange={(e) => setForm({ ...form, employeeRange: e.target.value })}>
            <option value="">Unknown</option>
            <option value="1">Just them</option>
            <option value="2-10">2–10</option>
            <option value="11-50">11–50</option>
            <option value="51-200">51–200</option>
            <option value="200+">200+</option>
          </Select>
        </Field>
        <Field label="Est. revenue range">
          <Select value={form.revenueRange} onChange={(e) => setForm({ ...form, revenueRange: e.target.value })}>
            <option value="">Unknown</option>
            <option value="<£100k">&lt;£100k</option>
            <option value="£100k-£500k">£100k–£500k</option>
            <option value="£500k-£1m">£500k–£1m</option>
            <option value="£1m-£5m">£1m–£5m</option>
            <option value="£5m+">£5m+</option>
          </Select>
        </Field>
        <Field label="Shopify status">
          <Select value={form.shopifyStatus} onChange={(e) => setForm({ ...form, shopifyStatus: e.target.value as never })}>
            <option value="unknown">Unknown</option>
            <option value="shopify">Shopify</option>
            <option value="shopify_plus">Shopify Plus</option>
            <option value="none">Not Shopify</option>
          </Select>
        </Field>
        <Field label="Ecommerce platform (if not Shopify)">
          <Input value={form.ecommercePlatform} onChange={(e) => setForm({ ...form, ecommercePlatform: e.target.value })} placeholder="WooCommerce, Magento…" />
        </Field>
        <Field label="Business model">
          <Select value={form.businessModel} onChange={(e) => setForm({ ...form, businessModel: e.target.value as never })}>
            <option value="unknown">Unknown</option>
            <option value="dtc">DTC</option>
            <option value="b2c">B2C</option>
            <option value="b2b">B2B</option>
            <option value="mixed">Mixed</option>
          </Select>
        </Field>
        <Field label="Other technologies" hint="Comma-separated">
          <Input value={form.otherTechnologies} onChange={(e) => setForm({ ...form, otherTechnologies: e.target.value })} placeholder="Klaviyo, Gorgias…" />
        </Field>
        <Field label="Sales channels" hint="Comma-separated">
          <Input value={form.salesChannels} onChange={(e) => setForm({ ...form, salesChannels: e.target.value })} placeholder="Own site, Amazon, retail…" />
        </Field>
        <Field label="Markets" hint="Comma-separated">
          <Input value={form.markets} onChange={(e) => setForm({ ...form, markets: e.target.value })} placeholder="UK, EU, US…" />
        </Field>
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button variant="primary" size="sm" disabled={form.name.trim().length < 1 || pending} onClick={save}>
          {pending ? "Saving…" : "Save snapshot"}
        </Button>
      </div>
    </Card>
  );
}
