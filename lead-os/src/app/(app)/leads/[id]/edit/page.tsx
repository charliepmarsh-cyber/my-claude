import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { LeadForm } from "@/components/leads/lead-form";
import { updateLeadAction } from "@/server/actions/leads";

export const metadata = { title: "Edit lead" };

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const db = getDb();
  const lead = db.select().from(leads).where(and(eq(leads.id, id), isNull(leads.deletedAt))).get();
  if (!lead) notFound();
  const company = lead.companyId ? (db.select().from(companies).where(eq(companies.id, lead.companyId)).get() ?? null) : null;

  const boundAction = updateLeadAction.bind(null, lead.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Edit ${lead.fullName}`} subtitle="Scores and completeness recompute automatically on save." />
      <LeadForm action={boundAction} lead={lead} company={company} submitLabel="Save changes" />
    </div>
  );
}
