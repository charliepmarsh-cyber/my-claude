import { requireUser } from "@/lib/auth";
import { getAnalytics } from "@/server/analytics";
import { PageHeader } from "@/components/ui";
import { AnalyticsView } from "@/components/analytics/view";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireUser();
  const data = getAnalytics();
  return (
    <div>
      <PageHeader
        title="Analytics & learning"
        subtitle="Everything here is computed from recorded activity — no simulated numbers. Small samples are labelled honestly."
      />
      <AnalyticsView data={data} />
    </div>
  );
}
