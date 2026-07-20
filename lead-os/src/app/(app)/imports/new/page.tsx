import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ImportWizard } from "@/components/imports/import-wizard";

export const metadata = { title: "Import warm list" };

export default async function NewImportPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Import your warm list"
        subtitle="Four steps: upload the CSV, check the column mapping, review duplicates, run it. Originals are preserved and the whole import can be undone."
      />
      <ImportWizard />
    </div>
  );
}
