import Link from "next/link";
import { desc } from "drizzle-orm";
import { Upload } from "lucide-react";
import { getDb } from "@/db";
import { imports } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { UndoImportButton } from "@/components/imports/undo-button";

export const metadata = { title: "Imports" };

export default async function ImportsPage() {
  await requireUser();
  const db = getDb();
  const rows = db.select().from(imports).orderBy(desc(imports.createdAt)).all();

  return (
    <div>
      <PageHeader
        title="Imports"
        subtitle="Every import keeps its original rows and outcomes, and can be undone in one action."
        actions={
          <LinkButton href="/imports/new" variant="primary">
            <Upload className="h-3.5 w-3.5" /> New import
          </LinkButton>
        }
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Upload />}
            title="No imports yet"
            body="Bring in your warm list — the ~100 contacts you already know are the fastest route to conversations."
            action={<LinkButton href="/imports/new" variant="primary">Import warm list</LinkButton>}
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {rows.map((imp) => (
              <li key={imp.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13.5px] font-medium text-text">
                    {imp.filename}
                    {imp.status === "undone" ? <Badge tone="red">Undone</Badge> : <Badge tone="green">Applied</Badge>}
                  </p>
                  <p className="mt-0.5 text-[12px] text-dim">
                    {fmtDateTime(imp.createdAt)} · {imp.rowCount} rows → {imp.createdCount} created, {imp.updatedCount} updated,{" "}
                    {imp.duplicateCount} duplicates, {imp.skippedCount} suppressed, {imp.errorCount} errors
                  </p>
                </div>
                <Link href={`/leads?source=import`} className="text-[12.5px] font-medium text-accent-bright hover:underline">
                  View leads
                </Link>
                {imp.status !== "undone" ? <UndoImportButton importId={imp.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
