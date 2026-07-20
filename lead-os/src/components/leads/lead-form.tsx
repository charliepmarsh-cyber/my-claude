"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import type { LeadFormState } from "@/server/actions/leads";
import {
  CHANNELS,
  CHANNEL_LABELS,
  ICP_CATEGORIES,
  ICP_CATEGORY_LABELS,
  SENIORITIES,
  SENIORITY_LABELS,
} from "@/lib/constants";
import type { Company, Lead } from "@/db/schema";

type Props = {
  action: (prev: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  lead?: Lead;
  company?: Company | null;
  submitLabel: string;
};

export function LeadForm({ action, lead, company, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const err = (k: string) => state?.fieldErrors?.[k];

  const errLine = (k: string) =>
    err(k) ? <span className="mt-1 block text-[11.5px] text-danger">{err(k)}</span> : null;

  const ratingOptions = (
    <>
      <option value="">Not rated</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n} / 5
        </option>
      ))}
    </>
  );

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-(--radius-control) border border-danger/30 bg-danger-soft px-3.5 py-3 text-[13px] text-danger">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          <div>
            <p>{state.error}</p>
            {state.duplicates?.length ? (
              <ul className="mt-2 space-y-1">
                {state.duplicates.map((d) => (
                  <li key={d.leadId} className="text-[12.5px]">
                    Matches{" "}
                    <Link href={`/leads/${d.leadId}`} className="font-medium underline" target="_blank">
                      {d.fullName}
                    </Link>{" "}
                    on {d.matchedOn}.
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
      {state?.duplicates?.length ? <input type="hidden" name="allowDuplicate" value="1" /> : null}

      <Card>
        <CardHeader title="Identity" subtitle="Who they are and how to reach them." />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full name" required>
            <Input name="fullName" defaultValue={lead?.fullName ?? ""} required maxLength={200} />
            {errLine("fullName")}
          </Field>
          <Field label="Preferred name">
            <Input name="preferredName" defaultValue={lead?.preferredName ?? ""} />
          </Field>
          <Field label="Pronouns">
            <Input name="pronouns" defaultValue={lead?.pronouns ?? ""} placeholder="e.g. she/her" />
          </Field>
          <Field label="LinkedIn URL">
            <Input name="linkedinUrl" defaultValue={lead?.linkedinUrl ?? ""} placeholder="linkedin.com/in/…" />
            {errLine("linkedinUrl")}
          </Field>
          <Field label="Work email">
            <Input name="workEmail" type="email" defaultValue={lead?.workEmail ?? ""} />
            {errLine("workEmail")}
          </Field>
          <Field label="Personal email">
            <Input name="personalEmail" type="email" defaultValue={lead?.personalEmail ?? ""} />
            {errLine("personalEmail")}
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={lead?.phone ?? ""} />
          </Field>
          <Field label="Location">
            <Input name="location" defaultValue={lead?.location ?? ""} placeholder="e.g. Manchester, UK" />
          </Field>
          <Field label="Time zone">
            <Input name="timezone" defaultValue={lead?.timezone ?? ""} placeholder="e.g. Europe/London" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Role & company" subtitle="What they do and where." />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Job title">
            <Input name="jobTitle" defaultValue={lead?.jobTitle ?? ""} />
          </Field>
          <Field label="Company">
            <Input name="companyName" defaultValue={company?.name ?? ""} placeholder="Company name" />
          </Field>
          <Field label="Seniority">
            <Select name="seniority" defaultValue={lead?.seniority ?? "unknown"}>
              {SENIORITIES.map((s) => (
                <option key={s} value={s}>
                  {SENIORITY_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Decision authority" hint="Feeds the Authority score.">
            <Select name="decisionAuthority" defaultValue={lead?.decisionAuthority ?? "unknown"}>
              <option value="unknown">Unknown</option>
              <option value="decision_maker">Decision maker</option>
              <option value="influencer">Influencer</option>
              <option value="user">End user</option>
            </Select>
          </Field>
          <Field label="Department">
            <Input name="department" defaultValue={lead?.department ?? ""} />
          </Field>
          <Field label="Years in role">
            <Input name="yearsInRole" type="number" min={0} max={80} step="0.5" defaultValue={lead?.yearsInRole ?? ""} />
          </Field>
          <label className="flex items-center gap-2 pt-6 text-[13px] text-text select-none">
            <input type="checkbox" name="isFounder" defaultChecked={lead?.isFounder ?? false} className="h-4 w-4 accent-[#2563eb]" />
            Founder / owner of the business
          </label>
          <Field label="Previous relevant roles" className="sm:col-span-2">
            <Input name="previousRoles" defaultValue={lead?.previousRoles ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Relationship" subtitle="Warmth and access shape the Accessibility score and message tone." />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Warmth">
            <Select name="warmth" defaultValue={lead?.warmth ?? "cold"}>
              <option value="warm">Warm — existing relationship</option>
              <option value="cold">Cold — no prior contact</option>
            </Select>
          </Field>
          <Field label="Connection degree">
            <Select name="connectionDegree" defaultValue={lead?.connectionDegree ?? "unknown"}>
              <option value="unknown">Unknown</option>
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="3rd">3rd</option>
              <option value="none">Not connected</option>
            </Select>
          </Field>
          <Field label="Source" hint="Where this lead came from.">
            <Input name="source" defaultValue={lead?.source ?? ""} placeholder="e.g. LinkedIn connections, referral, event" />
          </Field>
          <Field label="How you know them" className="sm:col-span-2">
            <Input name="howKnown" defaultValue={lead?.howKnown ?? ""} placeholder="e.g. Commented on my posts; met at ecommerce meetup" />
          </Field>
          <Field label="Relationship strength">
            <Select name="relationshipStrength" defaultValue={lead?.relationshipStrength ?? ""}>
              {ratingOptions}
            </Select>
          </Field>
          <Field label="Referrer">
            <Input name="referrer" defaultValue={lead?.referrer ?? ""} placeholder="Who introduced you?" />
          </Field>
          <Field label="Shared connections">
            <Input name="sharedConnections" defaultValue={lead?.sharedConnections ?? ""} />
          </Field>
          <Field label="Shared groups / communities">
            <Input name="sharedGroups" defaultValue={lead?.sharedGroups ?? ""} />
          </Field>
          <Field label="Trust indicators" className="sm:col-span-2">
            <Input name="trustIndicators" defaultValue={lead?.trustIndicators ?? ""} placeholder="e.g. They engaged with my case-study post" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Intelligence & outreach" subtitle="Categorisation drives question banks and scoring." />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="ICP category" hint="AI specialists are treated as peers, not prospects.">
            <Select name="icpCategory" defaultValue={lead?.icpCategory ?? "other"}>
              {ICP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {ICP_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Preferred channel">
            <Select name="channel" defaultValue={lead?.channel ?? "linkedin"}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Current tools" hint="Comma-separated. Drives feasibility scoring.">
            <Input name="currentTools" defaultValue={(lead?.currentTools ?? []).join(", ")} placeholder="Shopify, Klaviyo, Sheets…" />
          </Field>
          <Field label="Recommended angle" className="sm:col-span-3">
            <Input name="recommendedAngle" defaultValue={lead?.recommendedAngle ?? ""} placeholder="e.g. Ask about reporting prep across their client accounts" />
          </Field>
          <Field label="Notes" className="sm:col-span-3">
            <Textarea name="notes" defaultValue={lead?.notes ?? ""} rows={4} placeholder="Anything worth remembering. Never invented — only what you actually know." />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Commercial ratings" subtitle="Your judgement, 1–5. These feed the commercial scores — leave blank if unsure." />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Case-study suitability">
            <Select name="caseStudySuitability" defaultValue={lead?.caseStudySuitability ?? ""}>
              {ratingOptions}
            </Select>
          </Field>
          <Field label="Paid-project suitability">
            <Select name="paidSuitability" defaultValue={lead?.paidSuitability ?? ""}>
              {ratingOptions}
            </Select>
          </Field>
          <Field label="Retainer suitability">
            <Select name="retainerSuitability" defaultValue={lead?.retainerSuitability ?? ""}>
              {ratingOptions}
            </Select>
          </Field>
          <Field label="Referral potential">
            <Select name="referralPotential" defaultValue={lead?.referralPotential ?? ""}>
              {ratingOptions}
            </Select>
          </Field>
          <Field label="Strategic value note" className="sm:col-span-2">
            <Input name="strategicValue" defaultValue={lead?.strategicValue ?? ""} placeholder="e.g. Runs a 2k-member ecommerce community" />
          </Field>
          <Field label="Estimated opportunity value (£)">
            <Input name="opportunityValue" type="number" min={0} step={50} defaultValue={lead?.opportunityValue ?? ""} />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link href={lead ? `/leads/${lead.id}` : "/leads"} className="text-[13px] text-muted hover:text-text">
          Cancel
        </Link>
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
