import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Briefcase } from "lucide-react";
import { getDb } from "@/db";
import { leads, opportunities } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Badge, Card, CardHeader, EmptyState, PageHeader, cn } from "@/components/ui";
import { OPPORTUNITY_STAGES, OPPORTUNITY_STAGE_LABELS, type OpportunityStage } from "@/lib/constants";
import { fmtMoney } from "@/lib/format";
import { OpportunityRow } from "@/components/opportunities/row";

export const metadata = { title: "Opportunities" };

const OPEN_STAGES: OpportunityStage[] = [
  "qualified",
  "case_study_candidate",
  "free_build_proposed",
  "paid_discovery",
  "proposal_drafted",
  "proposal_sent",
  "negotiation",
];

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  await requireUser();
  const { stage } = await searchParams;
  const db = getDb();
  const rows = db
    .select({
      opp: opportunities,
      leadName: leads.fullName,
    })
    .from(opportunities)
    .innerJoin(leads, eq(opportunities.leadId, leads.id))
    .orderBy(desc(opportunities.updatedAt))
    .all();

  const open = rows.filter((r) => OPEN_STAGES.includes(r.opp.stage));
  const won = rows.filter((r) => r.opp.stage === "won");
  const closed = rows.filter((r) => ["lost", "on_hold"].includes(r.opp.stage));
  const weighted = open.reduce((acc, r) => acc + (r.opp.value ?? 0) * (r.opp.probability ?? 0.5), 0);
  const wonValue = won.reduce((acc, r) => acc + (r.opp.value ?? 0), 0);

  const filtered = stage ? rows.filter((r) => r.opp.stage === stage) : null;

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="The commercial pipeline: free case-study builds, paid discovery and paid projects. Stage moves are validated — proposals need completed discovery."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open opportunities", value: String(open.length) },
          { label: "Weighted pipeline", value: fmtMoney(weighted) },
          { label: "Won", value: String(won.length) },
          { label: "Won value", value: fmtMoney(wonValue) },
        ].map((s) => (
          <div key={s.label} className="rounded-(--radius-card) border border-line bg-surface p-4">
            <p className="font-display text-[20px] leading-none font-bold text-text tabular-nums">{s.value}</p>
            <p className="mt-1.5 text-[11.5px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href="/opportunities"
          className={cn(
            "rounded-full border px-3 py-1.5 text-[12px] font-medium",
            !stage ? "border-accent/40 bg-accent-soft text-accent-bright" : "border-line-strong text-muted hover:text-text",
          )}
        >
          All
        </Link>
        {OPPORTUNITY_STAGES.map((s) => (
          <Link
            key={s}
            href={`/opportunities?stage=${s}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-medium",
              stage === s ? "border-accent/40 bg-accent-soft text-accent-bright" : "border-line-strong text-muted hover:text-text",
            )}
          >
            {OPPORTUNITY_STAGE_LABELS[s]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase />}
            title="No opportunities yet"
            body="Opportunities are created from a lead's Opportunity tab, usually off the back of an automation design."
          />
        </Card>
      ) : filtered ? (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState title="None in this stage" className="py-8" />
          ) : (
            <ul className="divide-y divide-line/60">
              {filtered.map((r) => (
                <OpportunityRow key={r.opp.id} opp={r.opp} leadName={r.leadName} />
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <div className="space-y-5">
          {open.length > 0 ? (
            <Card>
              <CardHeader title={`Open (${open.length})`} />
              <ul className="divide-y divide-line/60">
                {open.map((r) => (
                  <OpportunityRow key={r.opp.id} opp={r.opp} leadName={r.leadName} />
                ))}
              </ul>
            </Card>
          ) : null}
          {won.length > 0 ? (
            <Card>
              <CardHeader title={`Won — in delivery (${won.length})`} subtitle="Won opportunities move through delivery stages here." />
              <ul className="divide-y divide-line/60">
                {won.map((r) => (
                  <OpportunityRow key={r.opp.id} opp={r.opp} leadName={r.leadName} showDelivery />
                ))}
              </ul>
            </Card>
          ) : null}
          {closed.length > 0 ? (
            <Card>
              <CardHeader title={`Lost / on hold (${closed.length})`} />
              <ul className="divide-y divide-line/60">
                {closed.map((r) => (
                  <OpportunityRow key={r.opp.id} opp={r.opp} leadName={r.leadName} />
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
      {stage ? null : (
        <p className="mt-4 text-[11.5px] text-dim">
          <Badge tone="grey">Tip</Badge> Case-study candidates come from the Command Centre mission when discovery
          uncovers a strong, evidenced problem.
        </p>
      )}
    </div>
  );
}
