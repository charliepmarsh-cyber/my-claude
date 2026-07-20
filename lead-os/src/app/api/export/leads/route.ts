import { getSessionUser } from "@/lib/auth";
import { exportLeadsCsv } from "@/server/actions/leads";
import { logActivity } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorised", { status: 401 });
  const csv = await exportLeadsCsv();
  logActivity({ entity: "lead", action: "exported_csv", detail: "Full lead export downloaded" });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cpm-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
