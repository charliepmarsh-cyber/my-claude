import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { loadLeadDetail } from "@/server/lead-detail";
import { getSuggestedPriority } from "@/server/lead-service";
import { Avatar, Badge, DemoBadge, PriorityPill, ScoreChip, StagePill, cn } from "@/components/ui";
import { LeadActions } from "@/components/leads/lead-actions";
import { OverviewTab } from "@/components/leads/tabs/overview-tab";
import { ActivityTab } from "@/components/leads/tabs/activity-tab";
import { IntelligenceTab } from "@/components/leads/tabs/intelligence-tab";
import { OutreachTab } from "@/components/leads/tabs/outreach-tab";
import { ConversationTab } from "@/components/leads/tabs/conversation-tab";
import { DiscoveryTab } from "@/components/leads/tabs/discovery-tab";
import { OpportunityTab } from "@/components/leads/tabs/opportunity-tab";
import { ICP_CATEGORY_LABELS } from "@/lib/constants";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "intelligence", label: "Intelligence" },
  { key: "outreach", label: "Outreach" },
  { key: "conversation", label: "Conversation" },
  { key: "discovery", label: "Discovery" },
  { key: "opportunity", label: "Opportunity" },
  { key: "activity", label: "Activity" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = loadLeadDetail(id);
  return { title: detail?.lead.fullName ?? "Lead" };
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const detail = loadLeadDetail(id);
  if (!detail) notFound();

  const tab: TabKey = (TABS.find((t) => t.key === tabParam)?.key ?? "overview") as TabKey;
  const { lead, company } = detail;
  const suggested = getSuggestedPriority(id);

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <Avatar name={lead.fullName} className="mt-0.5 h-11 w-11 text-[14px]" />
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-[20px] font-bold tracking-tight text-text">
              {lead.fullName}
              {lead.pronouns ? <span className="text-[12px] font-normal text-dim">({lead.pronouns})</span> : null}
              {lead.dataSource === "demo" ? <DemoBadge /> : null}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {[lead.jobTitle, company?.name].filter(Boolean).join(" · ") || "Role not recorded"}
              {lead.location ? <span className="text-dim"> · {lead.location}</span> : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StagePill stage={lead.status} />
              <PriorityPill priority={lead.priorityLabel} />
              <ScoreChip value={lead.overallScore} label="Score" />
              <Badge tone={lead.warmth === "warm" ? "green" : "grey"} className="capitalize">
                {lead.warmth}
              </Badge>
              {lead.icpCategory ? <Badge tone="blue">{ICP_CATEGORY_LABELS[lead.icpCategory]}</Badge> : null}
              {lead.doNotContact ? <Badge tone="red">Do not contact</Badge> : null}
              {lead.linkedinUrl ? (
                <a
                  href={lead.linkedinUrl.startsWith("http") ? lead.linkedinUrl : `https://${lead.linkedinUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-accent-bright hover:underline"
                >
                  LinkedIn <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
              {lead.workEmail ? (
                <span className="inline-flex items-center gap-1 text-[11.5px] text-muted">
                  <Mail className="h-3 w-3" /> {lead.workEmail}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <LeadActions
          leadId={lead.id}
          status={lead.status}
          priority={lead.priorityLabel}
          doNotContact={lead.doNotContact}
          suggestedPriority={suggested}
        />
      </div>

      {lead.doNotContact ? (
        <div className="mb-5 rounded-(--radius-control) border border-danger/35 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          Outreach is blocked for this lead{lead.suppressionReason ? `: ${lead.suppressionReason}` : "."} Open tasks were
          cancelled when this was set.
        </div>
      ) : null}

      {/* Tabs */}
      <nav aria-label="Lead sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/leads/${lead.id}?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              tab === t.key
                ? "border-accent-bright text-text"
                : "border-transparent text-muted hover:border-line-strong hover:text-text",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? <OverviewTab detail={detail} /> : null}
      {tab === "intelligence" ? <IntelligenceTab detail={detail} /> : null}
      {tab === "outreach" ? <OutreachTab detail={detail} /> : null}
      {tab === "conversation" ? <ConversationTab detail={detail} /> : null}
      {tab === "discovery" ? <DiscoveryTab detail={detail} /> : null}
      {tab === "opportunity" ? <OpportunityTab detail={detail} /> : null}
      {tab === "activity" ? <ActivityTab detail={detail} /> : null}
    </div>
  );
}
