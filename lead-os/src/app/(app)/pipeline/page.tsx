import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PipelineBoard } from "@/components/pipeline/board";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  await requireUser();
  const db = getDb();
  const rows = db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      jobTitle: leads.jobTitle,
      companyName: companies.name,
      status: leads.status,
      priorityLabel: leads.priorityLabel,
      overallScore: leads.overallScore,
      warmth: leads.warmth,
      dataSource: leads.dataSource,
      nextActionDue: leads.nextActionDue,
    })
    .from(leads)
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(and(isNull(leads.deletedAt), eq(leads.doNotContact, false)))
    .all();

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="Drag leads between stages. Moves that need missing information are blocked with an explanation — nothing advances on vibes."
      />
      <PipelineBoard leads={rows} />
    </div>
  );
}
