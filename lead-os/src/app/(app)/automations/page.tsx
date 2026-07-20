import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Workflow } from "lucide-react";
import { getDb } from "@/db";
import { automationOpportunities, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { OPPORTUNITY_CATEGORY_LABELS } from "@/lib/constants";
import { fmtRelative } from "@/lib/format";

export const metadata = { title: "Automation designs" };

export default async function AutomationsPage() {
  await requireUser();
  const db = getDb();
  const rows = db
    .select({ design: automationOpportunities, leadName: leads.fullName })
    .from(automationOpportunities)
    .innerJoin(leads, eq(automationOpportunities.leadId, leads.id))
    .orderBy(desc(automationOpportunities.updatedAt))
    .all();

  return (
    <div>
      <PageHeader
        title="Automation designs"
        subtitle="Every designed automation opportunity across all leads — each with its workflow diagram, human checkpoints and full spec on the lead's Opportunity tab."
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Workflow />}
            title="No designs yet"
            body="Designs are generated from a lead's Opportunity tab once discovery has captured the problem properly."
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line/60">
            {rows.map(({ design: d, leadName }) => (
              <li key={d.id}>
                <Link href={`/leads/${d.leadId}?tab=opportunity`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-raised/70">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-text">{d.title}</p>
                    <p className="mt-0.5 text-[12px] text-dim">
                      {leadName} · {OPPORTUNITY_CATEGORY_LABELS[d.category]} · updated {fmtRelative(d.updatedAt)}
                    </p>
                  </div>
                  <Badge tone="grey">Complexity {d.complexity}</Badge>
                  <Badge tone={d.commercialModel === "free_case_study" ? "coral" : d.commercialModel === "undecided" ? "grey" : "green"}>
                    {d.commercialModel.replaceAll("_", " ")}
                  </Badge>
                  <Badge tone={d.status === "accepted" ? "green" : d.status === "declined" ? "red" : "amber"}>{d.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
