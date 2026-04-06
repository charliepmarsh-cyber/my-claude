import { Hono } from "hono";
import { LeadsQuery } from "../schemas.js";
import { getAllLeads, getLeadsByStatus, getLeadsBySegment } from "../../storage/database.js";
import type { Lead } from "../../types/index.js";

const app = new Hono();

// GET /webhook/export — flattened lead data for CRM sync
app.get("/", (c) => {
  const parsed = LeadsQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  const { status, segment, minScore } = parsed.data;

  let leads: Lead[];
  if (status) {
    leads = getLeadsByStatus(status);
  } else if (segment) {
    leads = getLeadsBySegment(segment);
  } else {
    leads = getAllLeads();
  }

  if (status && segment) {
    leads = leads.filter((l) => l.segment === segment);
  }
  if (minScore !== undefined) {
    leads = leads.filter((l) => (l.score?.finalScore ?? 0) >= minScore);
  }

  const flattened = leads.map((l) => ({
    id: l.id,
    companyName: l.company.name,
    website: l.company.website || "",
    platform: l.company.platform || "",
    industry: l.company.industry || "",
    segment: l.segment,
    status: l.status,
    contactName: l.contact.fullName || "",
    contactRole: l.contact.role || "",
    contactEmail: l.contact.email || "",
    linkedinUrl: l.contact.linkedinUrl || "",
    score: l.score?.finalScore ?? null,
    tier: l.score?.tier ?? null,
    draftCount: l.outreachDrafts.length,
    personalizationNotes: l.personalizationNotes || "",
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }));

  return c.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    count: flattened.length,
    leads: flattened,
  });
});

export default app;
