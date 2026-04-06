import { Hono } from "hono";
import { LeadsQuery } from "../schemas.js";
import { getAllLeads, getLeadsByStatus, getLeadsBySegment } from "../../storage/database.js";
import type { Lead } from "../../types/index.js";

const app = new Hono();

// GET /webhook/leads — query leads with filters
app.get("/", (c) => {
  const parsed = LeadsQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  const { status, segment, minScore, limit, offset } = parsed.data;

  let leads: Lead[];
  if (status) {
    leads = getLeadsByStatus(status);
  } else if (segment) {
    leads = getLeadsBySegment(segment);
  } else {
    leads = getAllLeads();
  }

  // Apply additional filters
  if (status && segment) {
    leads = leads.filter((l) => l.segment === segment);
  }
  if (minScore !== undefined) {
    leads = leads.filter((l) => (l.score?.finalScore ?? 0) >= minScore);
  }

  const total = leads.length;
  const paged = leads.slice(offset, offset + limit);

  return c.json({ ok: true, total, limit, offset, leads: paged });
});

export default app;
