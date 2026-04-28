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

  const flattened = leads.map((l) => {
    // Pick the first draft per type/variant for export
    const findDraft = (type: string, variant?: "A" | "B") => {
      const matches = l.outreachDrafts.filter((d) => d.messageType === type);
      if (variant) {
        return matches.find((d) => d.personalizationSnippet?.includes(`Variant ${variant}`)) || matches[0];
      }
      return matches[0];
    };

    const emailA = findDraft("email_first_touch", "A");
    const emailB = findDraft("email_first_touch", "B");
    const linkedinNote = findDraft("linkedin_connection_note");
    const linkedinDM = findDraft("linkedin_first_message");
    const xEngagement = findDraft("x_engagement_idea");
    const xDm = findDraft("x_dm");
    const followUp1 = findDraft("email_follow_up_1");
    const followUp2 = findDraft("email_follow_up_2");

    return {
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
      xUrl: l.contact.xUrl || "",
      score: l.score?.finalScore ?? null,
      tier: l.score?.tier ?? null,
      draftCount: l.outreachDrafts.length,
      personalizationNotes: l.personalizationNotes || "",
      // Outreach drafts
      emailASubject: emailA?.subject || "",
      emailABody: emailA?.body || "",
      emailBSubject: emailB?.subject || "",
      emailBBody: emailB?.body || "",
      linkedinConnectionNote: linkedinNote?.body || "",
      linkedinFirstMessage: linkedinDM?.body || "",
      xEngagementStrategy: xEngagement?.body || "",
      xDm: xDm?.body || "",
      followUp1Subject: followUp1?.subject || "",
      followUp1Body: followUp1?.body || "",
      followUp2Subject: followUp2?.subject || "",
      followUp2Body: followUp2?.body || "",
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  });

  return c.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    count: flattened.length,
    leads: flattened,
  });
});

export default app;
