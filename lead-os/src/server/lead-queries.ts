import "server-only";
import { and, asc, count, desc, eq, gte, isNotNull, isNull, like, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, leads } from "@/db/schema";
import {
  ICP_CATEGORIES,
  LEAD_STAGES,
  PRIORITY_LABELS,
  WARMTH,
  type IcpCategory,
  type LeadStage,
  type PriorityLabel,
  type Warmth,
} from "@/lib/constants";

export type LeadListParams = {
  q?: string;
  status?: string;
  priority?: string;
  icp?: string;
  warmth?: string;
  touched?: string; // "never" | "contacted"
  dnc?: string; // "1" to include do-not-contact
  minScore?: string;
  source?: string; // data source: demo/import/manual
  sort?: string; // score|name|updated|created|due|completeness
  dir?: string; // asc|desc
  page?: string;
  view?: string; // table|cards
};

export type LeadRow = {
  id: string;
  fullName: string;
  jobTitle: string | null;
  companyName: string | null;
  icpCategory: IcpCategory | null;
  warmth: Warmth;
  status: LeadStage;
  priorityLabel: PriorityLabel | null;
  overallScore: number | null;
  completeness: number;
  nextAction: string | null;
  nextActionDue: Date | null;
  lastContactedAt: Date | null;
  location: string | null;
  linkedinUrl: string | null;
  workEmail: string | null;
  dataSource: string;
  doNotContact: boolean;
  updatedAt: Date;
};

const PAGE_SIZE = 25;

export function queryLeads(params: LeadListParams): {
  rows: LeadRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
} {
  const db = getDb();
  const conds: SQL[] = [isNull(leads.deletedAt) as SQL];

  const q = params.q?.trim();
  if (q) {
    const pattern = `%${q.replaceAll("%", "").replaceAll("_", "")}%`;
    conds.push(
      or(
        like(leads.fullName, pattern),
        like(leads.jobTitle, pattern),
        like(companies.name, pattern),
        like(leads.notes, pattern),
        like(leads.location, pattern),
        like(leads.workEmail, pattern),
      ) as SQL,
    );
  }
  if (params.status && (LEAD_STAGES as readonly string[]).includes(params.status))
    conds.push(eq(leads.status, params.status as LeadStage) as SQL);
  if (params.priority && (PRIORITY_LABELS as readonly string[]).includes(params.priority))
    conds.push(eq(leads.priorityLabel, params.priority as PriorityLabel) as SQL);
  if (params.icp && (ICP_CATEGORIES as readonly string[]).includes(params.icp))
    conds.push(eq(leads.icpCategory, params.icp as IcpCategory) as SQL);
  if (params.warmth && (WARMTH as readonly string[]).includes(params.warmth))
    conds.push(eq(leads.warmth, params.warmth as Warmth) as SQL);
  if (params.touched === "never") conds.push(isNull(leads.lastContactedAt) as SQL);
  if (params.touched === "contacted") conds.push(isNotNull(leads.lastContactedAt) as SQL);
  if (params.dnc !== "1") conds.push(eq(leads.doNotContact, false) as SQL);
  if (params.minScore && !Number.isNaN(Number(params.minScore)))
    conds.push(gte(leads.overallScore, Number(params.minScore)) as SQL);
  if (params.source && ["demo", "import", "manual", "enrichment"].includes(params.source))
    conds.push(eq(leads.dataSource, params.source as "demo") as SQL);

  const where = and(...conds);

  const dirFn = params.dir === "asc" ? asc : desc;
  const sortCol =
    params.sort === "name"
      ? leads.fullName
      : params.sort === "created"
        ? leads.createdAt
        : params.sort === "due"
          ? leads.nextActionDue
          : params.sort === "completeness"
            ? leads.completeness
            : params.sort === "updated"
              ? leads.updatedAt
              : leads.overallScore;
  const orderBy =
    params.sort === "name" && params.dir !== "desc" ? asc(leads.fullName) : dirFn(sortCol);

  const total = Number(
    db.select({ n: count() }).from(leads).leftJoin(companies, eq(leads.companyId, companies.id)).where(where).get()?.n ?? 0,
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(params.page) || 1));

  const rows = db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      jobTitle: leads.jobTitle,
      companyName: companies.name,
      icpCategory: leads.icpCategory,
      warmth: leads.warmth,
      status: leads.status,
      priorityLabel: leads.priorityLabel,
      overallScore: leads.overallScore,
      completeness: leads.completeness,
      nextAction: leads.nextAction,
      nextActionDue: leads.nextActionDue,
      lastContactedAt: leads.lastContactedAt,
      location: leads.location,
      linkedinUrl: leads.linkedinUrl,
      workEmail: leads.workEmail,
      dataSource: leads.dataSource,
      doNotContact: leads.doNotContact,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(companies, eq(leads.companyId, companies.id))
    .where(where)
    .orderBy(orderBy, desc(leads.updatedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();

  return { rows: rows as LeadRow[], total, page, pageCount, pageSize: PAGE_SIZE };
}
