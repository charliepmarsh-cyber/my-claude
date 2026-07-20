/**
 * Warm-list import: column auto-detection and row interpretation.
 * Pure functions — unit-tested; used by both the wizard preview and the server import.
 */

import type { LeadStage, PriorityLabel } from "@/lib/constants";

export const IMPORT_TARGETS = [
  { key: "fullName", label: "Full name", required: true, hint: "The person's name" },
  { key: "businessRole", label: "Business / Role (combined)", required: false, hint: "e.g. 'Founder – GlowSkin' — split automatically" },
  { key: "jobTitle", label: "Job title", required: false, hint: "" },
  { key: "companyName", label: "Company", required: false, hint: "" },
  { key: "source", label: "Source", required: false, hint: "Where the lead came from" },
  { key: "reachVia", label: "Reach via / channel", required: false, hint: "LinkedIn / email / phone…" },
  { key: "contact", label: "Contact (email / LinkedIn / phone)", required: false, hint: "Detected per row" },
  { key: "howKnown", label: "How you know them", required: false, hint: "" },
  { key: "lastInteraction", label: "Last interaction", required: false, hint: "Date if parseable" },
  { key: "priority", label: "Priority", required: false, hint: "P1–P4 / high / medium / low" },
  { key: "status", label: "Status", required: false, hint: "Mapped to lead stages" },
  { key: "nextAction", label: "Next action", required: false, hint: "" },
  { key: "followUpDate", label: "Follow-up date", required: false, hint: "Creates a follow-up task" },
  { key: "notes", label: "Notes", required: false, hint: "" },
  { key: "linkedinUrl", label: "LinkedIn URL", required: false, hint: "" },
  { key: "email", label: "Email", required: false, hint: "" },
  { key: "phone", label: "Phone", required: false, hint: "" },
  { key: "location", label: "Location", required: false, hint: "" },
  { key: "ignore", label: "— Ignore this column —", required: false, hint: "" },
] as const;

export type ImportTargetKey = (typeof IMPORT_TARGETS)[number]["key"];

/** Header → target auto-detection (case/space tolerant). */
export function detectMapping(headers: string[]): Record<string, ImportTargetKey> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const rules: Array<[RegExp, ImportTargetKey]> = [
    [/^(fullname|name|contactname|person)$/, "fullName"],
    [/^(businessrole|rolebusiness|business|companyrole)$/, "businessRole"],
    [/^(jobtitle|title|role|position)$/, "jobTitle"],
    [/^(company|companyname|organisation|organization|business(name)?)$/, "companyName"],
    [/^(source|foundvia|origin|listsource)$/, "source"],
    [/^(reachvia|channel|contactvia|via|platform)$/, "reachVia"],
    [/^(contact|contactinfo|contactdetails|details)$/, "contact"],
    [/^(howiknowthem|howknown|relationship|connection|context)$/, "howKnown"],
    [/^(lastinteraction|lastcontact(ed)?|lasttouch)$/, "lastInteraction"],
    [/^(priority|prio|rank)$/, "priority"],
    [/^(status|stage|state)$/, "status"],
    [/^(nextaction|next|action|todo)$/, "nextAction"],
    [/^(followupdate|followup|nextfollowup|due(date)?)$/, "followUpDate"],
    [/^(notes?|comments?|remarks?)$/, "notes"],
    [/^(linkedin(url|profile)?|liurl|profileurl)$/, "linkedinUrl"],
    [/^(email(address)?|workemail|mail)$/, "email"],
    [/^(phone(number)?|mobile|tel|telephone)$/, "phone"],
    [/^(location|city|region|country|area)$/, "location"],
  ];
  const out: Record<string, ImportTargetKey> = {};
  for (const h of headers) {
    const n = norm(h);
    const hit = rules.find(([re]) => re.test(n));
    out[h] = hit ? hit[1] : "ignore";
  }
  return out;
}

