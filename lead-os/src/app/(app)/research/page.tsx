import Link from "next/link";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { ArrowRight, Microscope } from "lucide-react";
import { getDb } from "@/db";
import { companies, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Badge, Card, DemoBadge, EmptyState, PageHeader, ProgressBar, ScoreChip } from "@/components/ui";
import { ICP_CATEGORY_LABELS } from "@/lib/constants";
import { fmtRelative } from "@/lib/format";

export const metadata = { title: "Research queue" };

export default async function ResearchPage() {
  await requireUser();
  const db = getDb();
  const queue = db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      jobTitle: leads.jobTitle,
      companyName: companies.name,
      icpCategory: leads.icpCategory,
      warmth: leads.warmth,
      completeness: leads.completeness,
      overallScore: leads.overallScore,
      dataSource: leads.dataSource,
      updatedAt: leads.updatedAt,
      status: leads.status,
    })
    .from(leads)
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(and(isNull(leads.deletedAt), eq(leads.doNotContact, false), inArray(leads.status, ["imported", "needs_research"])))
    .orderBy(desc(leads.overallScore), desc(leads.updatedAt))
    .all();

  return (
    <div>
      <PageHeader
        title="Research queue"
        subtitle={`${queue.length} lead${queue.length === 1 ? "" : "s"} waiting for research, highest current score first. Open one, fill the Intelligence tab, then mark it researched.`}
      />
      {queue.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Microscope />}
            title="Queue is clear"
            body="Every lead has been through research. Imported leads land here automatically."
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line/60">
            {queue.map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}?tab=intelligence`} className="group flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-raised/70">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-text group-hover:text-accent-bright">
                      {l.fullName}
                      {l.dataSource === "demo" ? <DemoBadge /> : null}
                    </p>
                    <p className="mt-0.5 text-[12px] text-dim">
                      {[l.jobTitle, l.companyName].filter(Boolean).join(" · ") || "Role unknown"}
                      {" · "}
                      {l.icpCategory ? ICP_CATEGORY_LABELS[l.icpCategory] : "uncategorised"}
                    </p>
                  </div>
                  <Badge tone={l.warmth === "warm" ? "green" : "grey"} className="capitalize">
                    {l.warmth}
                  </Badge>
                  <div className="w-32">
                    <p className="mb-1 text-[10.5px] text-dim">Data {l.completeness}%</p>
                    <ProgressBar value={l.completeness} max={100} tone={l.completeness >= 60 ? "green" : "amber"} />
                  </div>
                  <ScoreChip value={l.overallScore} />
                  <span className="text-[11px] text-dim">{fmtRelative(l.updatedAt)}</span>
                  <ArrowRight className="h-4 w-4 text-dim group-hover:text-accent-bright" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
