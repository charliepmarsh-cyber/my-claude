import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { caseStudies } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CaseStudyBoard } from "@/components/case-studies/board";

export const metadata = { title: "Case studies" };

export default async function CaseStudiesPage() {
  await requireUser();
  const db = getDb();
  const rows = db.select().from(caseStudies).orderBy(desc(caseStudies.updatedAt)).all();

  return (
    <div>
      <PageHeader
        title="Case studies"
        subtitle="Track each case-study build from offer to published proof. Documents generate from recorded fields only — no outcome is ever claimed without evidence."
      />
      <CaseStudyBoard items={rows} />
    </div>
  );
}
