import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { suppressionRecords, aiRuns } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { aiMode, aiModel } from "@/lib/ai";
import { apolloConfigured } from "@/lib/enrichment/apollo";
import { PageHeader } from "@/components/ui";
import { SettingsView } from "@/components/settings/view";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();
  const db = getDb();
  const settings = getSettings();
  const suppressions = db.select().from(suppressionRecords).orderBy(desc(suppressionRecords.createdAt)).all();
  const recentAiRuns = db.select().from(aiRuns).orderBy(desc(aiRuns.createdAt)).limit(10).all();
  const totalAiCost = db
    .select()
    .from(aiRuns)
    .all()
    .reduce((acc, r) => acc + (r.costEstimateUsd ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Settings"
        subtitle="Targets, follow-up cadence, scoring weights, suppression and data controls. Nothing here is hard-coded."
      />
      <SettingsView
        settings={settings}
        suppressions={suppressions}
        ai={{ mode: aiMode(), model: aiModel(), totalCostUsd: totalAiCost, recentRuns: recentAiRuns }}
        apollo={{ configured: apolloConfigured() }}
      />
    </div>
  );
}