/** Split a combined "Business / Role" cell into title + company. */
export function splitBusinessRole(value: string): { jobTitle: string | null; companyName: string | null } {
  const v = value.trim();
  if (!v) return { jobTitle: null, companyName: null };
  const at = v.match(/^(.{2,}?)\s+(?:at|@)\s+(.{2,})$/i);
  if (at) return { jobTitle: at[1]!.trim(), companyName: at[2]!.trim() };
  const dash = v.split(/\s*[–—|]\s*|\s+-\s+/);
  if (dash.length === 2) {
    const [a, b] = dash as [string, string];
    const titleWords = /founder|ceo|coo|cmo|cfo|owner|director|head|manager|lead|specialist|consultant|marketer|developer|designer|bookkeeper|accountant|recruiter|expert|freelancer|strategist|operator/i;
    if (titleWords.test(a) && !titleWords.test(b)) return { jobTitle: a.trim(), companyName: b.trim() };
    if (titleWords.test(b) && !titleWords.test(a)) return { jobTitle: b.trim(), companyName: a.trim() };
    return { jobTitle: a.trim(), companyName: b.trim() };
  }
  const comma = v.split(/\s*,\s*/);
  if (comma.length === 2) return { jobTitle: comma[0]!.trim(), companyName: comma[1]!.trim() };
  const titleOnly = /founder|ceo|owner|director|head of|manager|specialist|consultant|marketer|developer|bookkeeper|recruiter|expert/i;
  if (titleOnly.test(v)) return { jobTitle: v, companyName: null };
  return { jobTitle: null, companyName: v };
}

/** Detect what a free-form contact cell contains. */
export function classifyContact(value: string): { email?: string; linkedinUrl?: string; phone?: string } {
  const v = value.trim();
  if (!v) return {};
  const email = v.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
  const linkedin = v.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,;]+/i)?.[0];
  const phone = v.replace(/[^\d+]/g, "").length >= 10 && /[\d\s()+-]{10,}/.test(v) && !email && !linkedin ? v : undefined;
  return {
    ...(email ? { email } : {}),
    ...(linkedin ? { linkedinUrl: linkedin } : {}),
    ...(phone ? { phone } : {}),
  };
}

export function mapChannel(value: string): "linkedin" | "email" | "phone" | "in_person" | "other" | null {
  const v = value.toLowerCase();
  if (!v.trim()) return null;
  if (/linked\s?in|li dm|dm/.test(v)) return "linkedin";
  if (/mail/.test(v)) return "email";
  if (/phone|call|mobile|whatsapp|text|sms/.test(v)) return "phone";
  if (/person|event|meetup|face/.test(v)) return "in_person";
  return "other";
}

export function mapPriority(value: string): PriorityLabel | null {
  const v = value.toLowerCase().trim();
  if (!v) return null;
  if (/^p?1$|high|hot|top/.test(v)) return "p1_contact_now";
  if (/^p?2$|med/.test(v)) return "p2_research_first";
  if (/^p?3$|nurture/.test(v)) return "p3_nurture";
  if (/^p?4$|low/.test(v)) return "p4_low";
  if (/peer|collab/.test(v)) return "peer_collaborator";
  if (/strategic/.test(v)) return "strategic_relationship";
  if (/not suitable|unsuitable/.test(v)) return "not_suitable";
  if (/do not|dnc/.test(v)) return "do_not_contact";
  return null;
}

export function mapStatus(value: string): { stage: LeadStage; note: string | null } {
  const v = value.toLowerCase().trim();
  if (!v) return { stage: "imported", note: null };
  if (/replied|responded|in conversation|talking/.test(v)) return { stage: "replied", note: null };
  if (/follow.?up/.test(v)) return { stage: "follow_up_due", note: null };
  if (/contacted|messaged|sent|reached out/.test(v)) return { stage: "contacted", note: null };
  if (/ready|to contact|queued/.test(v)) return { stage: "ready_to_contact", note: null };
  if (/research/.test(v)) return { stage: "needs_research", note: null };
  if (/nurture|later|parked/.test(v)) return { stage: "nurture", note: null };
  if (/closed|not suitable|dead|no/.test(v)) return { stage: "closed_unsuitable", note: `Imported status: "${value}"` };
  if (/not started|new|todo|^-$/.test(v)) return { stage: "imported", note: null };
  return { stage: "imported", note: `Imported status kept in notes: "${value}"` };
}

export function parseLooseDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  // dd/mm/yyyy or dd-mm-yyyy (UK first)
  const uk = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (uk) {
    const [, d, m, y] = uk;
    const year = Number(y!.length === 2 ? `20${y}` : y);
    const date = new Date(year, Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
