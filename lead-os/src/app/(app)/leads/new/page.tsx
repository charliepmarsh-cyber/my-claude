import { PageHeader } from "@/components/ui";
import { LeadForm } from "@/components/leads/lead-form";
import { createLeadAction } from "@/server/actions/leads";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Add lead" };

export default async function NewLeadPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Add a lead"
        subtitle="Only the name is required — everything else can be filled in during research. Duplicates are checked on save."
      />
      <LeadForm action={createLeadAction} submitLabel="Create lead" />
    </div>
  );
}
