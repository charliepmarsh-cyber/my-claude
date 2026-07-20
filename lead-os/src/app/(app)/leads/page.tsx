import Link from "next/link";
import { Download, Upload, UserPlus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { savedFilters } from "@/db/schema";
import { queryLeads, type LeadListParams } from "@/server/lead-queries";
import { FilterBar } from "@/components/leads/filter-bar";
import { LeadsTable } from "@/components/leads/leads-table";
import { Badge, DemoBadge, EmptyState, LinkButton, PriorityPill, ScoreChip, StagePill, cn } from "@/components/ui";
import { ICP_CATEGORY_LABELS } from "@/lib/constants";

export const metadata = { title: "Leads" };

function pageLink(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/leads?${next.toString()}`;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const spRaw = await searchParams;
  const sp: LeadListParams = Object.fromEntries(
    Object.entries(spRaw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );

  const { rows, total, page, pageCount } = queryLeads(sp);
  const db = getDb();
  const saved = db.select().from(savedFilters).all();
  const view = sp.view === "cards" ? "cards" : "table";

  const currentParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) currentParams.set(k, v);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-text">Leads</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {total} lead{total === 1 ? "" : "s"} in the database{sp.q || sp.status || sp.icp ? " matching your filters" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/export/leads"
            className="inline-flex h-8 items-center gap-1.5 rounded-(--radius-control) border border-line-strong bg-raised px-3 text-[12.5px] font-medium text-text hover:bg-overlay"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
          <LinkButton href="/imports/new" variant="secondary">
            <Upload className="h-3.5 w-3.5" /> Import
          </LinkButton>
          <LinkButton href="/leads/new" variant="primary">
            <UserPlus className="h-3.5 w-3.5" /> Add lead
          </LinkButton>
        </div>
      </div>

      <div className="mb-4">
        <FilterBar saved={saved.map((s) => ({ id: s.id, name: s.name, params: s.params }))} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-(--radius-card) border border-line bg-surface">
          <EmptyState
            icon={<Users />}
            title={total === 0 && !sp.q ? "No leads yet" : "Nothing matches these filters"}
            body={
              total === 0 && !sp.q
                ? "Import your warm list to bring in the ~100 contacts you already know, or add a lead manually."
                : "Try loosening or clearing the filters above."
            }
            action={
              total === 0 && !sp.q ? (
                <div className="flex gap-2">
                  <LinkButton href="/imports/new" variant="primary">
                    Import warm list
                  </LinkButton>
                  <LinkButton href="/leads/new">Add a lead</LinkButton>
                </div>
              ) : undefined
            }
          />
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/leads/${r.id}`}
              className={cn(
                "rounded-(--radius-card) border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raised",
                r.doNotContact && "opacity-55",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-text">
                    {r.fullName}
                    {r.dataSource === "demo" ? <DemoBadge /> : null}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {[r.jobTitle, r.companyName].filter(Boolean).join(" · ") || "Role unknown"}
                  </p>
                </div>
                <ScoreChip value={r.overallScore} />
              </div>
              <p className="mt-2 text-[11.5px] text-dim">
                {r.icpCategory ? ICP_CATEGORY_LABELS[r.icpCategory] : "Uncategorised"} ·{" "}
                <span className="capitalize">{r.warmth}</span>
                {r.location ? ` · ${r.location}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StagePill stage={r.status} />
                <PriorityPill priority={r.priorityLabel} />
                {r.doNotContact ? <Badge tone="red">DNC</Badge> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <LeadsTable rows={rows} />
      )}

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-dim">
            Page {page} of {pageCount}
          </p>
          <div className="flex gap-1.5">
            {page > 1 ? (
              <Link href={pageLink(currentParams, page - 1)} className="rounded-(--radius-control) border border-line-strong bg-raised px-3 py-1.5 text-[12.5px] text-text hover:bg-overlay">
                ← Previous
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link href={pageLink(currentParams, page + 1)} className="rounded-(--radius-control) border border-line-strong bg-raised px-3 py-1.5 text-[12.5px] text-text hover:bg-overlay">
                Next →
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
