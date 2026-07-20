import Link from "next/link";
import {
  ArrowRight,
  MessageCircleReply,
  Clock,
  AlertTriangle,
  Sparkles,
  Microscope,
  MessagesSquare,
  BookMarked,
  Briefcase,
  Trophy,
  XCircle,
  Target,
} from "lucide-react";
import { Card, CardHeader, PageHeader, ProgressBar, SectionTitle, cn } from "@/components/ui";
import { fmtMoney, fmtRelative } from "@/lib/format";
import { getDashboardData, type MissionItem } from "@/server/dashboard";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Command Centre" };

const missionIcons: Record<MissionItem["kind"], React.ReactNode> = {
  respond: <MessageCircleReply className="h-4 w-4 text-success" />,
  contact: <Target className="h-4 w-4 text-accent-bright" />,
  research: <Microscope className="h-4 w-4 text-cyan" />,
  follow_up: <Clock className="h-4 w-4 text-warn" />,
  discovery: <MessagesSquare className="h-4 w-4 text-violet-300" />,
  case_study: <BookMarked className="h-4 w-4 text-coral" />,
};

export default async function CommandCentrePage() {
  const user = await requireUser();
  const data = getDashboardData();
  const firstName = user.name.split(" ")[0];
  const c = data.counts;

  const actionTiles = [
    {
      label: "Replies awaiting response",
      value: c.repliesAwaiting,
      href: "/conversations",
      icon: <MessageCircleReply className="h-4 w-4" />,
      urgent: c.repliesAwaiting > 0,
    },
    {
      label: "Follow-ups due today",
      value: c.followUpsDueToday,
      href: "/tasks?filter=due",
      icon: <Clock className="h-4 w-4" />,
      urgent: false,
    },
    {
      label: "Overdue follow-ups",
      value: c.followUpsOverdue,
      href: "/tasks?filter=overdue",
      icon: <AlertTriangle className="h-4 w-4" />,
      urgent: c.followUpsOverdue > 0,
    },
    {
      label: "High-fit untouched leads",
      value: c.highFitUntouched,
      href: "/leads?sort=score&touched=never",
      icon: <Sparkles className="h-4 w-4" />,
      urgent: false,
    },
    {
      label: "Leads needing research",
      value: c.needsResearch,
      href: "/research",
      icon: <Microscope className="h-4 w-4" />,
      urgent: false,
    },
    {
      label: "Active discovery conversations",
      value: c.activeDiscovery,
      href: "/conversations",
      icon: <MessagesSquare className="h-4 w-4" />,
      urgent: false,
    },
    {
      label: "Case-study opportunities",
      value: c.caseStudyCandidates,
      href: "/opportunities?stage=case_study_candidate",
      icon: <BookMarked className="h-4 w-4" />,
      urgent: false,
    },
    {
      label: "Qualified opportunities",
      value: c.qualifiedOpps,
      href: "/opportunities",
      icon: <Briefcase className="h-4 w-4" />,
      urgent: false,
    },
  ];

  const todayStats = [
    { label: "Outreach sent today", value: String(data.today.outreachSent) },
    { label: "Replies received today", value: String(data.today.repliesReceived) },
    {
      label: "Positive reply rate",
      value: data.today.positiveReplyRatePct === null ? "—" : `${data.today.positiveReplyRatePct}%`,
    },
    { label: "Meetings booked", value: String(data.today.meetingsBooked) },
    { label: "Proposals sent", value: String(data.today.proposalsSent) },
    { label: "Case studies agreed", value: String(data.today.caseStudiesAgreed) },
    { label: "Paid opportunities", value: String(data.today.paidOppsCreated) },
    { label: "Est. pipeline value", value: fmtMoney(data.today.pipelineValue) },
  ];

  const progressRows: Array<{ label: string; value: number; target: number; tone: "blue" | "green" | "cyan" | "amber" }> = [
    { label: "Warm-list target", ...data.progress.warmList, tone: "blue" },
    { label: "Outreach today", ...data.progress.outreachToday, tone: "cyan" },
    { label: "Replies this week", ...data.progress.repliesThisWeek, tone: "green" },
    { label: "Discovery conversations", ...data.progress.discoveryConversations, tone: "blue" },
    { label: "Case studies", ...data.progress.caseStudies, tone: "amber" },
    { label: "Paid clients", ...data.progress.paidClients, tone: "green" },
  ];

  return (
    <div>
      <PageHeader
        title={`Morning, ${firstName}.`}
        subtitle="Here is what deserves your attention. Work the mission top to bottom — it is built from live data, not habit."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Today's Mission */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Today's Mission"
            subtitle="A realistic plan generated from your live pipeline. Every item links to the work."
          />
          <div className="p-3">
            {data.mission.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="font-display text-[14px] font-semibold text-text">Nothing urgent on the board.</p>
                <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] text-muted">
                  Import your warm list or add leads to give the mission engine something to plan with.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link href="/imports/new" className="text-[13px] font-medium text-accent-bright hover:underline">
                    Import warm list →
                  </Link>
                  <Link href="/leads/new" className="text-[13px] font-medium text-accent-bright hover:underline">
                    Add a lead →
                  </Link>
                </div>
              </div>
            ) : (
              <ol className="space-y-1.5">
                {data.mission.map((item, i) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3.5 rounded-(--radius-control) border border-transparent px-3.5 py-3 transition-colors hover:border-line-strong hover:bg-raised"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line-strong bg-overlay font-display text-[12px] font-bold text-muted">
                        {i + 1}
                      </span>
                      <span className="shrink-0">{missionIcons[item.kind]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium text-text">{item.label}</span>
                        <span className="mt-0.5 block text-[12px] text-muted">{item.detail}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-accent-bright" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader title="Progress" subtitle="Against your configured targets." />
          <div className="space-y-4 p-5">
            {progressRows.map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[12.5px] text-muted">{row.label}</span>
                  <span className="font-display text-[12.5px] font-semibold text-text tabular-nums">
                    {row.value}
                    <span className="text-dim"> / {row.target}</span>
                  </span>
                </div>
                <ProgressBar value={row.value} max={row.target} tone={row.tone} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Needs attention */}
      <SectionTitle className="mt-8 mb-3">Needs attention</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {actionTiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={cn(
              "group rounded-(--radius-card) border bg-surface p-4 transition-colors hover:bg-raised",
              tile.urgent ? "border-coral/40" : "border-line",
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn(tile.urgent ? "text-coral" : "text-dim")}>{tile.icon}</span>
              <ArrowRight className="h-3.5 w-3.5 text-dim opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-3 font-display text-[24px] leading-none font-bold text-text tabular-nums">{tile.value}</p>
            <p className="mt-1.5 text-[11.5px] leading-snug text-muted">{tile.label}</p>
          </Link>
        ))}
      </div>

      {/* Today + outcomes */}
      <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Today at a glance" subtitle="Live counts from recorded activity — nothing simulated." />
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-(--radius-card) bg-line sm:grid-cols-4">
            {todayStats.map((s) => (
              <div key={s.label} className="bg-surface p-4">
                <p className="font-display text-[18px] leading-none font-bold text-text tabular-nums">{s.value}</p>
                <p className="mt-1.5 text-[11px] leading-snug text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent outcomes" subtitle="Latest won and lost opportunities." />
          <div className="p-3">
            {data.recentOutcomes.length === 0 ? (
              <p className="px-3 py-8 text-center text-[12.5px] text-dim">
                No closed opportunities yet. Outcomes will appear here as you win or lose deals.
              </p>
            ) : (
              <ul className="space-y-1">
                {data.recentOutcomes.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/leads/${o.leadId}?tab=opportunity`}
                      className="flex items-center gap-2.5 rounded-(--radius-control) px-3 py-2.5 hover:bg-raised"
                    >
                      {o.stage === "won" ? (
                        <Trophy className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-danger" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px] text-text">{o.title}</span>
                      <span className="shrink-0 text-[11px] text-dim">{fmtRelative(o.when)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
