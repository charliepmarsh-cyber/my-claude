"use client";

import { Lightbulb } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card, CardHeader, EmptyState, SectionTitle } from "@/components/ui";
import type { AnalyticsData, RateRow } from "@/server/analytics";
import { fmtMoney } from "@/lib/format";

const AXIS = { fill: "#66738c", fontSize: 10.5 };
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#131d33",
    border: "1px solid rgba(148,163,198,0.26)",
    borderRadius: 8,
    fontSize: 12,
    color: "#e8eef8",
  },
  labelStyle: { color: "#9aa7bd" },
} as const;

function StatGrid({ stats }: { stats: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-(--radius-card) bg-line sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-surface p-4">
          <p className="font-display text-[19px] leading-none font-bold text-text tabular-nums">{s.value}</p>
          <p className="mt-1.5 text-[11px] leading-snug text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function RateTable({ rows, title }: { rows: RateRow[]; title: string }) {
  return (
    <div>
      <SectionTitle className="mb-2">{title}</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-[12px] text-dim">No sent messages yet.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10.5px] tracking-wider text-dim uppercase">
              <th className="py-1 pr-2 font-semibold">Segment</th>
              <th className="w-14 py-1 pr-2 text-right font-semibold">Sent</th>
              <th className="w-16 py-1 pr-2 text-right font-semibold">Replies</th>
              <th className="w-16 py-1 text-right font-semibold">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line/50">
                <td className="max-w-44 truncate py-1.5 pr-2 text-[12px] text-text">
                  {r.label}
                  {r.lowSample ? <span className="ml-1.5 text-[10px] text-warn">low sample</span> : null}
                </td>
                <td className="py-1.5 pr-2 text-right text-[12px] text-muted tabular-nums">{r.sent}</td>
                <td className="py-1.5 pr-2 text-right text-[12px] text-muted tabular-nums">{r.replies}</td>
                <td className="py-1.5 text-right text-[12px] font-semibold text-text tabular-nums">
                  {r.ratePct === null ? "—" : `${r.ratePct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const { outreach, pipeline, quality, learning } = data;
  const hasActivity = outreach.messagesSent > 0 || outreach.leadsContacted > 0;

  return (
    <div className="space-y-5">
      {/* Learning loop */}
      <Card>
        <CardHeader
          title="Learning loop"
          subtitle="Recommendations recomputed from your recorded outcomes. The system suggests — it never silently changes scoring or templates."
        />
        <ul className="space-y-2.5 p-5">
          {learning.insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <p className="text-[13px] leading-relaxed text-text">
                {ins.text}{" "}
                <Badge tone={ins.confidence === "solid" ? "green" : "grey"} className="ml-1 align-middle">
                  {ins.confidence === "solid" ? "solid sample" : "early signal"}
                </Badge>
              </p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Outreach */}
      <Card>
        <CardHeader title="Outreach" />
        <StatGrid
          stats={[
            { label: "Messages sent", value: String(outreach.messagesSent) },
            { label: "Leads contacted", value: String(outreach.leadsContacted) },
            { label: "Reply rate (leads)", value: outreach.replyRatePct === null ? "—" : `${outreach.replyRatePct}%` },
            { label: "Positive reply rate", value: outreach.positiveReplyRatePct === null ? "—" : `${outreach.positiveReplyRatePct}%` },
            { label: "Qualified-problem rate", value: outreach.qualifiedProblemRatePct === null ? "—" : `${outreach.qualifiedProblemRatePct}%` },
            { label: "Meetings booked/held", value: String(outreach.meetingsBooked) },
            { label: "Follow-ups sent", value: String(outreach.followUpPerformance.followUpsSent) },
            { label: "Replies after follow-up", value: String(outreach.followUpPerformance.repliesAfterFollowUp) },
          ]}
        />
      </Card>

      {hasActivity ? (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader title="Activity — last 30 days" subtitle="Messages marked sent and replies recorded per day." />
              <div className="h-56 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={outreach.sentPerDay} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                    <CartesianGrid stroke="rgba(148,163,198,0.09)" vertical={false} />
                    <XAxis dataKey="day" tick={AXIS} interval={6} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="sent" name="Sent" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="replies" name="Replies" stroke="#34d399" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Reply classifications" subtitle="How recorded replies were classified (after any manual corrections)." />
              {outreach.classifications.length === 0 ? (
                <EmptyState title="No replies recorded yet" className="py-10" />
              ) : (
                <div className="h-56 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={outreach.classifications} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 30 }}>
                      <CartesianGrid stroke="rgba(148,163,198,0.09)" horizontal={false} />
                      <XAxis type="number" tick={AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={{ ...AXIS, fontSize: 10 }} width={104} axisLine={false} tickLine={false} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="count" name="Replies" radius={[0, 4, 4, 0]}>
                        {outreach.classifications.map((c, i) => (
                          <Cell key={c.label} fill={["#34d399", "#22d3ee", "#3b82f6", "#a78bfa", "#fbbf24", "#f87171", "#9aa7bd"][i % 7]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Conversion breakdowns" subtitle="Reply rate by segment — segments under 5 leads are flagged as low sample." />
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              <RateTable rows={outreach.byMessageType} title="By message type" />
              <RateTable rows={outreach.byCategory} title="By niche (ICP category)" />
              <RateTable rows={outreach.byWarmth} title="By warmth" />
              <RateTable rows={outreach.byChannel} title="By channel" />
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            title="No outreach activity recorded yet"
            body="Charts unlock as you mark messages sent and record replies — everything is computed from the real activity log."
            className="py-10"
          />
        </Card>
      )}

      {/* Pipeline */}
      <Card>
        <CardHeader title="Pipeline" />
        <StatGrid
          stats={[
            { label: "Opportunities created", value: String(pipeline.opportunitiesCreated) },
            { label: "Case studies agreed", value: String(pipeline.caseStudiesAgreed) },
            { label: "Proposals sent", value: String(pipeline.proposalsSent) },
            { label: "Win rate", value: pipeline.winRatePct === null ? "—" : `${pipeline.winRatePct}%` },
            { label: "Weighted open value", value: fmtMoney(pipeline.estimatedValue) },
            { label: "Won value", value: fmtMoney(pipeline.actualValue) },
            { label: "Avg. time to first reply", value: pipeline.avgHoursToReply === null ? "—" : `${pipeline.avgHoursToReply}h` },
            { label: "Lost", value: String(pipeline.lost) },
          ]}
        />
        {pipeline.lostReasons.length > 0 ? (
          <div className="border-t border-line p-5">
            <SectionTitle className="mb-2">Lost & closed reasons</SectionTitle>
            <ul className="space-y-1">
              {pipeline.lostReasons.map((r) => (
                <li key={r.reason} className="flex items-baseline justify-between gap-4 text-[12.5px]">
                  <span className="text-muted">{r.reason}</span>
                  <span className="font-semibold text-text tabular-nums">{r.count}×</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* Quality */}
      <Card>
        <CardHeader title="Data & AI quality" />
        <StatGrid
          stats={[
            { label: "Avg. record completeness", value: `${quality.avgCompleteness}%` },
            {
              label: "Sent drafts: rules / AI / hand-edited",
              value: `${quality.aiDraftShare.rules} / ${quality.aiDraftShare.ai} / ${quality.aiDraftShare.human}`,
            },
            {
              label: "Sent messages edited by hand",
              value: quality.sentTotal ? `${Math.round((quality.sentEditedByHand / quality.sentTotal) * 100)}%` : "—",
            },
            { label: "Do-not-contact records", value: String(quality.dncCount) },
          ]}
        />
        <p className="border-t border-line px-5 py-3 text-[11.5px] leading-relaxed text-dim">
          A high hand-edited share means generated drafts aren&apos;t landing — worth reviewing the templates. A 0%
          share means you may be sending drafts unread; skim before sending.
        </p>
      </Card>
    </div>
  );
}
