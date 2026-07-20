import Link from "next/link";
import { ArrowRight, CheckSquare } from "lucide-react";
import type { LeadDetail } from "@/server/lead-detail";
import { Card, CardHeader, KV, ProgressBar, ScoreChip, SectionTitle } from "@/components/ui";
import { fmtDate, fmtDue, fmtRelative } from "@/lib/format";
import {
  CHANNEL_LABELS,
  SCORE_DIMENSIONS,
  SCORE_DIMENSION_LABELS,
  SENIORITY_LABELS,
  TASK_KIND_LABELS,
} from "@/lib/constants";
import type { ScoreBreakdownLine } from "@/db/schema";

export function OverviewTab({ detail }: { detail: LeadDetail }) {
  const { lead, company, scores, tasks } = detail;
  const byDim = new Map(scores.map((s) => [s.dimension, s]));
  const openTasks = tasks.filter((t) => t.status === "open");

  const missingLines: ScoreBreakdownLine[] = [];
  for (const dim of SCORE_DIMENSIONS) {
    const s = byDim.get(dim);
    for (const line of s?.breakdown ?? []) {
      if (line.missing) missingLines.push(line);
    }
  }
  const topMissing = missingLines.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <Card>
          <CardHeader title="About" />
          <div className="grid grid-cols-1 gap-x-8 px-5 py-3 sm:grid-cols-2">
            <div className="divide-y divide-line/60">
              <KV label="Job title">{lead.jobTitle ?? "—"}</KV>
              <KV label="Seniority">{SENIORITY_LABELS[lead.seniority ?? "unknown"]}</KV>
              <KV label="Decision authority">
                {lead.decisionAuthority === "decision_maker"
                  ? "Decision maker"
                  : lead.decisionAuthority === "influencer"
                    ? "Influencer"
                    : lead.decisionAuthority === "user"
                      ? "End user"
                      : "Unknown"}
              </KV>
              <KV label="Founder">{lead.isFounder ? "Yes" : "No"}</KV>
              <KV label="Department">{lead.department ?? "—"}</KV>
              <KV label="Preferred channel">{CHANNEL_LABELS[lead.channel ?? "linkedin"]}</KV>
              <KV label="Phone">{lead.phone ?? "—"}</KV>
              <KV label="Time zone">{lead.timezone ?? "—"}</KV>
            </div>
            <div className="divide-y divide-line/60">
              <KV label="Company">{company?.name ?? "—"}</KV>
              <KV label="Website">
                {company?.website ? (
                  <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-accent-bright hover:underline">
                    {company.website}
                  </a>
                ) : (
                  "—"
                )}
              </KV>
              <KV label="Industry">{company?.industry ?? "—"}</KV>
              <KV label="Employees">{company?.employeeRange ?? "—"}</KV>
              <KV label="Platform">
                {company?.shopifyStatus === "shopify_plus"
                  ? "Shopify Plus"
                  : company?.shopifyStatus === "shopify"
                    ? "Shopify"
                    : (company?.ecommercePlatform ?? "Unknown")}
              </KV>
              <KV label="Business model">{company?.businessModel?.toUpperCase() ?? "—"}</KV>
              <KV label="Previous roles">{lead.previousRoles ?? "—"}</KV>
              <KV label="Current tools">{(lead.currentTools ?? []).join(", ") || "—"}</KV>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Relationship" />
          <div className="grid grid-cols-1 gap-x-8 px-5 py-3 sm:grid-cols-2">
            <div className="divide-y divide-line/60">
              <KV label="Warmth">
                <span className="capitalize">{lead.warmth}</span>
              </KV>
              <KV label="Connection degree">{lead.connectionDegree ?? "unknown"}</KV>
              <KV label="How you know them">{lead.howKnown ?? "—"}</KV>
              <KV label="Relationship strength">{lead.relationshipStrength ? `${lead.relationshipStrength}/5` : "—"}</KV>
              <KV label="Source">{lead.source ?? "—"}</KV>
            </div>
            <div className="divide-y divide-line/60">
              <KV label="Referrer">{lead.referrer ?? "—"}</KV>
              <KV label="Shared connections">{lead.sharedConnections ?? "—"}</KV>
              <KV label="Shared groups">{lead.sharedGroups ?? "—"}</KV>
              <KV label="Last interaction">{lead.lastInteractionAt ? fmtRelative(lead.lastInteractionAt) : "—"}</KV>
              <KV label="Interactions recorded">{lead.interactionCount}</KV>
            </div>
          </div>
        </Card>

        {lead.notes || lead.recommendedAngle ? (
          <Card>
            <CardHeader title="Notes & angle" />
            <div className="space-y-3 p-5">
              {lead.recommendedAngle ? (
                <div>
                  <SectionTitle>Recommended angle</SectionTitle>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text">{lead.recommendedAngle}</p>
                </div>
              ) : null}
              {lead.notes ? (
                <div>
                  <SectionTitle>Notes</SectionTitle>
                  <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{lead.notes}</p>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Scores"
            actions={
              <Link href={`/leads/${lead.id}?tab=intelligence`} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-bright hover:underline">
                Full breakdown <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] text-muted">Overall priority</span>
              <ScoreChip value={lead.overallScore} />
            </div>
            <div className="space-y-2.5">
              {SCORE_DIMENSIONS.map((dim) => {
                const s = byDim.get(dim);
                return (
                  <div key={dim} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-[11.5px] text-dim">{SCORE_DIMENSION_LABELS[dim]}</span>
                    <ProgressBar value={s?.value ?? 0} max={100} tone={(s?.value ?? 0) >= 60 ? "green" : (s?.value ?? 0) >= 35 ? "cyan" : "amber"} className="flex-1" />
                    <span className="w-7 shrink-0 text-right text-[11.5px] font-semibold text-muted tabular-nums">{s?.value ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Next actions" />
          <div className="p-4">
            {lead.nextAction ? (
              <div className="mb-3 rounded-(--radius-control) border border-accent/30 bg-accent-soft px-3.5 py-3">
                <p className="text-[13px] font-medium text-text">{lead.nextAction}</p>
                {lead.nextActionDue ? (
                  <p className={`mt-0.5 text-[12px] ${fmtDue(lead.nextActionDue).overdue ? "text-danger" : "text-muted"}`}>
                    Due {fmtDue(lead.nextActionDue).text}
                  </p>
                ) : null}
              </div>
            ) : null}
            {openTasks.length === 0 && !lead.nextAction ? (
              <p className="px-1 py-4 text-center text-[12.5px] text-dim">
                No open tasks. Generate outreach or schedule a follow-up from the Outreach tab.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {openTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 rounded-(--radius-control) px-2 py-1.5">
                    <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dim" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-text">{t.title}</p>
                      <p className="text-[11px] text-dim">
                        {TASK_KIND_LABELS[t.kind]}
                        {t.dueAt ? ` · due ${fmtDue(t.dueAt).text}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Data quality" />
          <div className="p-5">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[12.5px] text-muted">Record completeness</span>
              <span className="font-display text-[13px] font-semibold text-text">{lead.completeness}%</span>
            </div>
            <ProgressBar value={lead.completeness} max={100} tone={lead.completeness >= 70 ? "green" : "amber"} />
            {topMissing.length > 0 ? (
              <>
                <SectionTitle className="mt-4 mb-2">What would improve this record</SectionTitle>
                <ul className="space-y-1.5">
                  {topMissing.map((m, i) => (
                    <li key={i} className="text-[12px] leading-snug text-muted">
                      • {m.missing}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="System" />
          <div className="divide-y divide-line/60 px-5 py-2">
            <KV label="Created">{fmtDate(lead.createdAt)}</KV>
            <KV label="Updated">{fmtRelative(lead.updatedAt)}</KV>
            <KV label="Data source">
              <span className="capitalize">{lead.dataSource}</span>
            </KV>
            <KV label="Duplicate of">
              {lead.duplicateOfId ? (
                <Link href={`/leads/${lead.duplicateOfId}`} className="text-accent-bright hover:underline">
                  View possible original
                </Link>
              ) : (
                "No duplicates flagged"
              )}
            </KV>
            <KV label="Record ID">
              <span className="font-mono text-[11px] text-dim">{lead.id}</span>
            </KV>
          </div>
        </Card>
      </div>
    </div>
  );
}
