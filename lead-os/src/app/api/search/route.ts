import { NextResponse } from "next/server";
import { and, isNull, like, or } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, companies } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ leads: [] });

  const db = getDb();
  const pattern = `%${q.replaceAll("%", "").replaceAll("_", "")}%`;

  const rows = db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      jobTitle: leads.jobTitle,
      status: leads.status,
      companyName: companies.name,
    })
    .from(leads)
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(
      and(
        isNull(leads.deletedAt),
        or(
          like(leads.fullName, pattern),
          like(leads.jobTitle, pattern),
          like(companies.name, pattern),
          like(leads.workEmail, pattern),
        ),
      ),
    )
    .limit(8)
    .all();

  return NextResponse.json({ leads: rows });
}
