"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DemoBadge, ScoreChip, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { LEAD_STAGES, LEAD_STAGE_LABELS, type LeadStage, type PriorityLabel, type Warmth } from "@/lib/constants";
import { moveStageAction } from "@/server/actions/leads";
import { fmtDue } from "@/lib/format";

type BoardLead = {
  id: string;
  fullName: string;
  jobTitle: string | null;
  companyName: string | null;
  status: LeadStage;
  priorityLabel: PriorityLabel | null;
  overallScore: number | null;
  warmth: Warmth;
  dataSource: string;
  nextActionDue: Date | null;
};

export function PipelineBoard({ leads }: { leads: BoardLead[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);
  const [blocked, setBlocked] = useState<{ name: string; stage: LeadStage; missing: string[] } | null>(null);
  // Optimistic column assignment so drops feel instant.
  const [optimistic, setOptimistic] = useState<Record<string, LeadStage>>({});

  const byStage = useMemo(() => {
    const map = new Map<LeadStage, BoardLead[]>();
    for (const s of LEAD_STAGES) map.set(s, []);
    for (const l of leads) {
      const stage = optimistic[l.id] ?? l.status;
      map.get(stage)?.push(l);
    }
    for (const s of LEAD_STAGES) {
      map.get(s)!.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));
    }
    return map;
  }, [leads, optimistic]);

  const onDrop = (stage: LeadStage) => {
    setOverStage(null);
    if (!dragId) return;
    const lead = leads.find((l) => l.id === dragId);
    setDragId(null);
    if (!lead || (optimistic[lead.id] ?? lead.status) === stage) return;

    setOptimistic((o) => ({ ...o, [lead.id]: stage }));
    startTransition(async () => {
      const res = await moveStageAction({ leadId: lead.id, stage });
      if (res.ok) {
        toast(`${lead.fullName} → ${LEAD_STAGE_LABELS[stage]}.`);
        router.refresh();
      } else {
        setOptimistic((o) => {
          const next = { ...o };
          delete next[lead.id];
          return next;
        });
        if (res.missing?.length) {
          setBlocked({ name: lead.fullName, stage, missing: res.missing });
        } else {
          toast(res.error, "error");
        }
      }
    });
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-3">
        {LEAD_STAGES.map((stage) => {
          const items = byStage.get(stage) ?? [];
          return (
            <section
              key={stage}
              aria-label={`${LEAD_STAGE_LABELS[stage]} column`}
              className={cn(
                "w-64 shrink-0 rounded-(--radius-card) border bg-surface/70 transition-colors",
                overStage === stage ? "border-accent/60 bg-accent-soft" : "border-line",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => onDrop(stage)}
            >
              <header className="flex items-center justify-between border-b border-line px-3 py-2.5">
                <h2 className="text-[11.5px] font-semibold tracking-wider text-muted uppercase">{LEAD_STAGE_LABELS[stage]}</h2>
                <span className="rounded-full bg-raised px-1.5 py-0.5 text-[10.5px] font-semibold text-dim tabular-nums">
                  {items.length}
                </span>
              </header>
              <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto p-2">
                {items.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[11px] text-dim">Drop leads here</p>
                ) : (
                  items.map((l) => {
                    const due = fmtDue(l.nextActionDue);
                    return (
                      <article
                        key={l.id}
                        draggable
                        onDragStart={() => setDragId(l.id)}
                        onDragEnd={() => setDragId(null)}
                        className={cn(
                          "cursor-grab rounded-(--radius-control) border border-line-strong bg-raised p-2.5 active:cursor-grabbing",
                          dragId === l.id && "opacity-40",
                          pending && "pointer-events-none",
                        )}
                      >
                        <Link href={`/leads/${l.id}`} className="block" draggable={false}>
                          <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-text hover:text-accent-bright">
                            <span className="truncate">{l.fullName}</span>
                            {l.dataSource === "demo" ? <DemoBadge /> : null}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-dim">
                            {[l.jobTitle, l.companyName].filter(Boolean).join(" · ") || "—"}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <ScoreChip value={l.overallScore} />
                            <span className="text-[10.5px] text-dim capitalize">{l.warmth}</span>
                            {l.nextActionDue ? (
                              <span className={cn("ml-auto text-[10.5px]", due.overdue ? "font-medium text-danger" : "text-dim")}>
                                {due.text}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Modal open={!!blocked} onClose={() => setBlocked(null)} title="Move blocked — information missing">
        <p className="text-[13px] text-muted">
          <strong className="text-text">{blocked?.name}</strong> can&apos;t move to{" "}
          <strong className="text-text">{blocked ? LEAD_STAGE_LABELS[blocked.stage] : ""}</strong> yet:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {blocked?.missing.map((m) => <li key={m}>{m}</li>)}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setBlocked(null)}>Understood</Button>
        </div>
      </Modal>
    </div>
  );
}
