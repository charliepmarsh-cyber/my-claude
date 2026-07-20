"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Badge, Button, DemoBadge, PriorityPill, ScoreChip, Select, StagePill, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { bulkLeadAction } from "@/server/actions/leads";
import type { LeadRow } from "@/server/lead-queries";
import {
  ICP_CATEGORY_LABELS,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_LABEL_TEXT,
  type LeadStage,
  type PriorityLabel,
} from "@/lib/constants";
import { fmtDue, fmtRelative } from "@/lib/format";

function SortHeader({ label, field }: { label: string; field: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const current = searchParams.get("sort") ?? "score";
  const dir = searchParams.get("dir") ?? "desc";
  const active = current === field;

  const toggle = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("sort", field);
    next.set("dir", active && dir === "desc" ? "asc" : "desc");
    router.replace(`/leads?${next.toString()}`, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold tracking-wider uppercase",
        active ? "text-accent-bright" : "text-dim hover:text-muted",
      )}
    >
      {label}
      {active ? (dir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />) : null}
    </button>
  );
}

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [skippedInfo, setSkippedInfo] = useState<Array<{ leadId: string; missing: string[] }> | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const runBulk = (input: { action: "stage" | "priority" | "delete"; stage?: LeadStage; priority?: PriorityLabel }) => {
    startTransition(async () => {
      const res = await bulkLeadAction({
        leadIds: [...selected],
        action: input.action,
        stage: input.stage,
        priority: input.priority,
        reason: input.action === "priority" ? "Bulk update from the lead list" : undefined,
      });
      if (res.ok) {
        const skipped = res.skipped ?? [];
        if (skipped.length > 0) {
          setSkippedInfo(skipped);
          toast(`${res.applied ?? 0} updated, ${skipped.length} skipped (missing requirements).`, "warn");
        } else {
          toast(`${res.applied ?? 0} lead${(res.applied ?? 0) === 1 ? "" : "s"} updated.`);
        }
        setSelected(new Set());
        router.refresh();
      } else {
        toast(res.error, "error");
      }
    });
  };

  const nameById = useMemo(() => new Map(rows.map((r) => [r.id, r.fullName])), [rows]);

  return (
    <div>
      {someSelected ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-(--radius-control) border border-accent/35 bg-accent-soft px-3 py-2">
          <span className="text-[12.5px] font-medium text-accent-bright">{selected.size} selected</span>
          <Select
            aria-label="Bulk: set stage"
            className="h-7.5 w-auto px-2 pr-7 text-[12px]"
            value=""
            disabled={pending}
            onChange={(e) => {
              if (e.target.value) runBulk({ action: "stage", stage: e.target.value as LeadStage });
              e.target.value = "";
            }}
          >
            <option value="">Set stage…</option>
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Bulk: set priority"
            className="h-7.5 w-auto px-2 pr-7 text-[12px]"
            value=""
            disabled={pending}
            onChange={(e) => {
              if (e.target.value) runBulk({ action: "priority", priority: e.target.value as PriorityLabel });
              e.target.value = "";
            }}
          >
            <option value="">Set priority…</option>
            {PRIORITY_LABELS.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL_TEXT[p]}
              </option>
            ))}
          </Select>
          <Button variant="danger" size="xs" disabled={pending} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-(--radius-card) border border-line bg-surface">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all leads on this page"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-[#2563eb]"
                />
              </th>
              <th className="px-3 py-2.5">
                <SortHeader label="Lead" field="name" />
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold tracking-wider text-dim uppercase">Category</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold tracking-wider text-dim uppercase">Stage</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold tracking-wider text-dim uppercase">Priority</th>
              <th className="px-3 py-2.5">
                <SortHeader label="Score" field="score" />
              </th>
              <th className="px-3 py-2.5">
                <SortHeader label="Data" field="completeness" />
              </th>
              <th className="px-3 py-2.5">
                <SortHeader label="Next action" field="due" />
              </th>
              <th className="px-3 py-2.5">
                <SortHeader label="Updated" field="updated" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const due = fmtDue(r.nextActionDue);
              return (
                <tr
                  key={r.id}
                  className={cn("border-b border-line/60 transition-colors last:border-0 hover:bg-raised/70", r.doNotContact && "opacity-55")}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.fullName}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      className="h-3.5 w-3.5 accent-[#2563eb]"
                    />
                  </td>
                  <td className="max-w-64 px-3 py-2.5">
                    <Link href={`/leads/${r.id}`} className="group block">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-text group-hover:text-accent-bright">
                          {r.fullName}
                        </span>
                        {r.dataSource === "demo" ? <DemoBadge /> : null}
                        {r.doNotContact ? <Badge tone="red">DNC</Badge> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-dim">
                        {[r.jobTitle, r.companyName].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] text-muted">
                      {r.icpCategory ? ICP_CATEGORY_LABELS[r.icpCategory] : "—"}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-dim capitalize">{r.warmth}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StagePill stage={r.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <PriorityPill priority={r.priorityLabel} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreChip value={r.overallScore} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] text-muted tabular-nums">{r.completeness}%</span>
                  </td>
                  <td className="max-w-44 px-3 py-2.5">
                    {r.nextAction ? (
                      <>
                        <span className="block truncate text-[12px] text-muted">{r.nextAction}</span>
                        <span className={cn("text-[11px]", due.overdue ? "font-medium text-danger" : "text-dim")}>
                          {due.text}
                          {due.overdue ? " · overdue" : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-[12px] text-dim">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px] whitespace-nowrap text-dim">{fmtRelative(r.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete ${selected.size} lead${selected.size === 1 ? "" : "s"}?`}>
        <p className="text-[13px] leading-relaxed text-muted">
          This is a soft delete — records are hidden everywhere but kept in the database for audit. You can restore them
          by asking for help in a future session, but there is no undo button yet.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              setConfirmDelete(false);
              runBulk({ action: "delete" });
            }}
          >
            Delete {selected.size}
          </Button>
        </div>
      </Modal>

      <Modal open={!!skippedInfo} onClose={() => setSkippedInfo(null)} title="Some leads were skipped">
        <p className="text-[13px] text-muted">These leads are missing requirements for that stage:</p>
        <ul className="mt-3 space-y-2">
          {(skippedInfo ?? []).map((s) => (
            <li key={s.leadId} className="rounded-(--radius-control) border border-warn/30 bg-warn-soft px-3 py-2">
              <Link href={`/leads/${s.leadId}`} className="text-[13px] font-medium text-text hover:text-accent-bright">
                {nameById.get(s.leadId) ?? s.leadId}
              </Link>
              <ul className="mt-1 list-inside list-disc text-[12px] text-muted">
                {s.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setSkippedInfo(null)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
